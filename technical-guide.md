# CodeVibeAI Technical Guide

## 1. TypeScript Code Conventions

### 1.1 Code Structure and Organization

- **Module Organization**
  - Organize code into browser, common, and node modules following Theia conventions
  - Keep related functionality in cohesive modules
  - Follow the pattern: `src/browser`, `src/common`, `src/node`

- **File Naming**
  - Use kebab-case for file names: `ai-service.ts`, `code-context-provider.ts`
  - Include module prefix in filenames: `codevibeai-core.ts`, `claude-service-impl.ts`
  - Service implementations should end with `-impl` suffix

- **Code Organization**
  - One class/interface per file unless tightly coupled
  - Place interfaces in `common` directory
  - Place implementations in `browser` or `node` directories as appropriate

### 1.2 Styling and Formatting

- **Indentation and Spacing**
  - Use 4 spaces for indentation
  - No trailing whitespace
  - Use LF (Unix) line endings
  - End files with a newline

- **Naming Conventions**
  - Services and Classes: PascalCase (`ClaudeService`, `ContextProvider`)
  - Interfaces: PascalCase with no prefix (`Service`, not `IService`)
  - Methods and Properties: camelCase (`getFileContext`, `analyzeCode`)
  - Constants: UPPER_SNAKE_CASE for true constants
  - Type parameters: PascalCase, single letter or descriptive (`T`, `TResult`, `TContext`)

- **Imports and Exports**
  - Group imports by origin:
    1. Third-party libraries (alphabetical order)
    2. Theia imports
    3. CodeVibeAI imports
    4. Relative imports
  - Use explicit imports not `import *`
  - Export interfaces from index.ts files

### 1.3 Documentation

- **JSDoc Comments**
  - Document all public APIs with JSDoc comments
  - Include @param and @returns tags
  - Describe exceptions/errors that may be thrown
  - Use markdown formatting in JSDoc

- **Code Comments**
  - Comment complex algorithms and non-obvious code
  - Avoid comments that just repeat what the code does
  - Keep comments up to date with code changes
  - Use TODOs with tracking issues when appropriate

## 2. Design Patterns

### 2.1 Core Patterns

- **Dependency Injection**
  - Use Theia's DI container (based on InversifyJS)
  - Define services with Symbol identifiers in common directory
  - Register implementations in module files
  - Use @inject decorator for dependencies
  - Example:
    ```typescript
    // In common/ai-service.ts
    export const AIService = Symbol('AIService');
    export interface AIService { ... }

    // In browser/ai-service-impl.ts
    @injectable()
    export class AIServiceImpl implements AIService {
        @inject(LoggerService)
        protected readonly logger: LoggerService;
        ...
    }
    
    // In browser/my-module.ts
    bind(AIService).to(AIServiceImpl).inSingletonScope();
    ```

- **Factory Pattern**
  - Use factories for creating complex objects
  - Factory interfaces in common, implementations in browser/node
  - Register factories with DI container
  - Example:
    ```typescript
    export const ContextProviderFactory = Symbol('ContextProviderFactory');
    export interface ContextProviderFactory {
        createProvider(language: string): ContextProvider;
    }
    
    @injectable()
    export class ContextProviderFactoryImpl implements ContextProviderFactory {
        @inject(JavaContextProvider)
        protected readonly javaProvider: JavaContextProvider;
        
        @inject(TypeScriptContextProvider)
        protected readonly tsProvider: TypeScriptContextProvider;
        
        createProvider(language: string): ContextProvider {
            switch (language) {
                case 'java': return this.javaProvider;
                case 'typescript': return this.tsProvider;
                default: throw new Error(`No context provider for ${language}`);
            }
        }
    }
    ```

- **Observer Pattern**
  - Use Theia's event system for pub/sub
  - Create typed event emitters for custom events
  - Subscribe to events with proper lifecycle management
  - Example:
    ```typescript
    export class AIResponseService {
        private readonly onResponseEmitter = new Emitter<AIResponse>();
        readonly onResponse: Event<AIResponse> = this.onResponseEmitter.event;
        
        processResponse(response: AIResponse): void {
            // Process...
            this.onResponseEmitter.fire(response);
        }
        
        dispose(): void {
            this.onResponseEmitter.dispose();
        }
    }
    
    // Usage:
    @inject(AIResponseService)
    protected readonly responseService: AIResponseService;
    
    protected listener: Disposable;
    
    initialize(): void {
        this.listener = this.responseService.onResponse(this.handleResponse.bind(this));
    }
    
    dispose(): void {
        this.listener.dispose();
    }
    ```

