# @codevibeai/claude-integration Extension Design

## Overview
The `@codevibeai/claude-integration` extension integrates Claude AI capabilities into CodeVibeAI. It implements the core AIService interface using Claude API and provides specialized Claude-specific features.

## Directory Structure

```
@codevibeai/claude-integration/
├── src/
│   ├── browser/
│   │   ├── claude-frontend-contribution.ts
│   │   ├── claude-frontend-module.ts
│   │   ├── claude-service-impl.ts
│   │   ├── claude-prompt-builder.ts
│   │   ├── claude-response-formatter.ts
│   │   ├── claude-api-client.ts
│   │   ├── claude-commands.ts
│   │   ├── claude-menu-contribution.ts
│   │   ├── config/
│   │   │   └── claude-preferences.ts
│   │   └── view/
│   │       ├── claude-settings-widget.tsx
│   │       └── claude-settings-widget-contribution.ts
│   ├── common/
│   │   ├── claude-protocol.ts
│   │   ├── claude-service.ts
│   │   ├── claude-types.ts
│   │   ├── index.ts
│   │   └── config/
│   │       └── claude-configuration.ts
│   └── node/
│       ├── claude-backend-contribution.ts
│       ├── claude-backend-module.ts
│       ├── claude-api-provider.ts
│       ├── claude-auth-service.ts
│       ├── claude-cache-manager.ts
│       ├── claude-rate-limiter.ts
│       └── claude-service-impl.ts
├── icons/
│   └── claude-icon.svg
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
  "name": "@codevibeai/claude-integration",
  "version": "0.1.0",
  "description": "Claude AI integration for CodeVibeAI",
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
      "frontend": "lib/browser/claude-frontend-module",
      "backend": "lib/node/claude-backend-module",
      "frontendElectron": "lib/electron-browser/claude-electron-frontend-module",
      "backendElectron": "lib/electron-main/claude-electron-backend-module"
    }
  ]
}
```

### src/common/index.ts

```typescript
// Export all interfaces and types for external consumption
export * from './claude-service';
export * from './claude-types';
export * from './claude-protocol';
export * from './config/claude-configuration';
```

### src/common/claude-service.ts

```typescript
import { Event } from '@theia/core/lib/common/event';
import { AIService } from '@codevibeai/core';
import { ClaudeOptions, ClaudeModel, ClaudeResponse } from './claude-types';

/**
 * Service interface for Claude AI integration
 */
export const ClaudeService = Symbol('ClaudeService');
export interface ClaudeService extends AIService {
    /**
     * Generate code using Claude AI with specific options
     * @param prompt The prompt for code generation
     * @param context Additional context for the prompt
     * @param options Claude-specific options
     * @returns Promise resolving to the generated code response
     */
    generateCodeWithOptions(
        prompt: string, 
        context: any, 
        options: ClaudeOptions
    ): Promise<ClaudeResponse>;
    
    /**
     * Complete code at a specific position
     * @param code The code to complete
     * @param position The position at which to complete
     * @param options Completion options
     * @returns Promise resolving to the completion response
     */
    completeCode(
        code: string, 
        position: { line: number, character: number }, 
        options?: ClaudeOptions
    ): Promise<ClaudeResponse>;
    
    /**
     * Explain code selected by the user
     * @param code The code to explain
     * @param options Explanation options
     * @returns Promise resolving to the explanation
     */
    explainCode(code: string, options?: ClaudeOptions): Promise<ClaudeResponse>;
    
    /**
     * Set the Claude model to use
     * @param model The Claude model to use
     */
    setModel(model: ClaudeModel): void;
    
    /**
     * Get the current Claude model
     * @returns The current Claude model
     */
    getModel(): ClaudeModel;
    
    /**
     * Get available Claude models
     * @returns Array of available models
     */
    getAvailableModels(): ClaudeModel[];
    
    /**
     * Check if the Claude service is properly configured
     * @returns Promise resolving to true if configured
     */
    isConfigured(): Promise<boolean>;
    
    /**
     * Event fired when the Claude model is changed
     */
    readonly onModelChanged: Event<ClaudeModel>;
}
```

### src/common/claude-types.ts

