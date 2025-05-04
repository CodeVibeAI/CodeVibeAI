import { Event } from '@theia/core/lib/common/event';
import { Disposable } from '@theia/core/lib/common/disposable';
import { CancellationToken } from '@theia/core/lib/common/cancellation';

/**
 * Context level for code understanding
 */
export enum ContextLevel {
    /** File-level context only */
    FILE = 'file',
    /** Project-level context */
    PROJECT = 'project',
    /** Workspace-level context */
    WORKSPACE = 'workspace',
    /** Repository-level context */
    REPOSITORY = 'repository',
    /** Language-level context (standard libraries, etc.) */
    LANGUAGE = 'language'
}

/**
 * Context depth for code analysis
 */
export interface ContextDepth {
    /** Maximum number of files to include */
    maxFiles?: number;
    /** Maximum number of imports to follow */
    maxImports?: number;
    /** Maximum reference depth */
    maxReferenceDepth?: number;
    /** Maximum symbol depth */
    maxSymbolDepth?: number;
}

/**
 * Context7 authentication configuration
 */
export interface Context7AuthConfig {
    /** Context7 API key */
    apiKey?: string;
    /** Authentication method */
    authMethod: 'api_key' | 'oauth';
    /** Whether to store the API key securely */
    secureStorage: boolean;
}

/**
 * Context7 analysis options
 */
export interface Context7AnalysisOptions {
    /** Context level */
    contextLevel?: ContextLevel;
    /** Context depth */
    depth?: ContextDepth;
    /** Include type information */
    includeTypes?: boolean;
    /** Include documentation */
    includeDocs?: boolean;
    /** Include import/dependency information */
    includeDependencies?: boolean;
    /** Include usage examples */
    includeUsage?: boolean;
    /** Include external libraries */
    includeExternalLibs?: boolean;
    /** Max tokens for context */
    maxContextTokens?: number;
    /** Analysis timeout in milliseconds */
    timeoutMs?: number;
}

/**
 * Code location information
 */
export interface CodeLocation {
    /** File path */
    filePath: string;
    /** Start line (1-based) */
    startLine: number;
    /** Start column (1-based) */
    startColumn: number;
    /** End line (1-based) */
    endLine: number;
    /** End column (1-based) */
    endColumn: number;
}

/**
 * Code symbol information
 */
export interface CodeSymbol {
    /** Symbol name */
    name: string;
    /** Symbol kind (class, function, variable, etc.) */
    kind: string;
    /** Symbol location */
    location: CodeLocation;
    /** Symbol documentation */
    documentation?: string;
    /** Symbol type */
    type?: string;
    /** Parent symbol (if nested) */
    parent?: string;
    /** Symbol signature (for functions, methods) */
    signature?: string;
    /** Symbol modifiers (public, private, static, etc.) */
    modifiers?: string[];
}

/**
 * Code reference information
 */
export interface CodeReference {
    /** Reference kind (call, import, inheritance, etc.) */
    kind: string;
    /** Source location */
    source: CodeLocation;
    /** Target symbol name */
    target: string;
    /** Target location (if available) */
    targetLocation?: CodeLocation;
}

/**
 * Dependency information
 */
export interface Dependency {
    /** Dependency name */
    name: string;
    /** Import path */
    path: string;
    /** Whether it's external to the project */
    external: boolean;
    /** Version (if available) */
    version?: string;
    /** How it's used */
    usedAs?: string[];
    /** Import locations */
    locations: CodeLocation[];
}

/**
 * File context information
 */
export interface FileContext {
    /** File path */
    filePath: string;
    /** File content */
    content?: string;
    /** Programming language */
    language: string;
    /** Symbols defined in the file */
    symbols?: CodeSymbol[];
    /** References to other symbols */
    references?: CodeReference[];
    /** File dependencies */
    dependencies?: Dependency[];
    /** Additional metadata */
    metadata?: {[key: string]: any};
}

/**
 * Project context information
 */
