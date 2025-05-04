import { Event } from '@theia/core/lib/common/event';
import { Disposable } from '@theia/core/lib/common/disposable';
import { CancellationToken } from '@theia/core/lib/common/cancellation';

/**
 * Claude model type
 */
export enum ClaudeModelType {
    /** Claude 3 Opus - highest capability model */
    CLAUDE_3_OPUS = 'claude-3-opus-20240229',
    /** Claude 3 Sonnet - balanced model */
    CLAUDE_3_SONNET = 'claude-3-sonnet-20240229',
    /** Claude 3 Haiku - fastest model */
    CLAUDE_3_HAIKU = 'claude-3-haiku-20240307'
}

/**
 * Claude message role
 */
export enum ClaudeMessageRole {
    /** User message */
    USER = 'user',
    /** Assistant message */
    ASSISTANT = 'assistant',
    /** System message */
    SYSTEM = 'system'
}

/**
 * Claude authentication configuration
 */
export interface ClaudeAuthConfig {
    /** Claude API key */
    apiKey?: string;
    /** Authentication method */
    authMethod: 'api_key' | 'oauth';
    /** Whether to store the API key securely */
    secureStorage: boolean;
}

/**
 * Claude API request options
 */
export interface ClaudeRequestOptions {
    /** The Claude model to use */
    model?: ClaudeModelType;
    /** Maximum tokens to generate */
    maxTokens?: number;
    /** Temperature (0-1) for controlling randomness */
    temperature?: number;
    /** Top-p sampling */
    topP?: number;
    /** System prompt */
    systemPrompt?: string;
    /** Stop sequences to end generation */
    stopSequences?: string[];
    /** Whether to use streaming response */
    stream?: boolean;
    /** Request timeout in milliseconds */
    timeoutMs?: number;
    /** Whether to use the cache */
    useCache?: boolean;
}

/**
 * Claude API response format
 */
export interface ClaudeResponseFormat {
    /** Format type */
    type: 'text' | 'json' | 'markdown' | 'code';
    /** Code language if format is code */
    language?: string;
}

/**
 * Claude message
 */
export interface ClaudeMessage {
    /** Message role */
    role: ClaudeMessageRole;
    /** Message content */
    content: string;
}

/**
 * Claude completion request
 */
export interface ClaudeCompletionRequest {
    /** Text prompt */
    prompt: string;
    /** Context to include */
    context?: string;
    /** Code context */
    codeContext?: {
        /** Programming language */
        language: string;
        /** File path */
        filePath?: string;
        /** Surrounding code */
        surroundingCode?: string;
        /** Additional code context */
        [key: string]: any;
    };
    /** Messages for chat completion (alternative to prompt) */
    messages?: ClaudeMessage[];
    /** Response format */
    responseFormat?: ClaudeResponseFormat;
    /** Request options */
    options?: ClaudeRequestOptions;
}

/**
 * Claude streamed content piece
 */
export interface ClaudeStreamedContent {
    /** Content piece */
    content: string;
    /** Whether this is the last piece */
    isLast: boolean;
}

/**
 * Claude API response
 */
export interface ClaudeResponse {
    /** Response ID */
    id: string;
    /** Response content */
    content: string;
    /** Model used */
    model: ClaudeModelType;
    /** Response format */
    format: ClaudeResponseFormat;
    /** Response timestamp */
    timestamp: number;
    /** Usage statistics */
    usage: {
        /** Input tokens */
        inputTokens: number;
        /** Output tokens */
        outputTokens: number;
        /** Total tokens */
        totalTokens: number;
    };
    /** Response metadata */
    metadata: {
        /** Processing time in milliseconds */
        processingTimeMs: number;
        /** Whether the response was cached */
        cached: boolean;
        /** Whether the content was filtered */
        contentFiltered: boolean;
        [key: string]: any;
    };
}

/**
 * Claude API error
 */
export interface ClaudeError {
    /** Error type */
    type: string;
    /** Error message */
    message: string;
    /** HTTP status code */
    statusCode?: number;
    /** Request ID */
    requestId?: string;
}

/**
 * Claude API rate limit info
 */
export interface ClaudeRateLimitInfo {
    /** Requests per minute */
    requestsPerMinute: number;
    /** Tokens per minute */
    tokensPerMinute: number;
    /** Remaining requests */
    remainingRequests: number;
    /** Remaining tokens */
    remainingTokens: number;
    /** Retry after (seconds) */
    retryAfterSeconds?: number;
    /** Reset time */
    resetTime: Date;
}

/**
 * Client for Claude Code integration.
 */
export interface ClaudeCodeService extends Disposable {
    /**
     * Event fired when Claude API is ready
     */
    readonly onReady: Event<void>;
    
    /**
     * Event fired when Claude API connection status changes
     */
    readonly onConnectionStatusChanged: Event<boolean>;
    
    /**
     * Event fired when Claude model is changed
     */
    readonly onModelChanged: Event<ClaudeModelType>;
    
    /**
     * Event fired when streamed content is received
     */
    readonly onStreamedContent: Event<ClaudeStreamedContent>;
    
    /**
     * Event fired when rate limit information is updated
     */
    readonly onRateLimitUpdated: Event<ClaudeRateLimitInfo>;
    
    /**
     * Initialize the Claude Code service.
     * 
     * @param config - Authentication configuration
     * @returns Promise that resolves when initialization is complete
     */
    initialize(config?: ClaudeAuthConfig): Promise<void>;
    
    /**
     * Check if Claude Code service is ready to use.
     * 
     * @returns True if the service is ready, false otherwise
     */
    isReady(): boolean;
    
    /**
     * Get completion from Claude.
     * 
     * @param request - Completion request
     * @param token - Optional cancellation token
     * @returns Promise that resolves to Claude response
     */
    complete(
        request: ClaudeCompletionRequest, 
        token?: CancellationToken
    ): Promise<ClaudeResponse>;
    
    /**
     * Stream completion from Claude.
     * 
     * @param request - Completion request
     * @param token - Optional cancellation token
     * @returns Promise that resolves to Claude response when streaming is complete
     */
    streamComplete(
        request: ClaudeCompletionRequest, 
        token?: CancellationToken
    ): Promise<ClaudeResponse>;
    
    /**
     * Set Claude model to use.
     * 
     * @param model - Claude model to use
     */
    setModel(model: ClaudeModelType): void;
    
    /**
     * Get current Claude model.
     * 
     * @returns Currently selected Claude model
     */
    getModel(): ClaudeModelType;
    
    /**
     * Get available Claude models.
     * 
     * @returns Array of available Claude models
     */
    getAvailableModels(): ClaudeModelType[];
    
    /**
     * Check if API key is valid.
     * 
     * @param apiKey - Optional API key to validate (uses configured key if not provided)
     * @returns Promise that resolves to true if key is valid
     */
    validateApiKey(apiKey?: string): Promise<boolean>;
    
    /**
     * Get current rate limit information.
     * 
     * @returns Current rate limit info
     */
    getRateLimitInfo(): ClaudeRateLimitInfo;
    
    /**
     * Count tokens for a given text.
     * 
     * @param text - Text to count tokens for
     * @returns Promise that resolves to token count
     */
    countTokens(text: string): Promise<number>;
    
    /**
     * Update Claude authentication configuration.
     * 
     * @param config - Authentication configuration to update
     * @returns Promise that resolves when update is complete
     */
    updateAuthConfig(config: Partial<ClaudeAuthConfig>): Promise<void>;
    
    /**
     * Clear the Claude response cache.
     * 
     * @returns Promise that resolves when cache is cleared
     */
    clearCache(): Promise<void>;
}