```typescript
import { CodeVibeAIResponse, CodeVibeAIRequest } from '@codevibeai/core';

/**
 * Claude model identifier
 */
export enum ClaudeModel {
    CLAUDE_3_OPUS = 'claude-3-opus-20240229',
    CLAUDE_3_SONNET = 'claude-3-sonnet-20240229',
    CLAUDE_3_HAIKU = 'claude-3-haiku-20240307'
}

/**
 * Claude-specific request options
 */
export interface ClaudeOptions {
    /** The Claude model to use */
    model?: ClaudeModel;
    /** Temperature (0-1) */
    temperature?: number;
    /** Maximum tokens to generate */
    maxTokens?: number;
    /** System prompt */
    systemPrompt?: string;
    /** Top-p sampling */
    topP?: number;
    /** Top-k sampling */
    topK?: number;
    /** Stop sequences */
    stopSequences?: string[];
    /** Whether to stream the response */
    stream?: boolean;
}

/**
 * Claude API response format
 */
export interface ClaudeResponse extends CodeVibeAIResponse {
    /** The Claude model used */
    model: ClaudeModel;
    /** Usage statistics */
    usage: {
        /** Input tokens */
        inputTokens: number;
        /** Output tokens */
        outputTokens: number;
        /** Total tokens */
        totalTokens: number;
    };
    /** Additional Claude-specific metadata */
    claudeMetadata?: {
        /** Whether the response was cached */
        cached: boolean;
        /** Request latency */
        latencyMs: number;
        /** Whether content was filtered */
        contentFiltered: boolean;
    };
}

/**
 * Claude request format extending the base request
 */
export interface ClaudeRequest extends CodeVibeAIRequest {
    /** Claude-specific options */
    claudeOptions?: ClaudeOptions;
}

/**
 * Authentication configuration for Claude
 */
export interface ClaudeAuthConfig {
    /** API key */
    apiKey?: string;
    /** Authentication method */
    authMethod: 'api_key' | 'oauth';
    /** Whether to store credentials securely */
    secureStorage: boolean;
}

/**
 * Usage quota information
 */
export interface ClaudeQuota {
    /** Tokens used */
    tokensUsed: number;
    /** Tokens available */
    tokensAvailable: number;
    /** Quota refresh date */
    refreshDate: Date;
    /** Rate limit information */
    rateLimit: {
        /** Requests per minute */
        requestsPerMinute: number;
        /** Requests remaining */
        requestsRemaining: number;
        /** Reset time */
        resetTime: Date;
    };
}
```

### src/common/claude-protocol.ts

```typescript
import { JsonRpcServer } from '@theia/core/lib/common/messaging/proxy-factory';
import { ClaudeService } from './claude-service';

export const claudeServicePath = '/services/claude-service';

/**
 * Protocol for frontend-backend communication for Claude service
 */
export const ClaudeServiceProtocol = Symbol('ClaudeServiceProtocol');
export interface ClaudeServiceProtocol extends JsonRpcServer<void> {
    /**
     * Get the Claude service instance
     */
    getClaudeService(): Promise<ClaudeService>;
    
    /**
     * Check the API key validity
     * @param apiKey The API key to check
     * @returns True if the API key is valid
     */
    validateApiKey(apiKey: string): Promise<boolean>;
    
    /**
     * Get the current API usage and quota
     * @returns Quota information
     */
    getQuotaInfo(): Promise<any>;
}
```

### src/browser/claude-service-impl.ts

