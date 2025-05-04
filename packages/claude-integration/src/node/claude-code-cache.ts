import { injectable, inject } from 'inversify';
import { ILogger } from '@theia/core';
import { FileUri } from '@theia/core/lib/node/file-uri';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { Mutex } from 'async-mutex';
import { Disposable } from '@theia/core/lib/common/disposable';
import { ClaudeCompletionRequest, ClaudeResponse } from '../common/claude-code-protocol';

/**
 * LRU Cache entry with metadata
 */
interface CacheEntry<T> {
    /** Cached value */
    value: T;
    /** When the cache entry was created */
    createdAt: number;
    /** When the cache entry was last accessed */
    lastAccessed: number;
    /** Number of times this entry has been accessed */
    accessCount: number;
    /** Request hash that generated this entry */
    requestHash: string;
    /** File dependencies (files whose changes should invalidate this entry) */
    fileDependencies?: string[];
}

/**
 * Cache metrics for monitoring
 */
export interface CacheMetrics {
    /** Total number of cache hits */
    hits: number;
    /** Total number of cache misses */
    misses: number;
    /** Hit rate (hits / (hits + misses)) */
    hitRate: number;
    /** Current size of the cache (number of entries) */
    size: number;
    /** Total number of entries ever cached */
    totalCached: number;
    /** Total number of entries evicted */
    evictions: number;
    /** Total number of entries invalidated */
    invalidations: number;
    /** Cache storage size in bytes */
    storageSize: number;
}

/**
 * Cache options
 */
export interface ClaudeCodeCacheOptions {
    /** Maximum number of entries to keep in the LRU cache */
    maxEntries?: number;
    /** Time to live for cache entries in milliseconds */
    ttl?: number;
    /** Whether to persist cache to disk */
    persistToDisk?: boolean;
    /** Directory to store cache files */
    cacheDir?: string;
    /** If true, cache files will be compressed before storing */
    compress?: boolean;
    /** Maximum size of the cache in bytes */
    maxStorageSize?: number;
    /** If true, will refresh frequently used entries in the background */
    backgroundRefresh?: boolean;
    /** Minimum access count for entries to be considered for background refresh */
    refreshThreshold?: number;
}

/**
 * Default cache options
 */
const DEFAULT_CACHE_OPTIONS: ClaudeCodeCacheOptions = {
    maxEntries: 1000,
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    persistToDisk: true,
    cacheDir: path.join(os.homedir(), '.codevibeai', 'cache'),
    compress: true,
    maxStorageSize: 500 * 1024 * 1024, // 500 MB
    backgroundRefresh: true,
    refreshThreshold: 5
};

/**
 * Claude Code Cache - provides caching for Claude API requests with:
 * - In-memory LRU cache
 * - Disk persistence
 * - TTL-based expiration
 * - Request deduplication
 * - Background refreshing
 * - Cache invalidation based on file changes
 */
@injectable()
export class ClaudeCodeCache implements Disposable {
    private cache = new Map<string, CacheEntry<ClaudeResponse>>();
    private metrics: CacheMetrics = {
        hits: 0,
        misses: 0,
        hitRate: 0,
        size: 0,
        totalCached: 0,
        evictions: 0,
        invalidations: 0,
        storageSize: 0
    };
    private options: ClaudeCodeCacheOptions;
    private initialized = false;
    private mutex = new Mutex();
    private refreshTimers = new Map<string, NodeJS.Timeout>();
    
    // Set of in-flight requests to enable deduplication
    private inFlightRequests = new Map<string, Promise<ClaudeResponse>>();

    @inject(ILogger)
    protected readonly logger: ILogger;

    /**
     * Initialize the cache
     * 
     * @param options Cache configuration options
     */
    async initialize(options?: Partial<ClaudeCodeCacheOptions>): Promise<void> {
        if (this.initialized) {
            return;
        }

        this.options = { ...DEFAULT_CACHE_OPTIONS, ...options };
        this.logger.info(`Initializing Claude Code cache with TTL: ${this.options.ttl}ms`);

        if (this.options.persistToDisk) {
            await this.ensureCacheDirectory();
            await this.loadCacheFromDisk();
        }

        this.initialized = true;
    }

