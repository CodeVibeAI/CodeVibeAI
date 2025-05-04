import { injectable, inject } from 'inversify';
import { ILogger } from '@theia/core';
import { Event, Emitter } from '@theia/core/lib/common/event';
import { Disposable, DisposableCollection } from '@theia/core/lib/common/disposable';
import { CancellationToken } from '@theia/core/lib/common/cancellation';
import { FileUri } from '@theia/core/lib/node/file-uri';
import { FileSystemWatcher } from '@theia/filesystem/lib/browser/filesystem-watcher';
import { PreferenceService, PreferenceScope } from '@theia/core/lib/browser/preferences';
import { FileChange, FileChangeType } from '@theia/filesystem/lib/common/filesystem-watcher-protocol';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';

import { 
    ClaudeCodeService,
    ClaudeCompletionRequest,
    ClaudeResponse,
    ClaudeModelType,
    ClaudeAuthConfig,
    ClaudeRateLimitInfo,
    ClaudeMessageRole,
    ClaudeStreamedContent,
    ClaudeError
} from '../common/claude-code-protocol';

import { ClaudeCodeCache, CacheMetrics } from './claude-code-cache';

/**
 * Default options for the Claude service
 */
const DEFAULT_OPTIONS = {
    apiBase: 'https://api.anthropic.com/v1',
    apiVersion: '2023-06-01',
    defaultModel: ClaudeModelType.CLAUDE_3_SONNET,
    maxTokens: 4096,
    temperature: 0.7,
    topP: 0.95,
    timeout: 120000, // 2 minutes
    retries: 3,
    retryDelay: 1000,
    useCache: true
};

/**
 * Claude rate limiting defaults
 */
const DEFAULT_RATE_LIMITS = {
    requestsPerMinute: 20,
    tokensPerMinute: 100000,
    remainingRequests: 20,
    remainingTokens: 100000,
    resetTime: new Date(Date.now() + 60000)
};

/**
 * Implementation of the Claude Code Service with caching support
 */
@injectable()
export class ClaudeCodeServiceImpl implements ClaudeCodeService {
    private client: AxiosInstance | undefined;
    private ready = false;
    private model: ClaudeModelType = DEFAULT_OPTIONS.defaultModel;
    private rateLimits: ClaudeRateLimitInfo = DEFAULT_RATE_LIMITS;
    private apiKey: string | undefined;
    private secureStorage = true;
    private disposables = new DisposableCollection();
    private fileObservers = new Map<string, Disposable>();
    private cacheInvalidationTimer: NodeJS.Timeout | undefined;
    
    @inject(ILogger)
    protected readonly logger: ILogger;
    
    @inject(ClaudeCodeCache)
    protected readonly cache: ClaudeCodeCache;
    
    @inject(FileSystemWatcher)
    protected readonly fileSystemWatcher: FileSystemWatcher;
    
    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;
    
    // Events
    private readonly onReadyEmitter = new Emitter<void>();
    readonly onReady: Event<void> = this.onReadyEmitter.event;
    
    private readonly onConnectionStatusChangedEmitter = new Emitter<boolean>();
    readonly onConnectionStatusChanged: Event<boolean> = this.onConnectionStatusChangedEmitter.event;
    
    private readonly onModelChangedEmitter = new Emitter<ClaudeModelType>();
    readonly onModelChanged: Event<ClaudeModelType> = this.onModelChangedEmitter.event;
    
    private readonly onStreamedContentEmitter = new Emitter<ClaudeStreamedContent>();
    readonly onStreamedContent: Event<ClaudeStreamedContent> = this.onStreamedContentEmitter.event;
    
    private readonly onRateLimitUpdatedEmitter = new Emitter<ClaudeRateLimitInfo>();
    readonly onRateLimitUpdated: Event<ClaudeRateLimitInfo> = this.onRateLimitUpdatedEmitter.event;
    
