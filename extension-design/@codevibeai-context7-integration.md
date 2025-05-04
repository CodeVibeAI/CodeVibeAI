# @codevibeai/context7-integration Extension Design

## Overview
The `@codevibeai/context7-integration` extension integrates Context7 capabilities for code understanding into CodeVibeAI. It implements the core ContextService interface and provides advanced code context extraction features.

## Directory Structure

```
@codevibeai/context7-integration/
├── src/
│   ├── browser/
│   │   ├── context7-frontend-contribution.ts
│   │   ├── context7-frontend-module.ts
│   │   ├── context7-service-impl.ts
│   │   ├── context7-api-client.ts
│   │   ├── context7-commands.ts
│   │   ├── context7-menu-contribution.ts
│   │   ├── config/
│   │   │   └── context7-preferences.ts
│   │   └── view/
│   │       ├── context7-settings-widget.tsx
│   │       └── context7-settings-widget-contribution.ts
│   ├── common/
│   │   ├── context7-protocol.ts
│   │   ├── context7-service.ts
│   │   ├── context7-types.ts
│   │   ├── index.ts
│   │   └── config/
│   │       └── context7-configuration.ts
│   └── node/
│       ├── context7-backend-contribution.ts
│       ├── context7-backend-module.ts
│       ├── context7-api-provider.ts
│       ├── context7-auth-service.ts
│       ├── context7-cache-manager.ts
│       ├── context7-index-manager.ts
│       ├── language-analyzers/
│       │   ├── base-language-analyzer.ts
│       │   ├── typescript-analyzer.ts
│       │   ├── python-analyzer.ts
│       │   ├── java-analyzer.ts
│       │   └── language-analyzer-registry.ts
│       └── context7-service-impl.ts
├── icons/
│   └── context7-icon.svg
├── i18n/
│   ├── en.json
│   └── nls.metadata.json
├── license.txt
├── package.json
├── README.md
└── tsconfig.json
```

## Key Files

### package.json

```json
{
  "name": "@codevibeai/context7-integration",
  "version": "0.1.0",
  "description": "Context7 integration for code context understanding in CodeVibeAI",
  "keywords": [
    "theia-extension"
  ],
  "license": "EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/organization/codevibeai.git"
  },
  "bugs": {
    "url": "https://github.com/organization/codevibeai/issues"
  },
  "homepage": "https://github.com/organization/codevibeai",
  "files": [
    "lib",
    "src",
    "icons",
    "i18n"
  ],
  "dependencies": {
    "@theia/core": "^1.42.0",
    "@theia/editor": "^1.42.0",
    "@theia/filesystem": "^1.42.0",
    "@theia/workspace": "^1.42.0",
    "@theia/languages": "^1.42.0",
    "@codevibeai/core": "^0.1.0",
    "axios": "^1.6.0",
    "keytar": "^7.9.0",
    "vscode-languageserver-protocol": "^3.17.0"
  },
  "devDependencies": {
    "rimraf": "latest",
    "typescript": "~4.5.5"
  },
  "scripts": {
    "prepare": "yarn clean && yarn build",
    "clean": "rimraf lib",
    "build": "tsc",
    "watch": "tsc -w"
  },
  "theiaExtensions": [
    {
      "frontend": "lib/browser/context7-frontend-module",
      "backend": "lib/node/context7-backend-module",
      "frontendElectron": "lib/electron-browser/context7-electron-frontend-module",
      "backendElectron": "lib/electron-main/context7-electron-backend-module"
    }
  ]
}
```

### src/common/index.ts

```typescript
// Export all interfaces and types for external consumption
export * from './context7-service';
export * from './context7-types';
export * from './context7-protocol';
export * from './config/context7-configuration';
```

### src/common/context7-service.ts

