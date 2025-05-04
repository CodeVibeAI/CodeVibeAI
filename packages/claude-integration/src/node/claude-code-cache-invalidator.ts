import { injectable, inject } from 'inversify';
import { ILogger } from '@theia/core';
import { Disposable, DisposableCollection } from '@theia/core/lib/common/disposable';
import { FileSystemWatcher } from '@theia/filesystem/lib/browser/filesystem-watcher';
import { FileChange, FileChangeType } from '@theia/filesystem/lib/common/filesystem-watcher-protocol';
import { PreferenceService } from '@theia/core/lib/browser/preferences';
import { FileUri } from '@theia/core/lib/node/file-uri';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { Mutex } from 'async-mutex';

import { ClaudeCodeCache } from './claude-code-cache';

/**
 * Configuration for cache invalidation
 */
export interface CacheInvalidationConfig {
    /** Whether to enable automatic cache invalidation */
    enabled: boolean;
    /** How often to check for cache expiration (in milliseconds) */
    expirationCheckInterval: number;
    /** Enable workspace file change monitoring */
    fileChangeMonitoring: boolean;
    /** Additional file patterns to watch for changes */
    watchFilePatterns: string[];
    /** Enable configuration change monitoring */
    configChangeMonitoring: boolean;
    /** Time-to-live for cache entries (in milliseconds) */
    entryTtl: number;
    /** Whether to invalidate cache on application update */
    invalidateOnUpdate: boolean;
    /** Max storage size for the cache (in bytes) */
    maxStorageSize: number;
}

/**
 * Default invalidation configuration
 */
const DEFAULT_INVALIDATION_CONFIG: CacheInvalidationConfig = {
    enabled: true,
    expirationCheckInterval: 30 * 60 * 1000, // 30 minutes
    fileChangeMonitoring: true,
    watchFilePatterns: ['**/*.{js,jsx,ts,tsx,py,java,c,cpp,h,hpp,go,rs}'],
    configChangeMonitoring: true,
    entryTtl: 24 * 60 * 60 * 1000, // 24 hours
    invalidateOnUpdate: true,
    maxStorageSize: 500 * 1024 * 1024 // 500 MB
};

/**
 * Handles intelligent cache invalidation for Claude Code
 * 
 * This service provides multiple invalidation strategies:
 * 1. Time-based expiration
 * 2. File-change based invalidation
 * 3. Configuration change invalidation
 * 4. Application update invalidation
 * 5. Storage size management
 */
@injectable()
export class ClaudeCodeCacheInvalidator implements Disposable {
    private config: CacheInvalidationConfig = DEFAULT_INVALIDATION_CONFIG;
    private disposables = new DisposableCollection();
    private expirationTimer: NodeJS.Timeout | undefined;
    private watchedFiles = new Set<string>();
    private watchedFolders = new Set<string>();
    private appVersionHash: string | undefined;
    private mutex = new Mutex();
    
    @inject(ILogger)
    protected readonly logger: ILogger;
    
    @inject(ClaudeCodeCache)
    protected readonly cache: ClaudeCodeCache;
    
    @inject(FileSystemWatcher)
    protected readonly fileSystemWatcher: FileSystemWatcher;
    
    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;
    
    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;
    
    /**
     * Initialize the cache invalidator
     * 
     * @param config Cache invalidation configuration
     */
    async initialize(config?: Partial<CacheInvalidationConfig>): Promise<void> {
        this.config = { ...DEFAULT_INVALIDATION_CONFIG, ...config };
        this.logger.info(`Initializing Claude Code cache invalidator with TTL: ${this.config.entryTtl}ms`);
        
        if (!this.config.enabled) {
            this.logger.info('Cache invalidation is disabled');
            return;
        }
        
        // Calculate application version hash
        await this.calculateAppVersionHash();
        
        // Set up various invalidation strategies
        if (this.config.fileChangeMonitoring) {
            this.setupFileChangeMonitoring();
        }
        
        if (this.config.configChangeMonitoring) {
            this.setupConfigChangeMonitoring();
        }
        
        // Start expiration check timer
        this.setupExpirationChecks();
        
        // Perform initial invalidation based on app version
        if (this.config.invalidateOnUpdate) {
            await this.checkForAppUpdate();
        }
        
        // Perform initial storage size check
        await this.manageStorageSize();
    }
    