    /**
     * Initialize the Claude Code service
     * 
     * @param config Authentication configuration
     */
    async initialize(config?: ClaudeAuthConfig): Promise<void> {
        this.logger.info('Initializing Claude Code service');
        
        try {
            // Initialize cache
            await this.cache.initialize();
            
            // Set up API key
            if (config) {
                this.apiKey = config.apiKey;
                this.secureStorage = config.secureStorage;
            } else {
                // Try to load from environment variable
                this.apiKey = process.env.ANTHROPIC_API_KEY;
            }
            
            // Create Axios client
            if (this.apiKey) {
                this.setupClient();
            }
            
            // Set up file watcher for cache invalidation
            this.setupFileWatcher();
            
            // Set up preference watcher for cache invalidation
            this.setupPreferenceWatcher();
            
            // Set up regular cache maintenance
            this.setupCacheMaintenance();
            
            this.ready = !!this.apiKey;
            this.onReadyEmitter.fire();
            this.onConnectionStatusChangedEmitter.fire(this.ready);
            
            this.logger.info(`Claude Code service initialized, ready: ${this.ready}`);
        } catch (error) {
            this.logger.error('Failed to initialize Claude Code service:', error);
            this.ready = false;
            this.onConnectionStatusChangedEmitter.fire(false);
        }
    }
    
    /**
     * Check if the service is ready to use
     */
    isReady(): boolean {
        return this.ready;
    }
    
    /**
     * Get completion from Claude
     * 
     * @param request Completion request
     * @param token Optional cancellation token
     */
    async complete(request: ClaudeCompletionRequest, token?: CancellationToken): Promise<ClaudeResponse> {
        if (!this.ready) {
            throw new Error('Claude service is not ready');
        }
        
        // Check if useCache is explicitly set in request, otherwise use default
        const useCache = request.options?.useCache !== undefined 
            ? request.options.useCache 
            : DEFAULT_OPTIONS.useCache;
            
        // If caching is enabled, check the cache first
        if (useCache) {
            try {
                // Check for in-flight requests first (deduplication)
                const inFlightRequest = this.cache.getInFlightRequest(request);
                if (inFlightRequest) {
                    this.logger.debug('Found in-flight request, reusing promise');
                    return inFlightRequest;
                }
                
                // Check the cache
                const cachedResponse = await this.cache.get(request);
                if (cachedResponse) {
                    this.logger.debug('Cache hit for Claude request');
                    return cachedResponse;
                }
            } catch (error) {
                this.logger.warn('Error checking cache:', error);
                // Continue with API request on cache error
            }
        }
        
        // If we reach this point, we need to make an API request
        const promise = this.makeApiRequest(request, token);
        
        // Register the in-flight request for deduplication
        if (useCache) {
            this.cache.registerInFlightRequest(request, promise);
        }
        
        return promise;
    }
    
    /**
     * Stream completion from Claude
     * 
     * @param request Completion request
     * @param token Optional cancellation token
     */
    async streamComplete(request: ClaudeCompletionRequest, token?: CancellationToken): Promise<ClaudeResponse> {
        // For now, always disable cache for streaming requests
        if (!request.options) {
            request.options = {};
        }
        request.options.stream = true;
        request.options.useCache = false;
        
        return this.makeApiRequest(request, token, true);
    }
    
    /**
     * Set Claude model to use
     * 
     * @param model Claude model to use
     */
    setModel(model: ClaudeModelType): void {
        this.model = model;
        this.onModelChangedEmitter.fire(model);
    }
    
    /**
     * Get current Claude model
     */
    getModel(): ClaudeModelType {
        return this.model;
    }
    
    /**
     * Get available Claude models
     */
    getAvailableModels(): ClaudeModelType[] {
        return [
            ClaudeModelType.CLAUDE_3_OPUS,
            ClaudeModelType.CLAUDE_3_SONNET,
            ClaudeModelType.CLAUDE_3_HAIKU
        ];
    }
    
