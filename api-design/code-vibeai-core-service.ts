import { Event } from '@theia/core/lib/common/event';
import { Disposable } from '@theia/core/lib/common/disposable';
import { CancellationToken } from '@theia/core/lib/common/cancellation';

/**
 * CodeVibeAI session state
 */
export enum CodeVibeAISessionState {
    /** Session is initializing */
    INITIALIZING = 'initializing',
    /** Session is ready */
    READY = 'ready',
    /** Session is processing a request */
    PROCESSING = 'processing',
    /** Session encountered an error */
    ERROR = 'error',
    /** Session is disabled */
    DISABLED = 'disabled'
}

/**
 * CodeVibeAI service capability
 */
export interface CodeVibeAICapability {
    /** Capability ID */
    id: string;
    /** Human-readable name */
    name: string;
    /** Capability description */
    description: string;
    /** Whether the capability is currently available */
    available: boolean;
    /** Feature configuration */
    config?: {[key: string]: any};
}

/**
 * CodeVibeAI response format
 */
export type CodeVibeAIResponseFormat = 'text' | 'markdown' | 'json' | 'code';

/**
 * CodeVibeAI request options
 */
export interface CodeVibeAIRequestOptions {
    /** Maximum response tokens */
    maxTokens?: number;
    /** Temperature (0-1) */
    temperature?: number;
    /** Response format */
    responseFormat?: CodeVibeAIResponseFormat;
    /** System message for the AI */
    systemMessage?: string;
    /** Include contextual information */
    includeContext?: boolean;
    /** Context depth (files, imports, etc.) */
    contextDepth?: number;
    /** Model to use (if applicable) */
    model?: string;
    /** Request tags for tracking */
    tags?: string[];
}

/**
 * CodeVibeAI code generation request
 */
export interface CodeGenerationRequest {
    /** Prompt for code generation */
    prompt: string;
    /** Programming language */
    language?: string;
    /** Context information */
    context?: {
        /** Current file path */
        filePath?: string;
        /** Current file content */
        fileContent?: string;
        /** Current selection */
        selection?: {
            startLine: number;
            startColumn: number;
            endLine: number;
            endColumn: number;
        };
        /** Current cursor position */
        cursorPosition?: {
            line: number;
            column: number;
        };
        /** Other context information */
        [key: string]: any;
    };
    /** Request options */
    options?: CodeVibeAIRequestOptions;
}

/**
 * CodeVibeAI code completion request
 */
export interface CodeCompletionRequest {
    /** Code before the cursor */
    prefix: string;
    /** Code after the cursor (if available) */
    suffix?: string;
    /** Programming language */
    language: string;
    /** File path */
    filePath: string;
    /** Cursor position */
    position: {
        line: number;
        column: number;
    };
    /** Request options */
    options?: CodeVibeAIRequestOptions;
}

/**
 * CodeVibeAI code analysis request
 */
export interface CodeAnalysisRequest {
    /** Code to analyze */
    code: string;
    /** Analysis type */
    analysisType: 'explain' | 'review' | 'optimize' | 'security' | 'documentation';
    /** Programming language */
    language: string;
    /** File path */
    filePath?: string;
    /** Request options */
    options?: CodeVibeAIRequestOptions;
}

/**
 * CodeVibeAI chat request
 */
export interface CodeVibeAIChatRequest {
    /** User message */
    message: string;
    /** Chat history */
    history?: Array<{
        role: 'user' | 'assistant' | 'system';
        content: string;
    }>;
    /** Context information */
    context?: {
        filePath?: string;
        selection?: string;
        [key: string]: any;
    };
    /** Request options */
    options?: CodeVibeAIRequestOptions;
}

/**
 * CodeVibeAI response
 */
export interface CodeVibeAIResponse<T = any> {
    /** Response content */
    content: T;
    /** Response format */
    format: CodeVibeAIResponseFormat;
    /** Response metadata */
    metadata: {
        /** Request ID */
        requestId: string;
        /** Processing time in milliseconds */
        processingTimeMs: number;
        /** Token usage */
        tokenUsage?: {
            prompt: number;
            completion: number;
            total: number;
        };
        /** Response source */
        source: string;
        /** Response timestamp */
        timestamp: number;
        /** Additional metadata */
        [key: string]: any;
    };
}

/**
 * CodeVibeAI error
 */
export interface CodeVibeAIError {
    /** Error code */
    code: string;
    /** Error message */
    message: string;
    /** Detailed error information */
    details?: any;
    /** Error timestamp */
    timestamp: number;
}

/**
 * CodeVibeAI telemetry event
 */