export interface ProjectContext {
    /** Project root path */
    rootPath: string;
    /** Project name */
    name: string;
    /** Project files */
    files?: string[];
    /** Key files (entry points, etc.) */
    keyFiles?: string[];
    /** Project structure */
    structure?: any;
    /** Project dependencies */
    dependencies?: Dependency[];
    /** Project type */
    projectType?: string;
    /** Additional metadata */
    metadata?: {[key: string]: any};
}

/**
 * Code selection context information
 */
export interface SelectionContext {
    /** File path */
    filePath: string;
    /** Selected code */
    selectedCode: string;
    /** Selection location */
    location: CodeLocation;
    /** Language */
    language: string;
    /** Symbols in selection */
    symbols?: CodeSymbol[];
    /** References in selection */
    references?: CodeReference[];
    /** Scope information */
    scope?: {
        /** Scope type (function, block, class, etc.) */
        type: string;
        /** Scope name */
        name?: string;
        /** Scope location */
        location: CodeLocation;
        /** Available variables */
        variables?: CodeSymbol[];
    };
}

/**
 * Context analysis result
 */
export interface ContextAnalysisResult {
    /** Result ID */
    id: string;
    /** Content summary */
    summary: string;
    /** File context */
    fileContext?: FileContext;
    /** Project context */
    projectContext?: ProjectContext;
    /** Selection context */
    selectionContext?: SelectionContext;
    /** Symbol graph */
    symbolGraph?: any;
    /** Result metadata */
    metadata: {
        /** Analysis timestamp */
        timestamp: number;
        /** Analysis duration in milliseconds */
        durationMs: number;
        /** Number of files analyzed */
        filesAnalyzed: number;
        /** Number of symbols found */
        symbolsFound: number;
        /** Number of references found */
        referencesFound: number;
        /** Token count estimate */
        tokenCount?: number;
    };
}

/**
 * Indexing progress information
 */
export interface IndexingProgress {
    /** Files processed so far */
    filesProcessed: number;
    /** Total files to process */
    totalFiles: number;
    /** Progress as percentage (0-100) */
    percentage: number;
    /** Current file being processed */
    currentFile?: string;
    /** Whether indexing is complete */
    complete: boolean;
    /** Time elapsed in milliseconds */
    elapsedMs: number;
}

/**
 * Context7 API error
 */
export interface Context7Error {
    /** Error code */
    code: string;
    /** Error message */
    message: string;
    /** File path (if applicable) */
    filePath?: string;
    /** HTTP status code (if applicable) */
    statusCode?: number;
}

/**
 * Client for Context7 integration.
 * 
 * This service provides a dedicated client for interacting with Context7,
 * handling code context extraction, indexing, and retrieval for AI-powered code understanding.
 * 
 * @example
 * ```typescript
 * // Initialize the service
 * const context7Service = container.get<Context7Service>(Context7Service);
 * await context7Service.initialize();
 * 
 * // Analyze the current file
 * const fileContext = await context7Service.analyzeFile('/project/src/app.js');
 * console.log(`Found ${fileContext.symbols.length} symbols in the file`);
 * ```
 */
export interface Context7Service extends Disposable {
    /**
     * Event fired when Context7 API is ready
     */
    readonly onReady: Event<void>;
    
    /**
     * Event fired when indexing starts
     */
    readonly onIndexingStarted: Event<{path: string}>;
    
    /**
     * Event fired when indexing progress updates
     */
    readonly onIndexingProgress: Event<IndexingProgress>;
    
    /**
     * Event fired when indexing completes
     */
    readonly onIndexingComplete: Event<{path: string, durationMs: number}>;
    
    /**
     * Event fired when file context changes
     */
    readonly onFileContextChanged: Event<{filePath: string}>;
    
    /**
     * Initialize the Context7 service.
     * 
     * This method configures the service, validates API keys,
     * and establishes connection to Context7.
     * 
     * @param config - Authentication configuration
     * @returns Promise that resolves when initialization is complete
     * 
     * @example
     * ```typescript
     * await context7Service.initialize({
     *   apiKey: 'ctx7-api-...',
     *   authMethod: 'api_key',
     *   secureStorage: true
     * });
     * ```
     */
    initialize(config?: Context7AuthConfig): Promise<void>;
    
