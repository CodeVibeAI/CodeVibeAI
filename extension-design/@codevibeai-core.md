# @codevibeai/core Extension Design

## Overview
The `@codevibeai/core` extension provides the foundation for the CodeVibeAI system. It defines core interfaces, types, and services that are used by other extensions. This extension follows Theia conventions for structure and organization.

## Directory Structure

```
@codevibeai/core/
├── src/
│   ├── browser/
│   │   ├── codevibeai-core-frontend-contribution.ts
│   │   ├── codevibeai-core-frontend-module.ts
│   │   ├── config/
│   │   │   ├── codevibeai-preferences.ts
│   │   │   └── codevibeai-preference-provider.ts
│   │   ├── codevibeai-core-menu-contribution.ts
│   │   ├── session/
│   │   │   └── session-manager-impl.ts
│   │   └── telemetry/
│   │       └── telemetry-service-impl.ts
│   ├── common/
│   │   ├── ai-service.ts
│   │   ├── context-service.ts
│   │   ├── codevibeai-protocol.ts
│   │   ├── codevibeai-types.ts
│   │   ├── config/
│   │   │   └── codevibeai-configuration.ts
│   │   ├── events/
│   │   │   └── ai-response-event.ts
│   │   ├── i18n/
│   │   │   └── localization.ts
│   │   ├── index.ts
│   │   ├── protocols/
│   │   │   ├── ai-service-protocol.ts
│   │   │   └── context-service-protocol.ts
│   │   ├── session/
│   │   │   └── session-manager.ts
│   │   └── telemetry/
│   │       └── telemetry-service.ts
│   └── node/
│       ├── codevibeai-core-backend-contribution.ts
│       ├── codevibeai-core-backend-module.ts
│       ├── config/
│       │   └── codevibeai-server-config.ts
│       └── session/
│           └── session-manager-impl.ts
├── icons/
│   └── codevibeai-icon.svg
├── license.txt
├── package.json
├── README.md
└── tsconfig.json
```

## Key Files

### package.json

```json
{
  "name": "@codevibeai/core",
  "version": "0.1.0",
  "description": "CodeVibeAI Core Extension - foundation services for AI coding",
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
    "icons"
  ],
  "dependencies": {
    "@theia/core": "^1.42.0",
    "@theia/editor": "^1.42.0",
    "@theia/filesystem": "^1.42.0",
    "@theia/workspace": "^1.42.0"
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
      "frontend": "lib/browser/codevibeai-core-frontend-module",
      "backend": "lib/node/codevibeai-core-backend-module",
      "frontendElectron": "lib/electron-browser/codevibeai-core-electron-frontend-module",
      "backendElectron": "lib/electron-main/codevibeai-core-electron-backend-module"
    }
  ]
}
```

### src/common/index.ts

```typescript
// Export all interfaces and types for external consumption
export * from './ai-service';
export * from './context-service';
export * from './codevibeai-types';
export * from './codevibeai-protocol';
export * from './events/ai-response-event';
export * from './session/session-manager';
export * from './telemetry/telemetry-service';
export * from './i18n/localization';
export * from './config/codevibeai-configuration';
```

### src/common/ai-service.ts

```typescript
import { Event } from '@theia/core/lib/common/event';
import { CodeVibeAIResponse, CodeVibeAIRequest } from './codevibeai-types';

/**
 * Base service interface for AI-powered code assistance
 */
export const AIService = Symbol('AIService');
export interface AIService {
    /**
     * Generate code based on a text prompt
     * @param request The code generation request
     * @returns Promise resolving to generated code
     */
    generateCode(request: CodeVibeAIRequest): Promise<CodeVibeAIResponse>;
    
    /**
     * Analyze code and provide feedback
     * @param code The code to analyze
     * @param options Analysis options
     * @returns Promise resolving to analysis results
     */
    analyzeCode(code: string, options: any): Promise<CodeVibeAIResponse>;
    
    /**
     * Answer a question about code
     * @param question The question to answer
     * @param codeContext The code context for the question
     * @returns Promise resolving to the answer
     */
    answerQuestion(question: string, codeContext: string): Promise<CodeVibeAIResponse>;
    
    /**
     * Event fired when an AI response is received
     */
    readonly onResponse: Event<CodeVibeAIResponse>;
    
    /**
     * Check if the AI service is ready and configured
     * @returns Promise resolving to true if service is available
     */
    isReady(): Promise<boolean>;
}
```