    /**
     * Dispose of resources
     */
    dispose(): void {
        this.disposables.dispose();
        
        if (this.expirationTimer) {
            clearInterval(this.expirationTimer);
            this.expirationTimer = undefined;
        }
    }
    
    /**
     * Set up file change monitoring
     */
    private setupFileChangeMonitoring(): void {
        // Listen to workspace root changes
        const workspaceListener = this.workspaceService.onWorkspaceChanged(async roots => {
            await this.mutex.runExclusive(async () => {
                this.watchedFolders.clear();
                
                // Add new workspace roots to watched folders
                for (const root of roots) {
                    const rootPath = FileUri.fsPath(root.resource);
                    this.watchedFolders.add(rootPath);
                }
            });
        });
        
        this.disposables.push(workspaceListener);
        
        // Add current workspace roots
        const roots = this.workspaceService.tryGetRoots();
        for (const root of roots) {
            const rootPath = FileUri.fsPath(root.resource);
            this.watchedFolders.add(rootPath);
        }
        
        // Monitor file changes
        const fileChangeListener = this.fileSystemWatcher.onFilesChanged(async changes => {
            await this.handleFileChanges(changes);
        });
        
        this.disposables.push(fileChangeListener);
    }
    
    /**
     * Set up configuration change monitoring
     */
    private setupConfigChangeMonitoring(): void {
        const configWatcher = this.preferenceService.onPreferenceChanged(async change => {
            // Invalidate cache for Claude-related preferences
            if (change.preferenceName.startsWith('claude.') || 
                change.preferenceName.startsWith('ai.') ||
                change.preferenceName.startsWith('codevibeai.')) {
                
                this.logger.debug(`Preference changed: ${change.preferenceName}, invalidating cache`);
                await this.cache.clear();
            }
        });
        
        this.disposables.push(configWatcher);
    }
    
    /**
     * Set up regular expiration checks
     */
    private setupExpirationChecks(): void {
        this.expirationTimer = setInterval(async () => {
            try {
                await this.mutex.runExclusive(async () => {
                    this.logger.debug('Running scheduled cache maintenance');
                    
                    // Check for app updates
                    if (this.config.invalidateOnUpdate) {
                        await this.checkForAppUpdate();
                    }
                    
                    // Clear expired entries (handled internally by the cache)
                    
                    // Check storage size
                    await this.manageStorageSize();
                    
                    // Log cache metrics
                    const metrics = this.cache.getMetrics();
                    this.logger.debug(`Cache metrics - size: ${metrics.size}, hit rate: ${(metrics.hitRate * 100).toFixed(1)}%, hits: ${metrics.hits}, misses: ${metrics.misses}, storage: ${(metrics.storageSize / 1024 / 1024).toFixed(2)} MB`);
                });
            } catch (error) {
                this.logger.error('Error during cache maintenance:', error);
            }
        }, this.config.expirationCheckInterval);
    }
    
    /**
     * Handle file changes for cache invalidation
     * 
     * @param changes File changes from the watcher
     */
    private async handleFileChanges(changes: readonly FileChange[]): Promise<void> {
        const relevantChanges = changes.filter(change => 
            (change.type === FileChangeType.UPDATED || change.type === FileChangeType.DELETED) &&
            this.isRelevantFile(change.uri)
        );
        
        if (relevantChanges.length === 0) {
            return;
        }
        
        await this.mutex.runExclusive(async () => {
            const paths = relevantChanges.map(change => FileUri.fsPath(change.uri));
            
            // Add to watched files set
            for (const filePath of paths) {
                this.watchedFiles.add(filePath);
            }
            
            // Invalidate cache entries for changed files
            const invalidatedCount = await this.cache.invalidateByFiles(paths);
            
            if (invalidatedCount > 0) {
                this.logger.debug(`Invalidated ${invalidatedCount} cache entries due to file changes`);
            }
        });
    }
    
    /**
     * Check if a file should trigger cache invalidation
     * 
     * @param uri File URI
     */
    private isRelevantFile(uri: string): boolean {
        try {
            const filePath = FileUri.fsPath(uri);
            
            // If it's one of our explicitly watched files, it's relevant
            if (this.watchedFiles.has(filePath)) {
                return true;
            }
            
            // Check if it's in a watched folder
            for (const folder of this.watchedFolders) {
                if (filePath.startsWith(folder)) {
                    // Check if it matches watch patterns
                    const relativePath = path.relative(folder, filePath);
                    
                    // Skip node_modules, .git, etc.
                    if (relativePath.includes('node_modules') || 
                        relativePath.includes('.git') ||
                        relativePath.includes('dist') ||
                        relativePath.includes('build')) {
                        return false;
                    }
                    
                    // Check file extensions
                    const ext = path.extname(filePath).toLowerCase();
                    if (['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.go', '.rs'].includes(ext)) {
                        return true;
                    }
                }
            }
            
            return false;
        } catch (error) {
            this.logger.warn(`Error checking if file is relevant: ${error}`);
            return false;
        }
    }
    