```typescript
import { ContextService } from '@codevibeai/core';
import { Context7Options, Context7Result, ContextTree, SemanticLink } from './context7-types';
import { Event } from '@theia/core/lib/common/event';

/**
 * Service interface for Context7 integration
 */
export const Context7Service = Symbol('Context7Service');
export interface Context7Service extends ContextService {
    /**
     * Get context for a specific file with Context7-specific options
     * @param filePath The path to the file
     * @param options Context7-specific options
     * @returns Promise resolving to the enhanced file context
     */
    getFileContextWithOptions(
        filePath: string, 
        options: Context7Options
    ): Promise<Context7Result>;
    
    /**
     * Get semantic links for a specific symbol
     * @param symbol The symbol name
     * @param filePath Optional file path for context
     * @returns Promise resolving to semantic links
     */
    getSemanticLinks(symbol: string, filePath?: string): Promise<SemanticLink[]>;
    
    /**
     * Get the context tree for a file or directory
     * @param path The file or directory path
     * @param depth The maximum depth to traverse
     * @returns Promise resolving to the context tree
     */
    getContextTree(path: string, depth?: number): Promise<ContextTree>;
    
    /**
     * Analyze dependencies for a file or project
     * @param path The file or project path
     * @returns Promise resolving to dependency analysis
     */
    analyzeDependencies(path: string): Promise<any>;
    
    /**
     * Build or refresh the code index
     * @param path Optional path to index (defaults to workspace)
     * @returns Promise resolving when indexing is complete
     */
    buildIndex(path?: string): Promise<void>;
    
    /**
     * Check indexing status
     * @returns The current indexing status
     */
    getIndexStatus(): { indexing: boolean, progress: number, files: number };
    
    /**
     * Event fired when indexing starts
     */
    readonly onIndexingStarted: Event<{ path: string }>;
    
    /**
     * Event fired when indexing progress updates
     */
    readonly onIndexingProgress: Event<{ progress: number, files: number }>;
    
    /**
     * Event fired when indexing completes
     */
    readonly onIndexingComplete: Event<{ files: number, duration: number }>;
    
    /**
     * Check if the Context7 service is properly configured
     * @returns Promise resolving to true if configured
     */
    isConfigured(): Promise<boolean>;
}
```

### src/common/context7-types.ts