export interface CodeVibeAITelemetryEvent {
    /** Event type */
    type: string;
    /** Event timestamp */
    timestamp: number;
    /** Event source */
    source: string;
    /** Event data */
    data: {[key: string]: any};
}

/**
 * CodeVibeAI configuration
 */
export interface CodeVibeAIConfiguration {
    /** API keys */
    apiKeys: {
        /** Claude API key */
        claude?: string;
        /** Context7 API key */
        context7?: string;
    };
    /** Feature settings */
    features: {
        /** Enable/disable code completion */
        codeCompletion: boolean;
        /** Enable/disable code generation */
        codeGeneration: boolean;
        /** Enable/disable code analysis */
        codeAnalysis: boolean;
        /** Enable/disable chat */
        chat: boolean;
    };
    /** AI model settings */
    models: {
        /** Default model for code generation */
        codeGeneration: string;
        /** Default model for code completion */
        codeCompletion: string;
        /** Default model for code analysis */
        codeAnalysis: string;
        /** Default model for chat */
        chat: string;
    };
    /** Context settings */
    context: {
        /** Enable/disable context tracking */
        enabled: boolean;
        /** Maximum files to include in context */
        maxFiles: number;
        /** Maximum depth for dependency lookup */
        maxDepth: number;
    };
    /** Telemetry settings */
    telemetry: {
        /** Enable/disable telemetry */
        enabled: boolean;
        /** Anonymize telemetry data */
        anonymize: boolean;
    };
    /** UI settings */
    ui: {
        /** Show inline suggestions */
        showInlineSuggestions: boolean;
        /** Show status bar indicator */
        showStatusBarIndicator: boolean;
    };
}

/**
 * Main coordination service for CodeVibeAI.
 * 
 * This service orchestrates the various components of CodeVibeAI,
 * including AI code generation, context tracking, and integration
 * with Claude Code and Context7.
 * 
 * @example
 * ```typescript
 * // Initialize and configure the service
 * const service = container.get<CodeVibeAICoreService>(CodeVibeAICoreService);
 * await service.initialize();
 * 
 * // Generate code using AI
 * const response = await service.generateCode({
 *   prompt: "Create a function that calculates fibonacci numbers",
 *   language: "typescript",
 *   options: { responseFormat: "code" }
 * });
 * 
 * console.log(response.content);
 * // function fibonacci(n: number): number {
 * //   if (n <= 1) return n;
 * //   return fibonacci(n - 1) + fibonacci(n - 2);
 * // }
 * ```
 */
export interface CodeVibeAICoreService extends Disposable {
    /**
     * Event fired when the service state changes
     */
    readonly onStateChanged: Event<CodeVibeAISessionState>;
    
    /**
     * Event fired when a request starts processing
     */
    readonly onRequestStarted: Event<string>;
    
    /**
     * Event fired when a request completes
     */
    readonly onRequestCompleted: Event<CodeVibeAIResponse<any>>;
    
    /**
     * Event fired when a request fails
     */
    readonly onRequestFailed: Event<CodeVibeAIError>;
    
    /**
     * Event fired when a telemetry event is recorded
     */
    readonly onTelemetryEvent: Event<CodeVibeAITelemetryEvent>;
    
    /**
     * Event fired when configuration changes
     */
    readonly onConfigurationChanged: Event<Partial<CodeVibeAIConfiguration>>;
    
    /**
     * Initialize the CodeVibeAI core service.
     * 
     * This method performs necessary setup, validates configurations,
     * and establishes connections to dependent services.
     * 
     * @returns A promise that resolves when initialization is complete
     * 
     * @example
     * ```typescript
     * await service.initialize();
     * console.log("CodeVibeAI service initialized!");
     * ```
     */
    initialize(): Promise<void>;
    
    /**
     * Get the current state of the CodeVibeAI service.
     * 
     * @returns The current service state
     * 
     * @example
     * ```typescript
     * const state = service.getState();
     * console.log(`Current state: ${state}`);
     * ```
     */
    getState(): CodeVibeAISessionState;
    
    /**
     * Get the current configuration of the CodeVibeAI service.
     * 
     * @returns The current configuration
     * 
     * @example
     * ```typescript
     * const config = service.getConfiguration();
     * console.log(`Code completion enabled: ${config.features.codeCompletion}`);
     * ```
     */
    getConfiguration(): CodeVibeAIConfiguration;
    
    /**
     * Update the configuration of the CodeVibeAI service.
     * 
     * @param config - Partial configuration to update
     * @returns A promise that resolves when the configuration is updated
     * 
     * @example
     * ```typescript
     * await service.updateConfiguration({
     *   features: {
     *     codeCompletion: true,
     *     codeGeneration: true
     *   }
     * });
     * ```
     */
    updateConfiguration(config: Partial<CodeVibeAIConfiguration>): Promise<void>;
    