- **Strategy Pattern**
  - Use strategy pattern for different implementations of the same interface
  - Particularly useful for language-specific or model-specific logic
  - Register strategies in the DI container
  - Example:
    ```typescript
    export interface CodeCompletionStrategy {
        getCompletions(document: TextDocument, position: Position): Promise<Completion[]>;
    }
    
    @injectable()
    export class TypeScriptCompletionStrategy implements CodeCompletionStrategy {
        // TypeScript-specific implementation
    }
    
    @injectable()
    export class PythonCompletionStrategy implements CodeCompletionStrategy {
        // Python-specific implementation
    }
    ```

### 2.2 Architectural Patterns

- **Command Pattern**
  - Use Theia's command framework
  - Register commands in contribution providers
  - Implement command handlers in dedicated services
  - Add commands to menus and keybindings

- **Proxy Pattern**
  - Use proxies for remote services
  - Implement caching proxies for performance
  - Use proxy for API access control

- **Adapter Pattern**
  - Create adapters for external services
  - Isolate third-party API dependencies
  - Create consistent interfaces over varying implementations

## 3. Error Handling Strategies

### 3.1 Exception Types

- Create custom exception classes for different error types
  ```typescript
  export class AIServiceError extends Error {
      constructor(
          message: string,
          public readonly cause?: Error,
          public readonly serviceId?: string
      ) {
          super(message);
          this.name = 'AIServiceError';
      }
  }
  ```

### 3.2 Error Handling Guidelines

- **Service Layer**
  - Catch and wrap external service errors
  - Add context to errors (request info, etc.)
  - Log errors with appropriate severity
  - Rethrow wrapped errors for UI handling

- **UI Layer**
  - Display user-friendly error messages
  - Provide actionable recovery options when possible
  - Log errors to telemetry if configured
  - Implement appropriate UI recovery

- **Async Error Handling**
  - Use try/catch with async/await
  - Always handle promise rejections
  - Provide fallback behavior when appropriate
  - Example:
    ```typescript
    async getCompletions(document: TextDocument, position: Position): Promise<Completion[]> {
        try {
            return await this.aiService.getCompletions(document.getText(), position);
        } catch (error) {
            this.logger.error('Failed to get completions', error);
            // Return empty array as fallback
            return [];
        }
    }
    ```

### 3.3 Error Recovery

- Implement graceful degradation for AI services
- Provide offline fallbacks when possible
- Cache previous results for resilience
- Implement retry mechanisms with exponential backoff

## 4. Logging and Monitoring

### 4.1 Logging Guidelines

- **Log Levels**
  - `error`: Application errors requiring attention
  - `warn`: Unusual or unexpected conditions
  - `info`: General operational information
  - `debug`: Detailed implementation information for debugging
  - `trace`: Very detailed tracing information

- **Contextual Logging**
  - Include relevant context in log messages
  - Use structured logging with metadata
  - Include correlation IDs for request tracing
  - Example:
    ```typescript
    this.logger.info('Generating code completion', {
        language: document.languageId,
        fileSize: document.getText().length,
        correlationId: requestId
    });
    ```

### 4.2 Telemetry

- **Performance Metrics**
  - Track response times for AI services
  - Monitor resource usage (memory, CPU)
  - Track cache hit/miss rates
  - Measure UI responsiveness

- **Usage Analytics**
  - Track feature usage (anonymized)
  - Monitor error rates
  - Track user engagement metrics
  - Respect privacy preferences

### 4.3 Monitoring

- Implement health checks for services
- Create dashboards for system health
- Set up alerts for critical issues
- Implement distributed tracing for request flows

## 5. Testing Strategy

### 5.1 Unit Testing

- Use Jest for unit tests
- Mock external dependencies
- Focus on service logic and algorithms
- Maintain high coverage for core services

### 5.2 Integration Testing

- Test service interactions
- Verify correct DI wiring
- Mock external API calls
- Test error handling and recovery

### 5.3 UI Testing

- Use Theia's test framework
- Implement component tests
- Test UI interactions and workflows
- Verify accessibility compliance

### 5.4 End-to-End Testing

- Test complete user workflows
- Verify integration with real services (with test accounts)
- Test performance under realistic conditions

## 6. Performance Best Practices

### 6.1 General Guidelines

- Minimize UI blocking operations
- Use web workers for CPU-intensive tasks
- Implement proper caching strategies
- Optimize startup time and critical paths

### 6.2 AI Service Optimization

- Cache AI responses when appropriate
- Implement request batching
- Use streaming responses for long operations
- Implement predictive pre-fetching

### 6.3 Context Service Optimization

- Incrementally update context
- Prioritize context for active files
- Use efficient data structures for context representation
- Implement background processing for context building