```typescript
import { CodeContext, ContextOptions } from '@codevibeai/core';

/**
 * Context7-specific options for context retrieval
 */
export interface Context7Options extends ContextOptions {
    /** Include semantic information */
    includeSemanticInfo?: boolean;
    /** Include call hierarchy */
    includeCallHierarchy?: boolean;
    /** Include type information */
    includeTypeInfo?: boolean;
    /** Include symbol references */
    includeReferences?: boolean;
    /** Max depth for dependency analysis */
    dependencyDepth?: number;
    /** Include external dependencies */
    includeExternalDependencies?: boolean;
    /** Include usage examples */
    includeUsageExamples?: boolean;
    /** Number of usage examples to include */
    usageExamplesLimit?: number;
}

/**
 * Enhanced context result from Context7
 */
export interface Context7Result extends CodeContext {
    /** Semantic information about the code */
    semanticInfo?: {
        /** Symbols defined in the file */
        symbols: Symbol[];
        /** References to external symbols */
        references: SymbolReference[];
        /** Type information */
        types: TypeInfo[];
        /** Function signatures */
        functions: FunctionInfo[];
        /** Class information */
        classes: ClassInfo[];
    };
    /** Call hierarchy information */
    callHierarchy?: {
        /** Incoming calls */
        incoming: CallHierarchyItem[];
        /** Outgoing calls */
        outgoing: CallHierarchyItem[];
    };
    /** Related files by relevance */
    relatedFiles?: Array<{
        /** File path */
        path: string;
        /** Relevance score */
        relevance: number;
        /** Reason for relation */
        reason: string;
    }>;
    /** Context7-specific metadata */
    context7Metadata?: {
        /** Request ID */
        requestId: string;
        /** Context extracted at timestamp */
        timestamp: number;
        /** Index version used */
        indexVersion: string;
    };
}

/**
 * Symbol information
 */
export interface Symbol {
    /** Symbol name */
    name: string;
    /** Symbol kind (variable, function, class, etc.) */
    kind: string;
    /** Symbol location */
    location: {
        /** File path */
        filePath: string;
        /** Range in file */
        range: {
            /** Start line */
            startLine: number;
            /** Start character */
            startCharacter: number;
            /** End line */
            endLine: number;
            /** End character */
            endCharacter: number;
        };
    };
    /** Symbol documentation */
    documentation?: string;
}

/**
 * Reference to a symbol
 */
export interface SymbolReference {
    /** Target symbol name */
    target: string;
    /** Source location */
    source: {
        /** File path */
        filePath: string;
        /** Range in file */
        range: {
            /** Start line */
            startLine: number;
            /** Start character */
            startCharacter: number;
            /** End line */
            endLine: number;
            /** End character */
            endCharacter: number;
        };
    };
    /** Reference type (use, modification, etc.) */
    type: string;
}

/**
 * Type information
 */
export interface TypeInfo {
    /** Type name */
    name: string;
    /** Base types */
    baseTypes?: string[];
    /** Properties */
    properties?: Array<{
        /** Property name */
        name: string;
        /** Property type */
        type: string;
        /** Property documentation */
        documentation?: string;
    }>;
    /** Methods */
    methods?: Array<{
        /** Method name */
        name: string;
        /** Method signature */
        signature: string;
        /** Method documentation */
        documentation?: string;
    }>;
}

/**
 * Function information
 */
export interface FunctionInfo {
    /** Function name */
    name: string;
    /** Function signature */
    signature: string;
    /** Parameters */
    parameters: Array<{
        /** Parameter name */
        name: string;
        /** Parameter type */
        type: string;
        /** Default value if any */
        defaultValue?: string;
    }>;
    /** Return type */
    returnType: string;
    /** Function documentation */
    documentation?: string;
    /** Usage examples */
    usageExamples?: Array<{
        /** Example code */
        code: string;
        /** Example source */
        source: string;
    }>;
}

/**
 * Class information
 */
export interface ClassInfo {
    /** Class name */
    name: string;
    /** Base classes */
    baseClasses?: string[];
    /** Implemented interfaces */
    interfaces?: string[];
    /** Properties */
    properties?: Array<{
        /** Property name */
        name: string;
        /** Property type */
        type: string;
        /** Property documentation */
        documentation?: string;
        /** Access modifier */
        accessibility?: 'public' | 'protected' | 'private';
    }>;
    /** Methods */
    methods?: Array<{
        /** Method name */
        name: string;
        /** Method signature */
        signature: string;
        /** Method documentation */
        documentation?: string;
        /** Access modifier */
        accessibility?: 'public' | 'protected' | 'private';
    }>;
}

/**
 * Call hierarchy item
 */
export interface CallHierarchyItem {
    /** Caller/callee name */
    name: string;
    /** Caller/callee kind */
    kind: string;
    /** Caller/callee file path */
    filePath: string;
    /** Range in file */
    range: {
        /** Start line */
        startLine: number;
        /** Start character */
        startCharacter: number;
        /** End line */
        endLine: number;
        /** End character */
        endCharacter: number;
    };
    /** Call sites */
    callSites: Array<{
        /** File path */
        filePath: string;
        /** Range in file */
        range: {
            /** Start line */
            startLine: number;
            /** Start character */
            startCharacter: number;
            /** End line */
            endLine: number;
            /** End character */
            endCharacter: number;
        };
    }>;
}

/**
 * Semantic link between code entities
 */
export interface SemanticLink {
    /** Source entity */
    source: Symbol;
    /** Target entity */
    target: Symbol;
    /** Relationship type */
    relationship: 'imports' | 'calls' | 'inherits' | 'implements' | 'uses' | 'references';
    /** Link strength (0-1) */
    strength: number;
}

/**
 * Tree node representing code structure
 */
export interface ContextTreeNode {
    /** Node ID */
    id: string;
    /** Node name */
    name: string;
    /** Node kind */
    kind: 'file' | 'directory' | 'class' | 'function' | 'variable' | 'namespace';
    /** Child nodes */
    children?: ContextTreeNode[];
    /** Node metadata */
    metadata?: {
        /** Path if file or directory */
        path?: string;
        /** Symbol information if code entity */
        symbol?: Symbol;
        /** Relevance score */
        relevance?: number;
    };
}

/**
 * Complete context tree
 */
export interface ContextTree {
    /** Root node */
    root: ContextTreeNode;
    /** Tree metadata */
    metadata: {
        /** Tree creation timestamp */
        timestamp: number;
        /** Total node count */
        nodeCount: number;
        /** Max depth */
        depth: number;
    };
}

/**
 * Authentication configuration for Context7
 */
export interface Context7AuthConfig {
    /** API key */
    apiKey?: string;
    /** Authentication method */
    authMethod: 'api_key' | 'oauth';
    /** Whether to store credentials securely */
    secureStorage: boolean;
}
```

### src/browser/context7-service-impl.ts