    /**
     * Get available capabilities of the CodeVibeAI service.
     * 
     * @returns Array of available capabilities
     * 
     * @example
     * ```typescript
     * const capabilities = service.getCapabilities();
     * for (const capability of capabilities) {
     *   console.log(`${capability.name}: ${capability.available ? 'Available' : 'Unavailable'}`);
     * }
     * ```
     */
    getCapabilities(): CodeVibeAICapability[];
    
    /**
     * Generate code based on a prompt.
     * 
     * @param request - Code generation request
     * @param token - Optional cancellation token
     * @returns Promise resolving to the generated code response
     * 
     * @example
     * ```typescript
     * const response = await service.generateCode({
     *   prompt: "Write a React component that displays a counter",
     *   language: "typescript",
     *   options: {
     *     responseFormat: "code",
     *     temperature: 0.7
     *   }
     * });
     * 
     * console.log(response.content);
     * ```
     */
    generateCode(
        request: CodeGenerationRequest, 
        token?: CancellationToken
    ): Promise<CodeVibeAIResponse<string>>;
    
    /**
     * Complete code at the current cursor position.
     * 
     * @param request - Code completion request
     * @param token - Optional cancellation token
     * @returns Promise resolving to the code completion response
     * 
     * @example
     * ```typescript
     * const response = await service.completeCode({
     *   prefix: "function calculateArea(radius) {\n  return ",
     *   language: "javascript",
     *   filePath: "/project/src/math.js",
     *   position: { line: 1, column: 10 }
     * });
     * 
     * console.log(response.content); // "Math.PI * radius * radius;"
     * ```
     */
    completeCode(
        request: CodeCompletionRequest, 
        token?: CancellationToken
    ): Promise<CodeVibeAIResponse<string>>;
    
    /**
     * Analyze code for explanations, reviews, or optimizations.
     * 
     * @param request - Code analysis request
     * @param token - Optional cancellation token
     * @returns Promise resolving to the code analysis response
     * 
     * @example
     * ```typescript
     * const response = await service.analyzeCode({
     *   code: "function quickSort(arr) { ... }",
     *   analysisType: "explain",
     *   language: "javascript"
     * });
     * 
     * console.log(response.content);
     * // "This function implements the quicksort algorithm, which works by..."
     * ```
     */
    analyzeCode(
        request: CodeAnalysisRequest, 
        token?: CancellationToken
    ): Promise<CodeVibeAIResponse<string>>;
    
    /**
     * Send a chat message and get a response.
     * 
     * @param request - Chat request
     * @param token - Optional cancellation token
     * @returns Promise resolving to the chat response
     * 
     * @example
     * ```typescript
     * const response = await service.chat({
     *   message: "How can I optimize this function?",
     *   context: {
     *     filePath: "/project/src/app.js",
     *     selection: "function processItems(items) { items.forEach(item => processItem(item)); }"
     *   }
     * });
     * 
     * console.log(response.content);
     * ```
     */
    chat(
        request: CodeVibeAIChatRequest, 
        token?: CancellationToken
    ): Promise<CodeVibeAIResponse<string>>;
    
    /**
     * Check if a specific capability is available.
     * 
     * @param capabilityId - The ID of the capability to check
     * @returns True if the capability is available, false otherwise
     * 
     * @example
     * ```typescript
     * if (service.hasCapability('code-generation')) {
     *   // Use code generation feature
     * } else {
     *   // Show alternative UI
     * }
     * ```
     */
    hasCapability(capabilityId: string): boolean;
    
    /**
     * Reset the service to its initial state.
     * 
     * @returns A promise that resolves when the reset is complete
     * 
     * @example
     * ```typescript
     * await service.reset();
     * console.log("Service has been reset");
     * ```
     */
    reset(): Promise<void>;
    
    /**
     * Log a telemetry event.
     * 
     * @param eventType - Type of the event
     * @param data - Event data
     * 
     * @example
     * ```typescript
     * service.logTelemetry('code-generation-used', {
     *   language: 'typescript',
     *   promptLength: 120,
     *   responseLength: 450
     * });
     * ```
     */
    logTelemetry(eventType: string, data: {[key: string]: any}): void;
    
    /**
     * Get the active context for the current editing session.
     * 
     * @returns The current context information
     * 
     * @example
     * ```typescript
     * const context = await service.getCurrentContext();
     * console.log(`Current file: ${context.filePath}`);
     * ```
     */
    getCurrentContext(): Promise<{[key: string]: any}>;
}