```typescript
import { injectable, inject } from '@theia/core/shared/inversify';
import { Emitter } from '@theia/core/lib/common/event';
import { ILogger } from '@theia/core/lib/common/logger';
import { ClaudeService } from '../common/claude-service';
import { 
    ClaudeModel, 
    ClaudeOptions, 
    ClaudeResponse, 
    ClaudeRequest 
} from '../common/claude-types';
import { CodeVibeAIRequest, CodeVibeAIResponse } from '@codevibeai/core';
import { ClaudeApiClient } from './claude-api-client';
import { ClaudePromptBuilder } from './claude-prompt-builder';
import { ClaudeResponseFormatter } from './claude-response-formatter';
import { MessageService } from '@theia/core';
import { PreferenceService } from '@theia/core/lib/browser';

/**
 * Implementation of Claude service for browser
 */
@injectable()
export class ClaudeServiceImpl implements ClaudeService {
    @inject(ILogger)
    protected readonly logger: ILogger;
    
    @inject(MessageService)
    protected readonly messageService: MessageService;
    
    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;
    
    @inject(ClaudeApiClient)
    protected readonly apiClient: ClaudeApiClient;
    
    @inject(ClaudePromptBuilder)
    protected readonly promptBuilder: ClaudePromptBuilder;
    
    @inject(ClaudeResponseFormatter)
    protected readonly responseFormatter: ClaudeResponseFormatter;
    
    // Event emitters
    protected readonly onResponseEmitter = new Emitter<CodeVibeAIResponse>();
    readonly onResponse = this.onResponseEmitter.event;
    
    protected readonly onModelChangedEmitter = new Emitter<ClaudeModel>();
    readonly onModelChanged = this.onModelChangedEmitter.event;
    
    protected currentModel: ClaudeModel = ClaudeModel.CLAUDE_3_SONNET;
    
    /**
     * Generate code based on a text prompt
     */
    async generateCode(request: CodeVibeAIRequest): Promise<CodeVibeAIResponse> {
        try {
            const claudeRequest = this.convertToClaudeRequest(request);
            const response = await this.apiClient.generateCompletion(claudeRequest);
            const formattedResponse = this.responseFormatter.formatCodeResponse(response);
            this.onResponseEmitter.fire(formattedResponse);
            return formattedResponse;
        } catch (error) {
            this.logger.error(`Error generating code: ${error}`);
            throw error;
        }
    }
    
    /**
     * Generate code with Claude-specific options
     */
    async generateCodeWithOptions(
        prompt: string, 
        context: any, 
        options: ClaudeOptions
    ): Promise<ClaudeResponse> {
        try {
            const request: ClaudeRequest = {
                prompt,
                context,
                claudeOptions: options
            };
            
            const response = await this.apiClient.generateCompletion(request);
            const formattedResponse = this.responseFormatter.formatCodeResponse(response);
            this.onResponseEmitter.fire(formattedResponse);
            return formattedResponse;
        } catch (error) {
            this.logger.error(`Error generating code with options: ${error}`);
            throw error;
        }
    }
    
    /**
     * Analyze code and provide feedback
     */
    async analyzeCode(code: string, options: any): Promise<CodeVibeAIResponse> {
        try {
            const prompt = this.promptBuilder.buildAnalysisPrompt(code, options);
            const request: ClaudeRequest = {
                prompt,
                options: {
                    format: 'markdown'
                }
            };
            
            const response = await this.apiClient.generateCompletion(request);
            const formattedResponse = this.responseFormatter.formatAnalysisResponse(response);
            this.onResponseEmitter.fire(formattedResponse);
            return formattedResponse;
        } catch (error) {
            this.logger.error(`Error analyzing code: ${error}`);
            throw error;
        }
    }
    
    /**
     * Answer a question about code
     */
    async answerQuestion(question: string, codeContext: string): Promise<CodeVibeAIResponse> {
        try {
            const prompt = this.promptBuilder.buildQuestionPrompt(question, codeContext);
            const request: ClaudeRequest = {
                prompt,
                options: {
                    format: 'markdown'
                }
            };
            
            const response = await this.apiClient.generateCompletion(request);
            const formattedResponse = this.responseFormatter.formatQuestionResponse(response);
            this.onResponseEmitter.fire(formattedResponse);
            return formattedResponse;
        } catch (error) {
            this.logger.error(`Error answering question: ${error}`);
            throw error;
        }
    }
    
    /**
     * Complete code at a specific position
     */
    async completeCode(
        code: string, 
        position: { line: number, character: number }, 
        options?: ClaudeOptions
    ): Promise<ClaudeResponse> {
        try {
            const prompt = this.promptBuilder.buildCompletionPrompt(code, position);
            const request: ClaudeRequest = {
                prompt,
                claudeOptions: options || { model: this.currentModel }
            };
            
            const response = await this.apiClient.generateCompletion(request);
            const formattedResponse = this.responseFormatter.formatCompletionResponse(response);
            this.onResponseEmitter.fire(formattedResponse);
            return formattedResponse;
        } catch (error) {
            this.logger.error(`Error completing code: ${error}`);
            throw error;
        }
    }
    
    /**
     * Explain code selected by the user
     */
    async explainCode(code: string, options?: ClaudeOptions): Promise<ClaudeResponse> {
        try {
            const prompt = this.promptBuilder.buildExplanationPrompt(code);
            const request: ClaudeRequest = {
                prompt,
                claudeOptions: options || { model: this.currentModel }
            };
            
            const response = await this.apiClient.generateCompletion(request);
            const formattedResponse = this.responseFormatter.formatExplanationResponse(response);
            this.onResponseEmitter.fire(formattedResponse);
            return formattedResponse;
        } catch (error) {
            this.logger.error(`Error explaining code: ${error}`);
            throw error;
        }
    }
    
    /**
     * Check if the service is ready
     */
    async isReady(): Promise<boolean> {
        return this.apiClient.isReady();
    }
    
    /**
     * Set the Claude model to use
     */
    setModel(model: ClaudeModel): void {
        this.currentModel = model;
        this.onModelChangedEmitter.fire(model);
    }
    
    /**
     * Get the current Claude model
     */
    getModel(): ClaudeModel {
        return this.currentModel;
    }
    
    /**
     * Get available Claude models
     */
    getAvailableModels(): ClaudeModel[] {
        return [
            ClaudeModel.CLAUDE_3_OPUS,
            ClaudeModel.CLAUDE_3_SONNET,
            ClaudeModel.CLAUDE_3_HAIKU
        ];
    }
    
    /**
     * Check if the Claude service is properly configured
     */
    async isConfigured(): Promise<boolean> {
        return this.apiClient.isConfigured();
    }
    
    /**
     * Convert a standard request to a Claude-specific request
     */
    protected convertToClaudeRequest(request: CodeVibeAIRequest): ClaudeRequest {
        return {
            ...request,
            claudeOptions: {
                model: this.currentModel,
                temperature: request.options?.temperature || 0.7,
                maxTokens: request.options?.maxTokens || 1000
            }
        };
    }
}
```