```typescript
import { injectable, inject } from '@theia/core/shared/inversify';
import { Emitter } from '@theia/core/lib/common/event';
import { ILogger } from '@theia/core/lib/common/logger';
import { Context7Service } from '../common/context7-service';
import { 
    Context7Options, 
    Context7Result, 
    ContextTree, 
    SemanticLink 
} from '../common/context7-types';
import { Context7ApiClient } from './context7-api-client';
import { CodeContext, ContextOptions, ContextType } from '@codevibeai/core';
import { MessageService } from '@theia/core';
import { PreferenceService } from '@theia/core/lib/browser';
import { WebSocketConnectionProvider } from '@theia/core/lib/browser/messaging/ws-connection-provider';
import { Context7ServiceProtocol, context7ServicePath } from '../common/context7-protocol';

/**
 * Implementation of Context7 service for browser
 */
@injectable()
export class Context7ServiceImpl implements Context7Service {
    @inject(ILogger)
    protected readonly logger: ILogger;
    
    @inject(MessageService)
    protected readonly messageService: MessageService;
    
    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;
    
    @inject(Context7ApiClient)
    protected readonly apiClient: Context7ApiClient;
    
    @inject(WebSocketConnectionProvider)
    protected readonly connectionProvider: WebSocketConnectionProvider;
    
    protected serviceProxy: Context7ServiceProtocol;
    
    // Event emitters
    protected readonly onIndexingStartedEmitter = new Emitter<{ path: string }>();
    readonly onIndexingStarted = this.onIndexingStartedEmitter.event;
    
    protected readonly onIndexingProgressEmitter = new Emitter<{ progress: number, files: number }>();
    readonly onIndexingProgress = this.onIndexingProgressEmitter.event;
    
    protected readonly onIndexingCompleteEmitter = new Emitter<{ files: number, duration: number }>();
    readonly onIndexingComplete = this.onIndexingCompleteEmitter.event;
    
    constructor() {
        this.serviceProxy = this.connectionProvider.createProxy<Context7ServiceProtocol>(context7ServicePath);
        
        // Listen for indexing events from backend
        this.serviceProxy.onIndexingStarted(data => this.onIndexingStartedEmitter.fire(data));
        this.serviceProxy.onIndexingProgress(data => this.onIndexingProgressEmitter.fire(data));
        this.serviceProxy.onIndexingComplete(data => this.onIndexingCompleteEmitter.fire(data));
    }
    
    /**
     * Get context for a specific file
     */
    async getFileContext(filePath: string, options?: ContextOptions): Promise<CodeContext> {
        try {
            return this.serviceProxy.getFileContext(filePath, options);
        } catch (error) {
            this.logger.error(`Error getting file context: ${error}`);
            throw error;
        }
    }
    
    /**
     * Get context for a specific file with Context7-specific options
     */
    async getFileContextWithOptions(filePath: string, options: Context7Options): Promise<Context7Result> {
        try {
            return this.serviceProxy.getFileContextWithOptions(filePath, options);
        } catch (error) {
            this.logger.error(`Error getting file context with options: ${error}`);
            throw error;
        }
    }
    
    /**
     * Get context for the entire project
     */
    async getProjectContext(options?: ContextOptions): Promise<CodeContext> {
        try {
            return this.serviceProxy.getProjectContext(options);
        } catch (error) {
            this.logger.error(`Error getting project context: ${error}`);
            throw error;
        }
    }
    
    /**
     * Get context for a specific code range
     */
    async getCodeRangeContext(
        filePath: string, 
        startLine: number, 
        endLine: number, 
        options?: ContextOptions
    ): Promise<CodeContext> {
        try {
            return this.serviceProxy.getCodeRangeContext(filePath, startLine, endLine, options);
        } catch (error) {
            this.logger.error(`Error getting code range context: ${error}`);
            throw error;
        }
    }
    
    /**
     * Get context by type
     */
    async getContextByType(contextType: ContextType, options?: ContextOptions): Promise<CodeContext> {
        try {
            return this.serviceProxy.getContextByType(contextType, options);
        } catch (error) {
            this.logger.error(`Error getting context by type: ${error}`);
            throw error;
        }
    }
    
    /**
     * Get semantic links for a specific symbol
     */
    async getSemanticLinks(symbol: string, filePath?: string): Promise<SemanticLink[]> {
        try {
            return this.serviceProxy.getSemanticLinks(symbol, filePath);
        } catch (error) {
            this.logger.error(`Error getting semantic links: ${error}`);
            throw error;
        }
    }
    
    /**
     * Get the context tree for a file or directory
     */
    async getContextTree(path: string, depth?: number): Promise<ContextTree> {
        try {
            return this.serviceProxy.getContextTree(path, depth);
        } catch (error) {
            this.logger.error(`Error getting context tree: ${error}`);
            throw error;
        }
    }
    
    /**
     * Analyze dependencies for a file or project
     */
    async analyzeDependencies(path: string): Promise<any> {
        try {
            return this.serviceProxy.analyzeDependencies(path);
        } catch (error) {
            this.logger.error(`Error analyzing dependencies: ${error}`);
            throw error;
        }
    }
    
    /**
     * Build or refresh the code index
     */
    async buildIndex(path?: string): Promise<void> {
        try {
            return this.serviceProxy.buildIndex(path);
        } catch (error) {
            this.logger.error(`Error building index: ${error}`);
            throw error;
        }
    }
    
    /**
     * Check indexing status
     */
    getIndexStatus(): { indexing: boolean, progress: number, files: number } {
        try {
            return this.serviceProxy.getIndexStatus();
        } catch (error) {
            this.logger.error(`Error getting index status: ${error}`);
            return { indexing: false, progress: 0, files: 0 };
        }
    }
    
    /**
     * Check if the Context7 service is properly configured
     */
    async isConfigured(): Promise<boolean> {
        try {
            return this.serviceProxy.isConfigured();
        } catch (error) {
            this.logger.error(`Error checking if service is configured: ${error}`);
            return false;
        }
    }
}
```