    /**
     * Calculate a hash of the application version
     */
    private async calculateAppVersionHash(): Promise<void> {
        try {
            // Use package.json modification times as version fingerprint
            const packageJsonPaths = [];
            
            // Add workspace package.json files
            const roots = this.workspaceService.tryGetRoots();
            for (const root of roots) {
                const rootPath = FileUri.fsPath(root.resource);
                const packageJsonPath = path.join(rootPath, 'package.json');
                
                if (fs.existsSync(packageJsonPath)) {
                    packageJsonPaths.push(packageJsonPath);
                }
            }
            
            // Add extension's package.json
            const extensionPackageJsonPath = path.resolve(__dirname, '../../package.json');
            if (fs.existsSync(extensionPackageJsonPath)) {
                packageJsonPaths.push(extensionPackageJsonPath);
            }
            
            if (packageJsonPaths.length === 0) {
                this.logger.warn('No package.json files found for version tracking');
                this.appVersionHash = 'unknown';
                return;
            }
            
            // Create hash from file stats
            const hash = crypto.createHash('sha256');
            
            for (const filePath of packageJsonPaths) {
                const stats = await fs.promises.stat(filePath);
                hash.update(filePath + stats.mtimeMs.toString());
                
                // Also add the content hash
                const content = await fs.promises.readFile(filePath, 'utf8');
                hash.update(content);
            }
            
            this.appVersionHash = hash.digest('hex');
            this.logger.debug(`App version hash: ${this.appVersionHash}`);
        } catch (error) {
            this.logger.error('Error calculating app version hash:', error);
            this.appVersionHash = 'error';
        }
    }
    
    /**
     * Check for application updates and invalidate cache if needed
     */
    private async checkForAppUpdate(): Promise<void> {
        const cacheDir = path.join(os.homedir(), '.codevibeai', 'cache');
        const versionFilePath = path.join(cacheDir, 'app-version.txt');
        
        try {
            // Ensure cache directory exists
            await fs.promises.mkdir(cacheDir, { recursive: true });
            
            // Get current app version hash
            if (!this.appVersionHash) {
                await this.calculateAppVersionHash();
            }
            
            let previousVersion: string | undefined;
            
            // Read previous version
            if (fs.existsSync(versionFilePath)) {
                previousVersion = await fs.promises.readFile(versionFilePath, 'utf8');
            }
            
            // Check if version changed
            if (previousVersion !== this.appVersionHash) {
                this.logger.info('Application version changed, clearing cache');
                await this.cache.clear();
                
                // Save new version
                await fs.promises.writeFile(versionFilePath, this.appVersionHash!, 'utf8');
            }
        } catch (error) {
            this.logger.error('Error checking for app updates:', error);
        }
    }
    
    /**
     * Manage cache storage size
     */
    private async manageStorageSize(): Promise<void> {
        try {
            const metrics = this.cache.getMetrics();
            
            // Check if we're over the max size
            if (metrics.storageSize > this.config.maxStorageSize) {
                const pctOver = ((metrics.storageSize / this.config.maxStorageSize) - 1) * 100;
                this.logger.info(`Cache is ${pctOver.toFixed(1)}% over size limit, clearing oldest entries`);
                
                // For now, just clear the whole cache
                // In a more sophisticated implementation, we could selectively remove
                // the oldest entries until we're under the limit
                await this.cache.clear();
            }
        } catch (error) {
            this.logger.error('Error managing cache storage size:', error);
        }
    }
    
    /**
     * Add a specific file to the watched files list
     * 
     * @param filePath File path to watch
     */
    addWatchedFile(filePath: string): void {
        this.watchedFiles.add(path.normalize(filePath));
    }
    
    /**
     * Add a folder to watch for changes
     * 
     * @param folderPath Folder path to watch
     */
    addWatchedFolder(folderPath: string): void {
        this.watchedFolders.add(path.normalize(folderPath));
    }
}