### src/browser/claude-frontend-module.ts

```typescript
import { ContainerModule } from '@theia/core/shared/inversify';
import { CommandContribution, MenuContribution } from '@theia/core/lib/common';
import { WebSocketConnectionProvider } from '@theia/core/lib/browser/messaging/ws-connection-provider';
import { AIService } from '@codevibeai/core';
import { ClaudeService } from '../common/claude-service';
import { ClaudeServiceImpl } from './claude-service-impl';
import { ClaudeFrontendContribution } from './claude-frontend-contribution';
import { ClaudeMenuContribution } from './claude-menu-contribution';
import { ClaudeApiClient } from './claude-api-client';
import { ClaudePromptBuilder } from './claude-prompt-builder';
import { ClaudeResponseFormatter } from './claude-response-formatter';
import { ClaudeSettingsWidgetContribution } from './view/claude-settings-widget-contribution';
import { WidgetFactory } from '@theia/core/lib/browser/widget-manager';
import { bindClaudePreferences } from './config/claude-preferences';
import { ClaudeServiceProtocol, claudeServicePath } from '../common/claude-protocol';

export default new ContainerModule(bind => {
    // Bind Claude service
    bind(ClaudeService).to(ClaudeServiceImpl).inSingletonScope();
    bind(AIService).toService(ClaudeService);
    
    // Bind utility services
    bind(ClaudeApiClient).toSelf().inSingletonScope();
    bind(ClaudePromptBuilder).toSelf().inSingletonScope();
    bind(ClaudeResponseFormatter).toSelf().inSingletonScope();
    
    // Bind contributions
    bind(CommandContribution).to(ClaudeFrontendContribution);
    bind(MenuContribution).to(ClaudeMenuContribution);
    bind(ClaudeFrontendContribution).toSelf().inSingletonScope();
    
    // Bind preferences
    bindClaudePreferences(bind);
    
    // Bind widgets
    bind(ClaudeSettingsWidgetContribution).toSelf().inSingletonScope();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: 'claude-settings',
        createWidget: () => ctx.container.get<ClaudeSettingsWidgetContribution>(
            ClaudeSettingsWidgetContribution
        ).createWidget()
    }));
    
    // Bind protocol for backend communication
    bind(ClaudeServiceProtocol).toDynamicValue(ctx => {
        const connection = ctx.container.get(WebSocketConnectionProvider);
        return connection.createProxy<ClaudeServiceProtocol>(claudeServicePath);
    }).inSingletonScope();
});
```