### src/node/context7-service-impl.ts

```typescript
import { injectable, inject } from '@theia/core/shared/inversify';
import { Emitter } from '@theia/core/lib/common/event';
import { ILogger } from '@theia/core/lib/common/logger';
import { Context7Service } from '../common/context7-service';
import { Context7ServiceProtocol } from '../common/context7-protocol';
import { 
    Context7Options, 
    Context7Result, 
    ContextTree, 
    SemanticLink 
} from '../common/context7-types';
import { CodeContext, ContextOptions, ContextType } from '@codevibeai/core';
import { Context7ApiProvider } from './context7-api-provider';
import { Context7AuthService } from './context7-auth-service';
import { Context7CacheManager } from './context7-cache-manager';
import { Context7IndexManager } from './context7-index-manager';
import { LanguageAnalyzerRegistry } from './language-analyzers/language-analyzer-registry';
import { FileSystem } from '@theia/filesystem/lib/common';
import { WorkspaceService } from '@theia/workspace/lib/browser';

/**
 * Backend implementation of Context7 service
 */
@injectable()
export class Context7ServiceImpl implements Context7Service, Context7ServiceProtocol {
    @inject(ILogger)
    protected readonly logger: ILogger;
    
    @inject(FileSystem)
    protected readonly fileSystem: FileSystem;
    
    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;
    
    @inject(Context7ApiProvider)
    protected readonly apiProvider: Context7ApiProvider;
    
    @inject(Context7AuthService)
    protected readonly authService: Context7AuthService;
    
    @inject(Context7CacheManager)
    protected readonly cacheManager: Context7CacheManager;
    
    @inject(Context7IndexManager)
    protected readonly indexManager: Context7IndexManager;
    
    @inject(LanguageAnalyzerRegistry)
    protected readonly languageAnalyzerRegistry: LanguageAnalyzerRegistry;
    
    // Event emitters
    protected readonly onIndexingStartedEmitter = new Emitter<{ path: string }>();
    readonly onIndexingStarted = this.onIndexingStartedEmitter.event;
    
    protected readonly onIndexingProgressEmitter = new Emitter<{ progress: number, files: number }>();
    readonly onIndexingProgress = this.onIndexingProgressEmitter.event;
    
    protected readonly onIndexingCompleteEmitter = new Emitter<{ files: number, duration: number }>();
    readonly onIndexingComplete = this.onIndexingCompleteEmitter.event;
    
    constructor() {
        // Forward events from index manager to our emitters
        this.indexManager.onIndexingStarted(data => this.onIndexingStartedEmitter.fire(data));
        this.indexManager.onIndexingProgress(data => this.onIndexingProgressEmitter.fire(data));
        this.indexManager.onIndexingComplete(data => this.onIndexingCompleteEmitter.fire(data));
    }
    
    /**
     * Get the Context7 service instance (protocol method)
     */
    getClaudeService(): Promise<Context7Service> {
        return Promise.resolve(this);
    }
    
    /**
     * Get context for a specific file
     */
    async getFileContext(filePath: string, options?: ContextOptions): Promise<CodeContext> {
        try {
            // Check cache first
            const cachedContext = this.cacheManager.getFileContext(filePath, options);
            if (cachedContext) {
                return cachedContext;
            }
            
            const fileContent = await this.fileSystem.resolveContent(filePath);
            const content = fileContent.content;
            const language = this.getLanguageFromPath(filePath);
            
            // Use language-specific analyzer if available
            const analyzer = this.languageAnalyzerRegistry.getAnalyzerForLanguage(language);
            if (analyzer) {
                const context = await analyzer.analyzeFile(filePath, content, options);
                this.cacheManager.cacheFileContext(filePath, context, options);
                return context;
            }
            
            // Fallback to API-based context extraction
            const apiContext = await this.apiProvider.getFileContext(filePath, content, language, options);
            this.cacheManager.cacheFileContext(filePath, apiContext, options);
            return apiContext;
        } catch (error) {
            this.logger.error(`Error getting file context: ${error}`);
            throw error;
        }
    }
    
    /**
     * Get context for a specific file with Context7-specific options
     */
    async getFileContextWithOptions(filePath: string, options: Context7Options): Promise<Context7Result> {
        try {
            // Check cache first
            const cachedContext = this.cacheManager.getFileContext(filePath, options) as Context7Result;
            if (cachedContext) {
                return cachedContext;
            }
            
            const fileContent = await this.fileSystem.resolveContent(filePath);
            const content = fileContent.content;
            const language = this.getLanguageFromPath(filePath);
            
            // Use language-specific analyzer if available
            const analyzer = this.languageAnalyzerRegistry.getAnalyzerForLanguage(language);
            if (analyzer) {
                const context = await analyzer.analyzeFileWithOptions(filePath, content, options);
                this.cacheManager.cacheFileContext(filePath, context, options);
                return context;
            }
            
            // Fallback to API-based context extraction
            const apiContext = await this.apiProvider.getFileContextWithOptions(filePath, content, language, options);
            this.cacheManager.cacheFileContext(filePath, apiContext, options);
            return apiContext;
        } catch (error) {
            this.logger.error(`Error getting file context with options: ${error}`);
            throw error;
        }
    }
    
    /**
     * Get context for the entire project
     */
    async getProjectContext(options?: ContextOptions): Promise<CodeContext> {
        try {
            const rootPath = await this.workspaceService.roots.then(roots => roots[0]?.resource.toString());
            if (!rootPath) {
                throw new Error('No workspace root available');
            }
            
            // Check cache first
            const cachedContext = this.cacheManager.getProjectContext(rootPath, options);
            if (cachedContext) {
                return cachedContext;
            }
            
            // Use index-based context extraction
            const context = await this.indexManager.getProjectContext(rootPath, options);
            this.cacheManager.cacheProjectContext(rootPath, context, options);
            return context;
        } catch (error) {
            this.logger.error(`Error getting project context: ${error}`);
            throw error;
        }
    }
    
    /**
     * Get context for a specific code range
     */
    async getCodeRangeContext(
        filePath: string, 
        startLine: number, 
        endLine: number, 
        options?: ContextOptions
    ): Promise<CodeContext> {
        try {
            const fileContent = await this.fileSystem.resolveContent(filePath);
            const content = fileContent.content;
            const language = this.getLanguageFromPath(filePath);
            
            // Extract specific range from content
            const lines = content.split('\n');
            const rangeContent = lines.slice(startLine - 1, endLine).join('\n');
            
            // Use language-specific analyzer if available
            const analyzer = this.languageAnalyzerRegistry.getAnalyzerForLanguage(language);
            if (analyzer) {
                return analyzer.analyzeCodeRange(filePath, content, rangeContent, startLine, endLine, options);
            }
            
            // Fallback to API-based context extraction
            return this.apiProvider.getCodeRangeContext(filePath, content, rangeContent, startLine, endLine, language, options);
        } catch (error) {
            this.logger.error(`Error getting code range context: ${error}`);
            throw error;
        }
    }
    
    /**
     * Get context by type
     */
    async getContextByType(contextType: ContextType, options?: ContextOptions): Promise<CodeContext> {
        try {
            switch (contextType) {
                case ContextType.FILE:
                    // This requires an active editor to get the current file
                    throw new Error('File context requires a file path');
                
                case ContextType.PROJECT:
                    return this.getProjectContext(options);
                
                case ContextType.WORKSPACE:
                    const rootPath = await this.workspaceService.roots.then(roots => roots[0]?.resource.toString());
                    if (!rootPath) {
                        throw new Error('No workspace root available');
                    }
                    return this.indexManager.getWorkspaceContext(rootPath, options);
                
                case ContextType.SELECTION:
                    // This requires an active editor selection
                    throw new Error('Selection context requires file path and selection range');
                
                default:
                    throw new Error(`Unsupported context type: ${contextType}`);
            }
        } catch (error) {
            this.logger.error(`Error getting context by type: ${error}`);
            throw error;
        }
    }
    
    /**
     * Get semantic links for a specific symbol
     */
    async getSemanticLinks(symbol: string, filePath?: string): Promise<SemanticLink[]> {
        try {
            return this.indexManager.getSemanticLinks(symbol, filePath);
        } catch (error) {
            this.logger.error(`Error getting semantic links: ${error}`);
            throw error;
        }
    }
    
    /**
     * Get the context tree for a file or directory
     */
    async getContextTree(path: string, depth?: number): Promise<ContextTree> {
        try {
            return this.indexManager.getContextTree(path, depth);
        } catch (error) {
            this.logger.error(`Error getting context tree: ${error}`);
            throw error;
        }
    }
    
    /**
     * Analyze dependencies for a file or project
     */
    async analyzeDependencies(path: string): Promise<any> {
        try {
            return this.indexManager.analyzeDependencies(path);
        } catch (error) {
            this.logger.error(`Error analyzing dependencies: ${error}`);
            throw error;
        }
    }
    
    /**
     * Build or refresh the code index
     */
    async buildIndex(path?: string): Promise<void> {
        try {
            if (!path) {
                path = await this.workspaceService.roots.then(roots => roots[0]?.resource.toString());
                if (!path) {
                    throw new Error('No workspace root available');
                }
            }
            
            return this.indexManager.buildIndex(path);
        } catch (error) {
            this.logger.error(`Error building index: ${error}`);
            throw error;
        }
    }
    
    /**
     * Check indexing status
     */
    getIndexStatus(): { indexing: boolean, progress: number, files: number } {
        try {
            return this.indexManager.getIndexStatus();
        } catch (error) {
            this.logger.error(`Error getting index status: ${error}`);
            return { indexing: false, progress: 0, files: 0 };
        }
    }
    
    /**
     * Check if the Context7 service is properly configured
     */
    async isConfigured(): Promise<boolean> {
        try {
            return this.authService.isConfigured();
        } catch (error) {
            this.logger.error(`Error checking if service is configured: ${error}`);
            return false;
        }
    }
    
    /**
     * Get language identifier from file path
     */
    protected getLanguageFromPath(filePath: string): string {
        const extension = filePath.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'ts':
            case 'tsx':
                return 'typescript';
            case 'js':
            case 'jsx':
                return 'javascript';
            case 'py':
                return 'python';
            case 'java':
                return 'java';
            case 'c':
                return 'c';
            case 'cpp':
            case 'cc':
            case 'cxx':
                return 'cpp';
            case 'go':
                return 'go';
            case 'rs':
                return 'rust';
            case 'rb':
                return 'ruby';
            case 'php':
                return 'php';
            case 'cs':
                return 'csharp';
            case 'swift':
                return 'swift';
            case 'kt':
            case 'kts':
                return 'kotlin';
            default:
                return 'plaintext';
        }
    }
}
```