    /**
     * Check if Context7 service is ready to use.
     * 
     * @returns True if the service is ready, false otherwise
     * 
     * @example
     * ```typescript
     * if (context7Service.isReady()) {
     *   // Use Context7 API
     * } else {
     *   // Show setup instructions
     * }
     * ```
     */
    isReady(): boolean;
    
    /**
     * Build or refresh the code index.
     * 
     * @param path - Path to index (defaults to workspace root)
     * @param options - Indexing options
     * @param token - Optional cancellation token
     * @returns Promise that resolves when indexing is complete
     * 
     * @example
     * ```typescript
     * // Index the entire workspace
     * await context7Service.buildIndex();
     * 
     * // Or index a specific directory
     * await context7Service.buildIndex('/project/src', {
     *   includeExternalLibs: false,
     *   maxFiles: 1000
     * });
     * ```
     */
    buildIndex(
        path?: string, 
        options?: Context7AnalysisOptions,
        token?: CancellationToken
    ): Promise<void>;
    
    /**
     * Get the current indexing status.
     * 
     * @returns Current indexing progress
     * 
     * @example
     * ```typescript
     * const progress = context7Service.getIndexingStatus();
     * console.log(`Indexing: ${progress.percentage}% complete`);
     * ```
     */
    getIndexingStatus(): IndexingProgress;
    
    /**
     * Analyze a file to extract context.
     * 
     * @param filePath - Path to the file
     * @param options - Analysis options
     * @param token - Optional cancellation token
     * @returns Promise that resolves to file context
     * 
     * @example
     * ```typescript
     * const fileContext = await context7Service.analyzeFile(
     *   '/project/src/components/Button.tsx',
     *   {
     *     includeTypes: true,
     *     includeDocs: true,
     *     contextLevel: ContextLevel.FILE
     *   }
     * );
     * ```
     */
    analyzeFile(
        filePath: string, 
        options?: Context7AnalysisOptions,
        token?: CancellationToken
    ): Promise<FileContext>;
    
    /**
     * Analyze a project to extract context.
     * 
     * @param rootPath - Project root path
     * @param options - Analysis options
     * @param token - Optional cancellation token
     * @returns Promise that resolves to project context
     * 
     * @example
     * ```typescript
     * const projectContext = await context7Service.analyzeProject(
     *   '/project',
     *   {
     *     contextLevel: ContextLevel.PROJECT,
     *     depth: {
     *       maxFiles: 100,
     *       maxReferenceDepth: 3
     *     }
     *   }
     * );
     * ```
     */
    analyzeProject(
        rootPath: string, 
        options?: Context7AnalysisOptions,
        token?: CancellationToken
    ): Promise<ProjectContext>;
    
    /**
     * Analyze selected code to extract context.
     * 
     * @param filePath - Path to the file
     * @param selection - Code selection location
     * @param options - Analysis options
     * @param token - Optional cancellation token
     * @returns Promise that resolves to selection context
     * 
     * @example
     * ```typescript
     * const selectionContext = await context7Service.analyzeSelection(
     *   '/project/src/utils/helpers.js',
     *   {
     *     startLine: 10,
     *     startColumn: 1,
     *     endLine: 20,
     *     endColumn: 3
     *   },
     *   {
     *     includeUsage: true
     *   }
     * );
     * ```
     */
    analyzeSelection(
        filePath: string, 
        selection: CodeLocation, 
        options?: Context7AnalysisOptions,
        token?: CancellationToken
    ): Promise<SelectionContext>;
    