### src/common/context-service.ts

```typescript
import { CodeContext, ContextType, ContextOptions } from './codevibeai-types';

/**
 * Service interface for code context extraction
 */
export const ContextService = Symbol('ContextService');
export interface ContextService {
    /**
     * Get context for a specific file
     * @param filePath The path to the file
     * @param options Context extraction options
     * @returns Promise resolving to the file context
     */
    getFileContext(filePath: string, options?: ContextOptions): Promise<CodeContext>;
    
    /**
     * Get context for the entire project
     * @param options Context extraction options
     * @returns Promise resolving to the project context
     */
    getProjectContext(options?: ContextOptions): Promise<CodeContext>;
    
    /**
     * Get context for a specific code range
     * @param filePath The path to the file
     * @param startLine The starting line
     * @param endLine The ending line
     * @param options Context extraction options
     * @returns Promise resolving to the code range context
     */
    getCodeRangeContext(
        filePath: string, 
        startLine: number, 
        endLine: number, 
        options?: ContextOptions
    ): Promise<CodeContext>;
    
    /**
     * Get context by type
     * @param contextType The type of context to retrieve
     * @param options Context options
     * @returns Promise resolving to the requested context
     */
    getContextByType(contextType: ContextType, options?: ContextOptions): Promise<CodeContext>;
}
```

### src/common/codevibeai-types.ts

```typescript
/**
 * Common types used throughout CodeVibeAI
 */

/**
 * Represents a code context that provides information about the current code
 */
export interface CodeContext {
    /** The file path */
    filePath?: string;
    /** The project root path */
    projectRoot?: string;
    /** The current file content */
    content?: string;
    /** The programming language */
    language?: string;
    /** Dependencies and imports */
    dependencies?: string[];
    /** Project structure information */
    projectStructure?: any;
    /** Semantic information */
    semanticInfo?: any;
    /** Any additional metadata */
    metadata?: { [key: string]: any };
}

/**
 * Options for context retrieval
 */
export interface ContextOptions {
    /** Include dependencies */
    includeDependencies?: boolean;
    /** Include project structure */
    includeProjectStructure?: boolean;
    /** Include semantic information */
    includeSemanticInfo?: boolean;
    /** Max depth for context gathering */
    maxDepth?: number;
    /** Additional filters */
    filters?: string[];
}

/**
 * Type of context to retrieve
 */
export enum ContextType {
    FILE = 'file',
    PROJECT = 'project',
    WORKSPACE = 'workspace',
    SELECTION = 'selection',
    FUNCTION = 'function',
    CLASS = 'class'
}

/**
 * Request to the AI service
 */
export interface CodeVibeAIRequest {
    /** The request prompt */
    prompt: string;
    /** Associated context */
    context?: CodeContext;
    /** Request options */
    options?: {
        /** Maximum length of response */
        maxTokens?: number;
        /** Response format */
        format?: 'text' | 'json' | 'markdown';
        /** Temperature for generation */
        temperature?: number;
    };
    /** Request metadata */
    metadata?: { [key: string]: any };
}

/**
 * Response from the AI service
 */
export interface CodeVibeAIResponse {
    /** The generated content */
    content: string;
    /** The format of the content */
    format: 'text' | 'json' | 'markdown';
    /** Request tracking ID */
    requestId: string;
    /** Response metadata */
    metadata?: { [key: string]: any };
    /** Timing information */
    timing?: {
        /** Time when request was sent */
        requestTime: number;
        /** Time when response was received */
        responseTime: number;
    };
}

/**
 * Configuration for CodeVibeAI
 */
export interface CodeVibeAIConfig {
    /** Claude API key */
    claudeApiKey?: string;
    /** Context7 API key */
    context7ApiKey?: string;
    /** Enable or disable features */
    features: {
        codeCompletion: boolean;
        codeAnalysis: boolean;
        codeGeneration: boolean;
        chatInterface: boolean;
    };
    /** Feature configuration */
    featureConfig: {
        [key: string]: any;
    };
    /** Telemetry configuration */
    telemetry: {
        enabled: boolean;
        anonymizeData: boolean;
    };
}
```