### src/browser/context7-frontend-module.ts

```typescript
import { ContainerModule } from '@theia/core/shared/inversify';
import { CommandContribution, MenuContribution } from '@theia/core/lib/common';
import { WebSocketConnectionProvider } from '@theia/core/lib/browser/messaging/ws-connection-provider';
import { ContextService } from '@codevibeai/core';
import { Context7Service } from '../common/context7-service';
import { Context7ServiceImpl } from './context7-service-impl';
import { Context7FrontendContribution } from './context7-frontend-contribution';
import { Context7MenuContribution } from './context7-menu-contribution';
import { Context7ApiClient } from './context7-api-client';
import { Context7SettingsWidgetContribution } from './view/context7-settings-widget-contribution';
import { WidgetFactory } from '@theia/core/lib/browser/widget-manager';
import { bindContext7Preferences } from './config/context7-preferences';
import { Context7ServiceProtocol, context7ServicePath } from '../common/context7-protocol';

export default new ContainerModule(bind => {
    // Bind Context7 service
    bind(Context7Service).to(Context7ServiceImpl).inSingletonScope();
    bind(ContextService).toService(Context7Service);
    
    // Bind utility services
    bind(Context7ApiClient).toSelf().inSingletonScope();
    
    // Bind contributions
    bind(CommandContribution).to(Context7FrontendContribution);
    bind(MenuContribution).to(Context7MenuContribution);
    bind(Context7FrontendContribution).toSelf().inSingletonScope();
    
    // Bind preferences
    bindContext7Preferences(bind);
    
    // Bind widgets
    bind(Context7SettingsWidgetContribution).toSelf().inSingletonScope();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: 'context7-settings',
        createWidget: () => ctx.container.get<Context7SettingsWidgetContribution>(
            Context7SettingsWidgetContribution
        ).createWidget()
    }));
    
    // Bind protocol for backend communication
    bind(Context7ServiceProtocol).toDynamicValue(ctx => {
        const connection = ctx.container.get(WebSocketConnectionProvider);
        return connection.createProxy<Context7ServiceProtocol>(context7ServicePath);
    }).inSingletonScope();
});
```