    /**
     * Validate API key
     * 
     * @param apiKey Optional API key to validate
     */
    async validateApiKey(apiKey?: string): Promise<boolean> {
        const keyToValidate = apiKey || this.apiKey;
        if (!keyToValidate) {
            return false;
        }
        
        try {
            const client = axios.create({
                baseURL: DEFAULT_OPTIONS.apiBase,
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': keyToValidate,
                    'anthropic-version': DEFAULT_OPTIONS.apiVersion
                }
            });
            
            // Make a minimal request to test the API key
            const response = await client.post('/messages', {
                model: ClaudeModelType.CLAUDE_3_HAIKU,
                max_tokens: 10,
                messages: [{ role: ClaudeMessageRole.USER, content: 'Hello' }]
            });
            
            return response.status === 200;
        } catch (error) {
            this.logger.error('API key validation failed:', error);
            return false;
        }
    }
    
    /**
     * Get current rate limit information
     */
    getRateLimitInfo(): ClaudeRateLimitInfo {
        return { ...this.rateLimits };
    }
    
    /**
     * Count tokens for text
     * 
     * @param text Text to count tokens for
     */
    async countTokens(text: string): Promise<number> {
        if (!this.ready || !this.client) {
            throw new Error('Claude service is not ready');
        }
        
        try {
            const response = await this.client.post('/tokenize', {
                model: this.model,
                content: text
            });
            
            return response.data.tokens.length;
        } catch (error) {
            this.logger.error('Token counting failed:', error);
            // Return a rough estimate as fallback
            return Math.ceil(text.length / 4);
        }
    }
    
    /**
     * Update authentication configuration
     * 
     * @param config Authentication configuration to update
     */
    async updateAuthConfig(config: Partial<ClaudeAuthConfig>): Promise<void> {
        if (config.apiKey !== undefined) {
            this.apiKey = config.apiKey;
        }
        
        if (config.secureStorage !== undefined) {
            this.secureStorage = config.secureStorage;
        }
        
        // Recreate client with new config
        if (this.apiKey) {
            this.setupClient();
            this.ready = true;
            this.onConnectionStatusChangedEmitter.fire(true);
        } else {
            this.ready = false;
            this.onConnectionStatusChangedEmitter.fire(false);
        }
    }
    
    /**
     * Clear the Claude response cache
     */
    async clearCache(): Promise<void> {
        return this.cache.clear();
    }
    
    /**
     * Dispose of resources
     */
    dispose(): void {
        this.disposables.dispose();
        this.onReadyEmitter.dispose();
        this.onConnectionStatusChangedEmitter.dispose();
        this.onModelChangedEmitter.dispose();
        this.onStreamedContentEmitter.dispose();
        this.onRateLimitUpdatedEmitter.dispose();
        
        if (this.cacheInvalidationTimer) {
            clearInterval(this.cacheInvalidationTimer);
        }
    }
    
    /**
     * Set up Axios client with API key
     */
    private setupClient(): void {
        if (!this.apiKey) {
            return;
        }
        
        this.client = axios.create({
            baseURL: DEFAULT_OPTIONS.apiBase,
            timeout: DEFAULT_OPTIONS.timeout,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': DEFAULT_OPTIONS.apiVersion
            }
        });
        
        // Add response interceptor for rate limits
        this.client.interceptors.response.use(response => {
            this.updateRateLimits(response.headers);
            return response;
        });
    }
    
    /**
     * Update rate limits from response headers
     * 
     * @param headers Response headers
     */
    private updateRateLimits(headers: any): void {
        const newLimits = { ...this.rateLimits };
        let updated = false;
        
        // Parse rate limit headers
        if (headers['x-ratelimit-limit-requests']) {
            newLimits.requestsPerMinute = parseInt(headers['x-ratelimit-limit-requests']);
            updated = true;
        }
        
        if (headers['x-ratelimit-limit-tokens']) {
            newLimits.tokensPerMinute = parseInt(headers['x-ratelimit-limit-tokens']);
            updated = true;
        }
        
        if (headers['x-ratelimit-remaining-requests']) {
            newLimits.remainingRequests = parseInt(headers['x-ratelimit-remaining-requests']);
            updated = true;
        }
        
        if (headers['x-ratelimit-remaining-tokens']) {
            newLimits.remainingTokens = parseInt(headers['x-ratelimit-remaining-tokens']);
            updated = true;
        }
        
        if (headers['x-ratelimit-reset']) {
            const resetSeconds = parseInt(headers['x-ratelimit-reset']);
            newLimits.resetTime = new Date(Date.now() + resetSeconds * 1000);
            updated = true;
        }
        
        if (headers['retry-after']) {
            newLimits.retryAfterSeconds = parseInt(headers['retry-after']);
            updated = true;
        }
        
        if (updated) {
            this.rateLimits = newLimits;
            this.onRateLimitUpdatedEmitter.fire(newLimits);
        }
    }
    
    /**
     * Make an API request to Claude
     * 
     * @param request Completion request
     * @param token Optional cancellation token
     * @param stream Whether to stream the response
     */
    private async makeApiRequest(
        request: ClaudeCompletionRequest, 
        token?: CancellationToken,
        stream = false
    ): Promise<ClaudeResponse> {
        if (!this.ready || !this.client) {
            throw new Error('Claude service is not ready');
        }
        
        const options = {
            ...DEFAULT_OPTIONS,
            ...request.options,
            stream
        };
        
        let messages;
        
        // Convert request to Claude API format
        if (request.messages) {
            messages = request.messages;
        } else {
            // Create messages from prompt
            messages = [
                {
                    role: ClaudeMessageRole.USER,
                    content: request.prompt
                }
            ];
            
            // Add system prompt if provided
            if (options.systemPrompt) {
                messages.unshift({
                    role: ClaudeMessageRole.SYSTEM,
                    content: options.systemPrompt
                });
            }
        }
        
        const apiRequest = {
            model: options.model || this.model,
            max_tokens: options.maxTokens || DEFAULT_OPTIONS.maxTokens,
            temperature: options.temperature || DEFAULT_OPTIONS.temperature,
            top_p: options.topP || DEFAULT_OPTIONS.topP,
            messages,
            stream: options.stream
        };
        
        // Add cancellation support
        const source = axios.CancelToken.source();
        if (token) {
            token.onCancellationRequested(() => {
                source.cancel('Request cancelled by user');
            });
        }
        
        try {
            const startTime = Date.now();
            
            if (stream) {
                return this.streamRequest(apiRequest, source.token);
            } else {
                const response = await this.client.post('/messages', apiRequest, {
                    cancelToken: source.token
                });
                
                const claudeResponse = this.processResponse(response.data, startTime);
                
                // Store in cache if caching is enabled
                if (options.useCache !== false) {
                    const fileDependencies = this.extractFileDependencies(request);
                    await this.cache.set(request, claudeResponse, fileDependencies);
                }
                
                return claudeResponse;
            }
        } catch (error: any) {
            if (axios.isCancel(error)) {
                throw new Error('Request cancelled');
            }
            
            const claudeError: ClaudeError = {
                type: 'api_error',
                message: error.message || 'Unknown error'
            };
            
            if (error.response) {
                claudeError.statusCode = error.response.status;
                claudeError.requestId = error.response.headers['x-request-id'];
                
                if (error.response.data && error.response.data.error) {
                    claudeError.type = error.response.data.error.type;
                    claudeError.message = error.response.data.error.message;
                }
                
                // Update rate limits
                this.updateRateLimits(error.response.headers);
            }
            
            this.logger.error('Claude API error:', claudeError);
            throw claudeError;
        }
    }
    
    /**
     * Stream request to Claude API
     * 
     * @param apiRequest API request
     * @param cancelToken Axios cancel token
     */
    private async streamRequest(apiRequest: any, cancelToken?: any): Promise<ClaudeResponse> {
        if (!this.client) {
            throw new Error('Claude service is not ready');
        }
        
        const startTime = Date.now();
        let completeResponse: any = null;
        let contentAccumulator = '';
        
        const response = await this.client.post('/messages', apiRequest, {
            cancelToken,
            responseType: 'stream'
        });
        
        return new Promise((resolve, reject) => {
            response.data.on('data', (chunk: Buffer) => {
                const text = chunk.toString();
                const lines = text.split('\n').filter(line => line.trim() !== '');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6);
                        
                        if (data === '[DONE]') {
                            // Stream completed
                            this.onStreamedContentEmitter.fire({
                                content: '',
                                isLast: true
                            });
                            
                            // Resolve with the complete response
                            if (completeResponse) {
                                resolve(this.processResponse(completeResponse, startTime));
                            } else {
                                reject(new Error('Stream completed without full response'));
                            }
                            return;
                        }
                        
                        try {
                            const parsed = JSON.parse(data);
                            
                            if (parsed.type === 'content_block_delta') {
                                const contentDelta = parsed.delta.text || '';
                                contentAccumulator += contentDelta;
                                
                                this.onStreamedContentEmitter.fire({
                                    content: contentDelta,
                                    isLast: false
                                });
                            } else if (parsed.type === 'message_stop') {
                                // End of message, but we still need the full response
                                completeResponse = parsed.message;
                            }
                        } catch (e) {
                            this.logger.warn('Failed to parse streaming response chunk:', e);
                        }
                    }
                }
            });
            
            response.data.on('end', () => {
                if (completeResponse) {
                    // If we already have the complete response, use it
                    resolve(this.processResponse(completeResponse, startTime));
                } else {
                    // Otherwise construct a response from what we've accumulated
                    const claudeResponse: ClaudeResponse = {
                        id: uuidv4(),
                        content: contentAccumulator,
                        model: apiRequest.model,
                        format: { type: 'text' },
                        timestamp: Date.now(),
                        usage: {
                            inputTokens: 0, // We don't know these values for streaming
                            outputTokens: 0,
                            totalTokens: 0
                        },
                        metadata: {
                            processingTimeMs: Date.now() - startTime,
                            cached: false,
                            contentFiltered: false
                        }
                    };
                    resolve(claudeResponse);
                }
            });
            
            response.data.on('error', (err: any) => {
                reject(err);
            });
        });
    }
    
    /**
     * Process Claude API response into ClaudeResponse format
     * 
     * @param rawResponse Raw API response
     * @param startTime Request start time
     */
    private processResponse(rawResponse: any, startTime: number): ClaudeResponse {
        // Extract content from the response
        let content = '';
        if (rawResponse.content && Array.isArray(rawResponse.content)) {
            for (const block of rawResponse.content) {
                if (block.type === 'text') {
                    content += block.text;
                }
            }
        }
        
        return {
            id: rawResponse.id,
            content,
            model: rawResponse.model,
            format: { type: 'text' }, // Claude doesn't specify format in response, default to text
            timestamp: Date.now(),
            usage: {
                inputTokens: rawResponse.usage?.input_tokens || 0,
                outputTokens: rawResponse.usage?.output_tokens || 0,
                totalTokens: rawResponse.usage?.input_tokens + rawResponse.usage?.output_tokens || 0
            },
            metadata: {
                processingTimeMs: Date.now() - startTime,
                cached: false, // This is a fresh response from the API
                contentFiltered: rawResponse.stop_reason === 'content_filtered'
            }
        };
    }
    
    /**
     * Extract file dependencies from a request
     * 
     * @param request Claude completion request
     */
    private extractFileDependencies(request: ClaudeCompletionRequest): string[] {
        const fileDependencies = new Set<string>();
        
        // Check for file path in code context
        if (request.codeContext?.filePath) {
            const filePath = request.codeContext.filePath;
            
            // Convert to absolute path if needed
            const absolutePath = path.isAbsolute(filePath) 
                ? filePath 
                : path.resolve(process.cwd(), filePath);
                
            fileDependencies.add(absolutePath);
            
            // Start watching this file for changes
            this.watchFile(absolutePath);
        }
        
        return Array.from(fileDependencies);
    }
    
    /**
     * Watch a file for changes to invalidate cache
     * 
     * @param filePath File path to watch
     */
    private watchFile(filePath: string): void {
        // Skip if already watching
        if (this.fileObservers.has(filePath)) {
            return;
        }
        
        try {
            const fileUri = FileUri.create(filePath).toString();
            
            const watcher = this.fileSystemWatcher.onFilesChanged(async changes => {
                const matchingChanges = changes.filter(change => 
                    change.uri === fileUri &&
                    (change.type === FileChangeType.UPDATED || change.type === FileChangeType.DELETED)
                );
                
                if (matchingChanges.length > 0) {
                    this.logger.debug(`File changed, invalidating cache: ${filePath}`);
                    await this.cache.invalidateByFiles([filePath]);
                }
            });
            
            this.fileObservers.set(filePath, watcher);
            this.disposables.push(watcher);
        } catch (error) {
            this.logger.warn(`Failed to set up file watcher for ${filePath}:`, error);
        }
    }
    
    /**
     * Set up file watcher for cache invalidation
     */
    private setupFileWatcher(): void {
        // Already handled by watchFile for specific files
    }
    
    /**
     * Set up preference watcher for cache invalidation
     */
    private setupPreferenceWatcher(): void {
        const watcher = this.preferenceService.onPreferenceChanged(async change => {
            // Invalidate cache when Claude-related preferences change
            if (change.preferenceName.startsWith('claude.') || 
                change.preferenceName.startsWith('ai.') ||
                change.preferenceName.startsWith('codevibeai.')) {
                
                this.logger.debug(`Preference changed: ${change.preferenceName}, invalidating cache`);
                await this.cache.clear();
            }
        });
        
        this.disposables.push(watcher);
    }
    
    /**
     * Set up regular cache maintenance
     */
    private setupCacheMaintenance(): void {
        // Set up interval to log cache metrics
        this.cacheInvalidationTimer = setInterval(() => {
            const metrics = this.cache.getMetrics();
            this.logger.debug(`Claude cache metrics - size: ${metrics.size}, hit rate: ${(metrics.hitRate * 100).toFixed(1)}%, hits: ${metrics.hits}, misses: ${metrics.misses}`);
        }, 30 * 60 * 1000); // Log every 30 minutes
    }
    
    /**
     * Get cache metrics
     */
    getCacheMetrics(): CacheMetrics {
        return this.cache.getMetrics();
    }
}