### src/common/session/session-manager.ts

```typescript
import { Event } from '@theia/core/lib/common/event';
import { CodeVibeAIResponse, CodeVibeAIRequest } from '../codevibeai-types';

/**
 * Interface for managing AI conversation sessions
 */
export interface SessionContext {
    /** Unique session identifier */
    id: string;
    /** Session title */
    title: string;
    /** Session creation time */
    createdAt: number;
    /** History of requests and responses */
    history: Array<{
        /** Request or response timestamp */
        timestamp: number;
        /** Request object if this is a request */
        request?: CodeVibeAIRequest;
        /** Response object if this is a response */
        response?: CodeVibeAIResponse;
    }>;
    /** Session metadata */
    metadata?: { [key: string]: any };
}

/**
 * Service for managing AI conversation sessions
 */
export const SessionManager = Symbol('SessionManager');
export interface SessionManager {
    /**
     * Create a new AI conversation session
     * @param title Optional session title
     * @returns The created session context
     */
    createSession(title?: string): SessionContext;
    
    /**
     * Get an existing session by ID
     * @param sessionId Session identifier
     * @returns The session context or undefined if not found
     */
    getSession(sessionId: string): SessionContext | undefined;
    
    /**
     * Get all sessions
     * @returns Array of session contexts
     */
    getSessions(): SessionContext[];
    
    /**
     * Add a request/response pair to a session
     * @param sessionId Session identifier
     * @param request The request object
     * @param response The response object
     */
    addInteraction(
        sessionId: string, 
        request: CodeVibeAIRequest, 
        response: CodeVibeAIResponse
    ): void;
    
    /**
     * Clear the history of a session
     * @param sessionId Session identifier
     */
    clearSession(sessionId: string): void;
    
    /**
     * Delete a session
     * @param sessionId Session identifier
     * @returns True if the session was deleted
     */
    deleteSession(sessionId: string): boolean;
    
    /**
     * Event fired when a session is created
     */
    readonly onSessionCreated: Event<SessionContext>;
    
    /**
     * Event fired when a session is updated
     */
    readonly onSessionUpdated: Event<SessionContext>;
    
    /**
     * Event fired when a session is deleted
     */
    readonly onSessionDeleted: Event<string>;
}
```

### src/common/i18n/localization.ts

```typescript
/**
 * Localization service for CodeVibeAI
 */
export const LocalizationService = Symbol('LocalizationService');
export interface LocalizationService {
    /**
     * Get a localized string by key
     * @param key The localization key
     * @param args Optional arguments for string formatting
     * @returns The localized string
     */
    getMessage(key: string, ...args: any[]): string;
    
    /**
     * Get the current locale
     * @returns The current locale
     */
    getCurrentLocale(): string;
    
    /**
     * Set the current locale
     * @param locale The locale to set
     */
    setCurrentLocale(locale: string): void;
    
    /**
     * Get available locales
     * @returns Array of available locale codes
     */
    getAvailableLocales(): string[];
}
```

### src/browser/codevibeai-core-frontend-module.ts