### src/node/context7-backend-module.ts

```typescript
import { ContainerModule } from '@theia/core/shared/inversify';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common/messaging';
import { Context7ServiceProtocol, context7ServicePath } from '../common/context7-protocol';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { Context7BackendContribution } from './context7-backend-contribution';
import { Context7ApiProvider } from './context7-api-provider';
import { Context7AuthService } from './context7-auth-service';
import { Context7CacheManager } from './context7-cache-manager';
import { Context7IndexManager } from './context7-index-manager';
import { LanguageAnalyzerRegistry } from './language-analyzers/language-analyzer-registry';
import { BaseLanguageAnalyzer } from './language-analyzers/base-language-analyzer';
import { TypeScriptAnalyzer } from './language-analyzers/typescript-analyzer';
import { PythonAnalyzer } from './language-analyzers/python-analyzer';
import { JavaAnalyzer } from './language-analyzers/java-analyzer';
import { Context7ServiceImpl } from './context7-service-impl';

export default new ContainerModule(bind => {
    // Bind backend contributions
    bind(BackendApplicationContribution).to(Context7BackendContribution);
    
    // Bind backend services
    bind(Context7ApiProvider).toSelf().inSingletonScope();
    bind(Context7AuthService).toSelf().inSingletonScope();
    bind(Context7CacheManager).toSelf().inSingletonScope();
    bind(Context7IndexManager).toSelf().inSingletonScope();
    
    // Bind language analyzers
    bind(LanguageAnalyzerRegistry).toSelf().inSingletonScope();
    bind(BaseLanguageAnalyzer).toSelf();
    bind(TypeScriptAnalyzer).toSelf();
    bind(PythonAnalyzer).toSelf();
    bind(JavaAnalyzer).toSelf();
    
    // Bind service implementation
    bind(Context7ServiceImpl).toSelf().inSingletonScope();
    
    // Bind protocol for frontend-backend communication
    bind(Context7ServiceProtocol).toService(Context7ServiceImpl);
    bind(ConnectionHandler).toDynamicValue(ctx => 
        new JsonRpcConnectionHandler(context7ServicePath, () => 
            ctx.container.get<Context7ServiceProtocol>(Context7ServiceProtocol)
        )
    ).inSingletonScope();
});
```