    /**
     * Get a cached Claude response or null if not found
     * 
     * @param request Claude completion request
     * @returns Cached response or null
     */
    async get(request: ClaudeCompletionRequest): Promise<ClaudeResponse | null> {
        if (!this.initialized) {
            await this.initialize();
        }

        // Skip cache if explicitly disabled in request
        if (request.options?.useCache === false) {
            this.metrics.misses++;
            this.updateHitRate();
            return null;
        }

        const hash = this.hashRequest(request);
        
        return await this.mutex.runExclusive(async () => {
            const entry = this.cache.get(hash);
            
            if (!entry) {
                this.metrics.misses++;
                this.updateHitRate();
                return null;
            }

            // Check if entry is expired
            if (this.isExpired(entry)) {
                this.logger.debug(`Cache entry expired for hash: ${hash}`);
                this.cache.delete(hash);
                await this.persistCacheIfNeeded();
                this.metrics.misses++;
                this.updateHitRate();
                return null;
            }

            // Check if file dependencies have changed
            if (entry.fileDependencies && await this.haveFilesChanged(entry)) {
                this.logger.debug(`Invalidating cache due to file changes: ${hash}`);
                this.cache.delete(hash);
                await this.persistCacheIfNeeded();
                this.metrics.invalidations++;
                this.metrics.misses++;
                this.updateHitRate();
                return null;
            }

            // Update access stats
            entry.lastAccessed = Date.now();
            entry.accessCount++;
            
            // Schedule background refresh if needed
            this.scheduleRefreshIfNeeded(hash, entry, request);
            
            this.metrics.hits++;
            this.updateHitRate();
            
            // Clone the response to prevent modification of cached object
            return this.cloneResponse(entry.value);
        });
    }