```typescript
import { ContainerModule } from '@theia/core/shared/inversify';
import { CodeVibeAICoreMenuContribution } from './codevibeai-core-menu-contribution';
import { CodeVibeAICoreFrontendContribution } from './codevibeai-core-frontend-contribution';
import { CommandContribution, MenuContribution } from '@theia/core/lib/common';
import { SessionManager } from '../common/session/session-manager';
import { SessionManagerImpl } from './session/session-manager-impl';
import { TelemetryService } from '../common/telemetry/telemetry-service';
import { TelemetryServiceImpl } from './telemetry/telemetry-service-impl';
import { LocalizationService } from '../common/i18n/localization';
import { LocalizationServiceImpl } from './i18n/localization-service-impl';
import { bindCodeVibeAIPreferences } from './config/codevibeai-preferences';

export default new ContainerModule(bind => {
    // Bind contributions
    bind(CommandContribution).to(CodeVibeAICoreFrontendContribution);
    bind(MenuContribution).to(CodeVibeAICoreMenuContribution);
    
    // Bind frontend services
    bind(SessionManager).to(SessionManagerImpl).inSingletonScope();
    bind(TelemetryService).to(TelemetryServiceImpl).inSingletonScope();
    bind(LocalizationService).to(LocalizationServiceImpl).inSingletonScope();
    
    // Bind preferences
    bindCodeVibeAIPreferences(bind);
});
```

### src/node/codevibeai-core-backend-module.ts

```typescript
import { ContainerModule } from '@theia/core/shared/inversify';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common/messaging';
import { SessionManager } from '../common/session/session-manager';
import { SessionManagerImpl } from './session/session-manager-impl';
import { CodeVibeAICoreBackendContribution } from './codevibeai-core-backend-contribution';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { AIServiceProtocol, aiServicePath } from '../common/protocols/ai-service-protocol';
import { ContextServiceProtocol, contextServicePath } from '../common/protocols/context-service-protocol';

export default new ContainerModule(bind => {
    // Bind backend contributions
    bind(BackendApplicationContribution).to(CodeVibeAICoreBackendContribution);
    
    // Bind backend services
    bind(SessionManager).to(SessionManagerImpl).inSingletonScope();
    
    // Bind service protocols for frontend-backend communication
    bind(ConnectionHandler).toDynamicValue(ctx => 
        new JsonRpcConnectionHandler(aiServicePath, () => 
            ctx.container.get<AIServiceProtocol>(AIServiceProtocol)
        )
    ).inSingletonScope();
    
    bind(ConnectionHandler).toDynamicValue(ctx => 
        new JsonRpcConnectionHandler(contextServicePath, () => 
            ctx.container.get<ContextServiceProtocol>(ContextServiceProtocol)
        )
    ).inSingletonScope();
});
```

## Service Interfaces

The core extension defines the following key service interfaces:

1. **AIService**: Base interface for AI interactions (code generation, analysis, Q&A)
2. **ContextService**: Interface for code context extraction
3. **SessionManager**: Manages AI conversation sessions and history
4. **TelemetryService**: Collects usage metrics (respecting privacy preferences)
5. **LocalizationService**: Provides i18n/l10n support

## Activation and Loading

- **Startup Optimization**:
  - Core services are loaded on demand using DI
  - Minimal frontend contribution that only registers commands/menus
  - Heavy services are lazy-loaded upon first use

- **Lazy Loading Strategy**:
  - Use Theia's built-in lazy loading mechanisms
  - Core interfaces are loaded immediately for DI
  - Implementations are loaded on demand
  - Preference initialization is deferred until needed

- **Internationalization**:
  - Localization files loaded based on user preferences
  - Default English strings bundled with extension
  - Additional languages loaded dynamically
  - String externalization via LocalizationService

## Contribution Points

- **Commands**:
  - Core commands for enabling/disabling features
  - Configuration commands
  - Session management commands

- **Menus**:
  - CodeVibeAI main menu
  - Context menu items
  - Editor toolbar items

- **Keybindings**:
  - Essential keybindings for core features
  - Customizable through preferences

- **Preferences**:
  - Feature toggles
  - API key configuration (securely stored)
  - Performance settings
  - Telemetry opt-in/out

## Dependencies

- Minimal dependencies on Theia core modules:
  - @theia/core: Core Theia functionality
  - @theia/editor: Editor integration
  - @theia/filesystem: File access
  - @theia/workspace: Workspace management

No external dependencies are required for the core extension, maintaining a clean dependency tree.