    /**
     * Get comprehensive context analysis.
     * 
     * @param filePath - Path to the file
     * @param selection - Optional code selection
     * @param options - Analysis options
     * @param token - Optional cancellation token
     * @returns Promise that resolves to comprehensive context analysis
     * 
     * @example
     * ```typescript
     * const analysis = await context7Service.getContextAnalysis(
     *   '/project/src/App.jsx',
     *   {
     *     startLine: 15,
     *     startColumn: 3,
     *     endLine: 25,
     *     endColumn: 5
     *   },
     *   {
     *     contextLevel: ContextLevel.PROJECT,
     *     includeTypes: true,
     *     includeDocs: true
     *   }
     * );
     * ```
     */
    getContextAnalysis(
        filePath: string, 
        selection?: CodeLocation, 
        options?: Context7AnalysisOptions,
        token?: CancellationToken
    ): Promise<ContextAnalysisResult>;
    
    /**
     * Find symbol references across the codebase.
     * 
     * @param symbolName - Symbol name to find
     * @param filePath - Optional file path for context
     * @param options - Analysis options
     * @returns Promise that resolves to array of references
     * 
     * @example
     * ```typescript
     * const references = await context7Service.findReferences(
     *   'UserService',
     *   '/project/src/services/UserService.ts'
     * );
     * 
     * console.log(`Found ${references.length} references to UserService`);
     * ```
     */
    findReferences(
        symbolName: string, 
        filePath?: string, 
        options?: Context7AnalysisOptions
    ): Promise<CodeReference[]>;
    
    /**
     * Find symbol definition in the codebase.
     * 
     * @param symbolName - Symbol name to find
     * @param filePath - Optional file path for context
     * @returns Promise that resolves to symbol if found
     * 
     * @example
     * ```typescript
     * const symbol = await context7Service.findDefinition(
     *   'processData',
     *   '/project/src/utils/dataProcessor.js'
     * );
     * 
     * if (symbol) {
     *   console.log(`Definition found at ${symbol.location.filePath}:${symbol.location.startLine}`);
     * }
     * ```
     */
    findDefinition(
        symbolName: string, 
        filePath?: string
    ): Promise<CodeSymbol | undefined>;
    
    /**
     * Get project dependencies.
     * 
     * @param rootPath - Project root path
     * @returns Promise that resolves to array of dependencies
     * 
     * @example
     * ```typescript
     * const dependencies = await context7Service.getDependencies('/project');
     * 
     * // Filter external dependencies
     * const externalDeps = dependencies.filter(dep => dep.external);
     * ```
     */
    getDependencies(rootPath: string): Promise<Dependency[]>;
    
    /**
     * Extract context for AI prompt.
     * 
     * @param filePath - Path to the file
     * @param selection - Optional code selection
     * @param options - Analysis options
     * @param maxTokens - Maximum tokens for context
     * @returns Promise that resolves to formatted context string
     * 
     * @example
     * ```typescript
     * const context = await context7Service.extractContextForPrompt(
     *   '/project/src/components/UserList.tsx',
     *   {
     *     startLine: 25,
     *     startColumn: 1,
     *     endLine: 35,
     *     endColumn: 2
     *   },
     *   {
     *     includeDependencies: true,
     *     includeUsage: true
     *   },
     *   2000
     * );
     * 
     * // Use context in AI prompt
     * const prompt = `Given this code context:\n\n${context}\n\nHow can I improve error handling?`;
     * ```
     */
    extractContextForPrompt(
        filePath: string, 
        selection?: CodeLocation, 
        options?: Context7AnalysisOptions,
        maxTokens?: number
    ): Promise<string>;
    
    /**
     * Clear the context cache.
     * 
     * @returns Promise that resolves when cache is cleared
     * 
     * @example
     * ```typescript
     * await context7Service.clearCache();
     * console.log('Context cache cleared');
     * ```
     */
    clearCache(): Promise<void>;
    
    /**
     * Update Context7 authentication configuration.
     * 
     * @param config - Authentication configuration to update
     * @returns Promise that resolves when update is complete
     * 
     * @example
     * ```typescript
     * await context7Service.updateAuthConfig({
     *   apiKey: 'new-api-key',
     *   secureStorage: true
     * });
     * ```
     */
    updateAuthConfig(config: Partial<Context7AuthConfig>): Promise<void>;
}