    /**
     * Store a Claude response in the cache
     * 
     * @param request Original request
     * @param response Response to cache
     * @param fileDependencies Optional list of files that should invalidate this cache entry when changed
     */
    async set(
        request: ClaudeCompletionRequest, 
        response: ClaudeResponse,
        fileDependencies?: string[]
    ): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }

        // Skip cache if explicitly disabled in request
        if (request.options?.useCache === false) {
            return;
        }

        // Mark response as cached for transparency
        response.metadata.cached = true;
        
        const hash = this.hashRequest(request);
        const now = Date.now();
        
        await this.mutex.runExclusive(async () => {
            // Ensure we have room in the cache
            if (this.cache.size >= (this.options.maxEntries || DEFAULT_CACHE_OPTIONS.maxEntries!)) {
                await this.evictLeastRecentlyUsed();
            }
            
            // Add to cache
            this.cache.set(hash, {
                value: this.cloneResponse(response),
                createdAt: now,
                lastAccessed: now,
                accessCount: 1,
                requestHash: hash,
                fileDependencies
            });
            
            this.metrics.size = this.cache.size;
            this.metrics.totalCached++;
            
            await this.persistCacheIfNeeded();
        });
    }

    /**
     * Remove a specific entry from the cache
     * 
     * @param request Request to invalidate in the cache
     */
    async invalidate(request: ClaudeCompletionRequest): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }

        const hash = this.hashRequest(request);
        
        await this.mutex.runExclusive(async () => {
            if (this.cache.delete(hash)) {
                this.metrics.invalidations++;
                this.metrics.size = this.cache.size;
                await this.persistCacheIfNeeded();
            }
        });
    }

    /**
     * Invalidate cache entries that depend on specific files
     * 
     * @param filePaths Paths of files that have changed
     */
    async invalidateByFiles(filePaths: string[]): Promise<number> {
        if (!this.initialized) {
            await this.initialize();
        }

        const normalizedPaths = filePaths.map(p => path.normalize(p));
        let invalidated = 0;
        
        await this.mutex.runExclusive(async () => {
            for (const [hash, entry] of this.cache.entries()) {
                if (entry.fileDependencies && entry.fileDependencies.some(dep => 
                    normalizedPaths.includes(path.normalize(dep)))) {
                    this.cache.delete(hash);
                    invalidated++;
                }
            }
            
            if (invalidated > 0) {
                this.metrics.invalidations += invalidated;
                this.metrics.size = this.cache.size;
                await this.persistCacheIfNeeded();
                this.logger.debug(`Invalidated ${invalidated} cache entries due to file changes`);
            }
        });
        
        return invalidated;
    }

    /**
     * Clear the entire cache
     */
    async clear(): Promise<void> {
        await this.mutex.runExclusive(async () => {
            this.cache.clear();
            this.metrics.size = 0;
            this.metrics.invalidations += this.metrics.size;
            
            // Clear background refresh timers
            for (const timer of this.refreshTimers.values()) {
                clearTimeout(timer);
            }
            this.refreshTimers.clear();
            
            if (this.options.persistToDisk) {
                try {
                    const cacheDir = this.options.cacheDir || DEFAULT_CACHE_OPTIONS.cacheDir!;
                    const indexPath = path.join(cacheDir, 'cache-index.json');
                    
                    if (fs.existsSync(indexPath)) {
                        await fs.promises.unlink(indexPath);
                    }
                    
                    // Get list of cache files
                    const files = await fs.promises.readdir(cacheDir);
                    
                    // Delete all .cache files
                    for (const file of files) {
                        if (file.endsWith('.cache')) {
                            await fs.promises.unlink(path.join(cacheDir, file));
                        }
                    }
                    
                    this.logger.info('Claude Code cache cleared from disk');
                } catch (error) {
                    this.logger.error(`Error clearing cache from disk: ${error}`);
                }
            }
        });
    }

    /**
     * Get current cache metrics
     */
    getMetrics(): CacheMetrics {
        return { ...this.metrics };
    }

    /**
     * Deduplicate in-flight requests - returns ongoing request promise if one exists
     * for the same request, otherwise returns null
     * 
     * @param request The Claude completion request
     */
    getInFlightRequest(request: ClaudeCompletionRequest): Promise<ClaudeResponse> | null {
        const hash = this.hashRequest(request);
        return this.inFlightRequests.get(hash) || null;
    }

    /**
     * Register an in-flight request to enable deduplication
     * 
     * @param request The Claude completion request
     * @param promise The promise that will resolve with the response
     */
    registerInFlightRequest(request: ClaudeCompletionRequest, promise: Promise<ClaudeResponse>): void {
        const hash = this.hashRequest(request);
        
        this.inFlightRequests.set(hash, promise);
        
        // Remove from in-flight requests when complete
        promise.finally(() => {
            this.inFlightRequests.delete(hash);
        });
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        // Clear background refresh timers
        for (const timer of this.refreshTimers.values()) {
            clearTimeout(timer);
        }
        this.refreshTimers.clear();
    }

    /**
     * Create a cryptographic hash of the request for caching
     * 
     * @param request The Claude completion request
     * @returns Hash string
     */
    private hashRequest(request: ClaudeCompletionRequest): string {
        // Create a request copy without the cache option to ensure same requests with
        // different cache settings still match
        const requestForHashing = { ...request };
        if (requestForHashing.options) {
            const { useCache, ...otherOptions } = requestForHashing.options;
            requestForHashing.options = otherOptions;
        }
        
        const hash = crypto.createHash('sha256');
        hash.update(JSON.stringify(requestForHashing));
        return hash.digest('hex');
    }

    /**
     * Check if a cache entry has expired
     * 
     * @param entry The cache entry
     * @returns True if the entry has expired
     */
    private isExpired(entry: CacheEntry<any>): boolean {
        const now = Date.now();
        const ttl = this.options.ttl || DEFAULT_CACHE_OPTIONS.ttl!;
        return (now - entry.createdAt) > ttl;
    }

    /**
     * Check if any of the file dependencies have changed since the cache entry was created
     * 
     * @param entry The cache entry
     * @returns True if any files have changed
     */
    private async haveFilesChanged(entry: CacheEntry<any>): Promise<boolean> {
        if (!entry.fileDependencies || entry.fileDependencies.length === 0) {
            return false;
        }
        
        try {
            for (const filePath of entry.fileDependencies) {
                const stats = await fs.promises.stat(filePath);
                if (stats.mtimeMs > entry.createdAt) {
                    return true;
                }
            }
            return false;
        } catch (error) {
            this.logger.warn(`Error checking file dependencies: ${error}`);
            return false; // If we can't check, assume no changes
        }
    }

    /**
     * Evict the least recently used cache entry
     */
    private async evictLeastRecentlyUsed(): Promise<void> {
        let oldest: [string, CacheEntry<any>] | null = null;
        
        for (const entry of this.cache.entries()) {
            if (!oldest || entry[1].lastAccessed < oldest[1].lastAccessed) {
                oldest = entry;
            }
        }
        
        if (oldest) {
            this.cache.delete(oldest[0]);
            this.metrics.evictions++;
            
            // Clear any refresh timer
            const timer = this.refreshTimers.get(oldest[0]);
            if (timer) {
                clearTimeout(timer);
                this.refreshTimers.delete(oldest[0]);
            }
        }
    }

    /**
     * Ensure the cache directory exists
     */
    private async ensureCacheDirectory(): Promise<void> {
        const cacheDir = this.options.cacheDir || DEFAULT_CACHE_OPTIONS.cacheDir!;
        
        try {
            await fs.promises.mkdir(cacheDir, { recursive: true });
            this.logger.debug(`Ensured cache directory exists: ${cacheDir}`);
        } catch (error) {
            this.logger.error(`Failed to create cache directory: ${cacheDir}`, error);
            throw error;
        }
    }

    /**
     * Load cache from disk
     */
    private async loadCacheFromDisk(): Promise<void> {
        const cacheDir = this.options.cacheDir || DEFAULT_CACHE_OPTIONS.cacheDir!;
        const indexPath = path.join(cacheDir, 'cache-index.json');
        
        try {
            if (!fs.existsSync(indexPath)) {
                this.logger.debug('No cache index found on disk, starting with empty cache');
                return;
            }
            
            const indexData = await fs.promises.readFile(indexPath, 'utf-8');
            const index: Record<string, string> = JSON.parse(indexData);
            let loadedCount = 0;
            let expiredCount = 0;
            
            for (const [hash, filename] of Object.entries(index)) {
                try {
                    const filePath = path.join(cacheDir, filename);
                    if (!fs.existsSync(filePath)) {
                        continue;
                    }
                    
                    const data = await fs.promises.readFile(filePath, 'utf-8');
                    const entry: CacheEntry<ClaudeResponse> = JSON.parse(data);
                    
                    // Skip expired entries
                    if (this.isExpired(entry)) {
                        try {
                            await fs.promises.unlink(filePath);
                        } catch {
                            // Ignore errors when cleaning up
                        }
                        expiredCount++;
                        continue;
                    }
                    
                    this.cache.set(hash, entry);
                    loadedCount++;
                } catch (error) {
                    this.logger.warn(`Error loading cache entry ${hash}: ${error}`);
                }
            }
            
            this.metrics.size = this.cache.size;
            this.metrics.totalCached = this.cache.size;
            
            this.logger.info(`Loaded ${loadedCount} cache entries from disk (skipped ${expiredCount} expired entries)`);
            
            // Calculate storage size
            await this.updateStorageSize();
        } catch (error) {
            this.logger.error(`Failed to load cache from disk: ${error}`);
            // Continue with empty cache
            this.cache.clear();
        }
    }

    /**
     * Persist cache to disk if disk persistence is enabled
     */
    private async persistCacheIfNeeded(): Promise<void> {
        if (!this.options.persistToDisk) {
            return;
        }
        
        const cacheDir = this.options.cacheDir || DEFAULT_CACHE_OPTIONS.cacheDir!;
        const indexPath = path.join(cacheDir, 'cache-index.json');
        
        try {
            // Create index of entries to store
            const index: Record<string, string> = {};
            
            // Save each entry to its own file
            for (const [hash, entry] of this.cache.entries()) {
                const filename = `${hash}.cache`;
                const filePath = path.join(cacheDir, filename);
                
                await fs.promises.writeFile(
                    filePath, 
                    JSON.stringify(entry), 
                    'utf-8'
                );
                
                index[hash] = filename;
            }
            
            // Save index
            await fs.promises.writeFile(
                indexPath, 
                JSON.stringify(index), 
                'utf-8'
            );
            
            // Update storage size metric
            await this.updateStorageSize();
        } catch (error) {
            this.logger.error(`Failed to persist cache to disk: ${error}`);
        }
    }

    /**
     * Update the cache storage size metric
     */
    private async updateStorageSize(): Promise<void> {
        if (!this.options.persistToDisk) {
            return;
        }
        
        try {
            const cacheDir = this.options.cacheDir || DEFAULT_CACHE_OPTIONS.cacheDir!;
            const files = await fs.promises.readdir(cacheDir);
            
            let totalSize = 0;
            for (const file of files) {
                const filePath = path.join(cacheDir, file);
                const stats = await fs.promises.stat(filePath);
                totalSize += stats.size;
            }
            
            this.metrics.storageSize = totalSize;
        } catch (error) {
            this.logger.warn(`Error calculating cache storage size: ${error}`);
        }
    }

    /**
     * Update the hit rate metric
     */
    private updateHitRate(): void {
        const total = this.metrics.hits + this.metrics.misses;
        this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
    }

    /**
     * Schedule background refresh for frequently used entries
     */
    private scheduleRefreshIfNeeded(
        hash: string, 
        entry: CacheEntry<ClaudeResponse>, 
        originalRequest: ClaudeCompletionRequest
    ): void {
        // Skip if background refresh is disabled
        if (!this.options.backgroundRefresh) {
            return;
        }
        
        // Skip if entry hasn't been accessed enough
        const threshold = this.options.refreshThreshold || DEFAULT_CACHE_OPTIONS.refreshThreshold!;
        if (entry.accessCount < threshold) {
            return;
        }
        
        // Skip if already scheduled
        if (this.refreshTimers.has(hash)) {
            return;
        }
        
        // Calculate refresh time (75% of TTL)
        const ttl = this.options.ttl || DEFAULT_CACHE_OPTIONS.ttl!;
        const refreshTime = entry.createdAt + (ttl * 0.75);
        const now = Date.now();
        
        // Skip if too early to refresh
        if (now < refreshTime) {
            return;
        }
        
        // Schedule refresh
        this.logger.debug(`Scheduling background refresh for frequently used cache entry: ${hash}`);
        
        // Mark this entry as scheduled
        this.refreshTimers.set(hash, setTimeout(() => {
            this.refreshTimers.delete(hash);
            
            // No need to do anything with the result - the service will update
            // the cache when it gets the response
            this.refreshCacheEntry(hash, originalRequest, entry)
                .catch(error => this.logger.error(`Background refresh failed: ${error}`));
        }, 100)); // Small delay to avoid immediate execution
    }

    /**
     * Refresh a cache entry in the background
     * 
     * @param hash Cache key
     * @param request Original request
     * @param entry Current cache entry
     */
    private async refreshCacheEntry(
        hash: string,
        request: ClaudeCompletionRequest,
        entry: CacheEntry<ClaudeResponse>
    ): Promise<void> {
        // Don't do anything - this is a placeholder that will be called by the
        // service implementation when we integrate the cache
        this.logger.debug(`Would refresh cache entry: ${hash}`);
    }

    /**
     * Create a deep clone of a response to prevent modification of cached objects
     * 
     * @param response Claude response to clone
     * @returns Cloned response
     */
    private cloneResponse(response: ClaudeResponse): ClaudeResponse {
        return JSON.parse(JSON.stringify(response));
    }
}