### src/node/claude-backend-module.ts

```typescript
import { ContainerModule } from '@theia/core/shared/inversify';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common/messaging';
import { ClaudeServiceProtocol, claudeServicePath } from '../common/claude-protocol';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { ClaudeBackendContribution } from './claude-backend-contribution';
import { ClaudeApiProvider } from './claude-api-provider';
import { ClaudeAuthService } from './claude-auth-service';
import { ClaudeCacheManager } from './claude-cache-manager';
import { ClaudeRateLimiter } from './claude-rate-limiter';
import { ClaudeServiceImpl } from './claude-service-impl';

export default new ContainerModule(bind => {
    // Bind backend contributions
    bind(BackendApplicationContribution).to(ClaudeBackendContribution);
    
    // Bind backend services
    bind(ClaudeApiProvider).toSelf().inSingletonScope();
    bind(ClaudeAuthService).toSelf().inSingletonScope();
    bind(ClaudeCacheManager).toSelf().inSingletonScope();
    bind(ClaudeRateLimiter).toSelf().inSingletonScope();
    bind(ClaudeServiceImpl).toSelf().inSingletonScope();
    
    // Bind protocol for frontend-backend communication
    bind(ClaudeServiceProtocol).toService(ClaudeServiceImpl);
    bind(ConnectionHandler).toDynamicValue(ctx => 
        new JsonRpcConnectionHandler(claudeServicePath, () => 
            ctx.container.get<ClaudeServiceProtocol>(ClaudeServiceProtocol)
        )
    ).inSingletonScope();
});
```

## Activation and Loading

- **Startup Optimization**:
  - The extension is loaded on demand when AI features are requested
  - Core interfaces are registered immediately for DI
  - Heavy API clients and services are lazy-loaded
  - Configuration loaded early but actual connection deferred

- **Lazy Loading Strategy**:
  - Backend services initialize only when first requested
  - API client connects only when an operation is performed
  - Caching layer to minimize API calls
  - Resource-intensive formatter loaded on demand

- **Internationalization**:
  - i18n messages in dedicated directory
  - Message loading based on user locale
  - Use of the core LocalizationService

## Service Interfaces

The Claude integration extension provides these key services:

1. **ClaudeService**: Implements AIService with Claude-specific features
2. **ClaudeApiClient**: Handles communication with Claude API
3. **ClaudePromptBuilder**: Constructs effective prompts for different use cases
4. **ClaudeResponseFormatter**: Formats and processes API responses
5. **ClaudeAuthService**: Manages secure API key storage and authentication

## Contributions

- **Commands**:
  - claude.generateCode: Generate code using Claude
  - claude.explainCode: Explain selected code
  - claude.optimizeCode: Optimize selected code
  - claude.completeCode: Provide code completion
  - claude.setModel: Change the Claude model

- **Menus**:
  - Editor context menu items for code operations
  - Settings view for Claude configuration
  - Model selection in status bar

- **Keybindings**:
  - Ctrl+Alt+G: Generate code
  - Ctrl+Alt+E: Explain code
  - Ctrl+Alt+C: Complete code

- **Views**:
  - Claude settings widget for configuration
  - Model selection dropdown

## Security and Performance

- **API Key Management**:
  - Secure storage using system keychain (via keytar)
  - Keys never stored in plaintext
  - Key validation on startup

- **Request Optimization**:
  - Response caching for identical prompts
  - Rate limiting to prevent quota exhaustion
  - Request streaming for large responses
  - Background token counting

- **Error Handling**:
  - Graceful degradation on API errors
  - Comprehensive error reporting
  - Automatic retry with exponential backoff

## Dependencies

- **Required Dependencies**:
  - @codevibeai/core: Core interfaces and types
  - @theia/core: Theia core functionality
  - axios: HTTP client for API communication
  - keytar: Secure credential storage
  
- **Cross-extension Dependencies**:
  - Depends on @codevibeai/core for service interfaces
  - Optional integration with @codevibeai/context7-integration for enhanced context
  - Will be consumed by @codevibeai/ui for presenting AI features