## Activation and Loading

- **Startup Optimization**:
  - Context7 service initializes in stages to minimize startup impact
  - Basic service registration happens on activation
  - Indexing and heavy operations are delayed until needed
  - Configuration loaded early but actual connection deferred

- **Lazy Loading Strategy**:
  - Indexing only begins when context is first requested
  - Language analyzers are loaded on demand based on file types
  - Caching layer to minimize API calls and re-indexing
  - Incremental indexing for large projects

- **Internationalization**:
  - i18n messages in dedicated directory
  - Message loading based on user locale
  - Use of the core LocalizationService

## Service Interfaces

The Context7 integration extension provides these key services:

1. **Context7Service**: Implements ContextService with Context7-specific features
2. **Context7IndexManager**: Manages code indexing and analysis
3. **LanguageAnalyzerRegistry**: Registry of language-specific analyzers
4. **Context7ApiProvider**: Handles communication with Context7 API
5. **Context7CacheManager**: Manages caching of context data

## Contributions

- **Commands**:
  - context7.buildIndex: Trigger code indexing
  - context7.showContextTree: Show context tree view
  - context7.analyzeDependencies: Analyze project dependencies
  - context7.getSemanticLinks: Find semantic links between symbols

- **Menus**:
  - Explorer context menu for indexing operations
  - Editor context menu for context extraction
  - Dedicated view for context insights

- **Keybindings**:
  - Ctrl+Alt+I: Build/refresh code index
  - Ctrl+Alt+S: Show semantic links for symbol under cursor

- **Views**:
  - Context7 settings widget
  - Context tree visualization
  - Dependency graph viewer

## Performance and Optimization

- **Indexing Strategy**:
  - Progressive indexing to minimize initial load
  - Background indexing process
  - Incremental updates on file changes
  - Prioritization of frequently accessed files

- **Caching Layer**:
  - Multi-level cache (memory and disk)
  - Cache invalidation on file changes
  - Time-based cache expiration
  - Context-specific caching policies

- **Error Handling**:
  - Graceful degradation when API is unavailable
  - Local fallbacks for common operations
  - Retry mechanisms with exponential backoff
  - Detailed error reporting for debugging

## Dependencies

- **Required Dependencies**:
  - @codevibeai/core: Core interfaces and types
  - @theia/core: Theia core functionality
  - @theia/editor: Editor integration
  - @theia/filesystem: File access
  - @theia/workspace: Workspace management
  - @theia/languages: Language support
  - axios: HTTP client for API communication
  - keytar: Secure credential storage

- **Cross-extension Dependencies**:
  - Depends on @codevibeai/core for service interfaces
  - Optional integration with @codevibeai/claude-integration for enhanced AI capabilities
  - Will be consumed by @codevibeai/ui for visualizing context