import { ContainerModule } from '@theia/core/shared/inversify';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common/messaging';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { CommandContribution, MenuContribution } from '@theia/core/lib/common';
import { KeybindingContribution, WebSocketConnectionProvider, WidgetFactory } from '@theia/core/lib/browser';

import { 
    codeVibeAICoreServiceToken, 
    claudeCodeServiceToken, 
    context7ServiceToken, 
    codeGenerationServiceToken, 
    contextTrackingServiceToken 
} from './service-tokens';

// Import your service implementations here
// import { CodeVibeAICoreServiceImpl } from './implementations/code-vibeai-core-service-impl';
// import { ClaudeCodeServiceImpl } from './implementations/claude-code-service-impl';
// etc.

/**
 * Path for CodeVibeAI core service protocol
 */
export const codeVibeAICoreServicePath = '/services/codevibeai-core';

/**
 * Path for Claude code service protocol
 */
export const claudeCodeServicePath = '/services/claude-code';

/**
 * Path for Context7 service protocol
 */
export const context7ServicePath = '/services/context7';

/**
 * Path for code generation service protocol
 */
export const codeGenerationServicePath = '/services/code-generation';

/**
 * Frontend ContainerModule for CodeVibeAI services
 * 
 * This module binds the frontend implementations of CodeVibeAI services
 * and registers them in the dependency injection container.
 * 
 * @example
 * ```typescript
 * // In your application's frontend module
 * import { codeVibeAIFrontendModule } from './container-modules';
 * 
 * export default new ContainerModule(bind => {
 *   bindContributors(bind);
 *   bind(FrontendApplicationContribution).toService(CodeVibeAIContribution);
 * });
 * 
 * function bindContributors(bind: interfaces.Bind): void {
 *   for (const module of [codeVibeAIFrontendModule]) {
 *     bind(ContributionProvider).toConstantValue(module);
 *   }
 * }
 * ```
 */
export const codeVibeAIFrontendModule = new ContainerModule(bind => {
    // Bind frontend contributions
    // bind(CommandContribution).to(CodeVibeAICommandContribution);
    // bind(MenuContribution).to(CodeVibeAIMenuContribution);
    // bind(KeybindingContribution).to(CodeVibeAIKeybindingContribution);
    
    // Bind service proxies
    bind(codeVibeAICoreServiceToken).toDynamicValue(ctx => {
        const connection = ctx.container.get(WebSocketConnectionProvider);
        return connection.createProxy(codeVibeAICoreServicePath);
    }).inSingletonScope();
    
    bind(claudeCodeServiceToken).toDynamicValue(ctx => {
        const connection = ctx.container.get(WebSocketConnectionProvider);
        return connection.createProxy(claudeCodeServicePath);
    }).inSingletonScope();
    
    bind(context7ServiceToken).toDynamicValue(ctx => {
        const connection = ctx.container.get(WebSocketConnectionProvider);
        return connection.createProxy(context7ServicePath);
    }).inSingletonScope();
    
    bind(codeGenerationServiceToken).toDynamicValue(ctx => {
        const connection = ctx.container.get(WebSocketConnectionProvider);
        return connection.createProxy(codeGenerationServicePath);
    }).inSingletonScope();
    
    // ContextTrackingService is implemented on frontend side
    // bind(contextTrackingServiceToken).to(ContextTrackingServiceImpl).inSingletonScope();
    
    // Register widgets
    // bind(WidgetFactory).toDynamicValue(ctx => ({
    //     id: 'codevibeai-chat',
    //     createWidget: () => ctx.container.get(CodeVibeAIChatWidgetFactory).createWidget()
    // }));
});

/**
 * Backend ContainerModule for CodeVibeAI services
 * 
 * This module binds the backend implementations of CodeVibeAI services
 * and registers them in the dependency injection container.
 * 
 * @example
 * ```typescript
 * // In your application's backend module
 * import { codeVibeAIBackendModule } from './container-modules';
 * 
 * export default new ContainerModule(bind => {
 *   bind(BackendApplicationContribution).toService(CodeVibeAIBackendContribution);
 *   
 *   // Bind other backend services
 * });
 * ```
 */
export const codeVibeAIBackendModule = new ContainerModule(bind => {
    // Bind backend contributions
    // bind(BackendApplicationContribution).to(CodeVibeAIBackendContribution);
    
    // Bind service implementations
    // bind(codeVibeAICoreServiceToken).to(CodeVibeAICoreServiceImpl).inSingletonScope();
    // bind(claudeCodeServiceToken).to(ClaudeCodeServiceImpl).inSingletonScope();
    // bind(context7ServiceToken).to(Context7ServiceImpl).inSingletonScope();
    // bind(codeGenerationServiceToken).to(CodeGenerationServiceImpl).inSingletonScope();
    
    // Bind connection handlers for frontend-backend communication
    bind(ConnectionHandler).toDynamicValue(ctx => 
        new JsonRpcConnectionHandler(codeVibeAICoreServicePath, client => {
            const service = ctx.container.get(codeVibeAICoreServiceToken);
            return service;
        })
    ).inSingletonScope();
    
    bind(ConnectionHandler).toDynamicValue(ctx => 
        new JsonRpcConnectionHandler(claudeCodeServicePath, client => {
            const service = ctx.container.get(claudeCodeServiceToken);
            return service;
        })
    ).inSingletonScope();
    
    bind(ConnectionHandler).toDynamicValue(ctx => 
        new JsonRpcConnectionHandler(context7ServicePath, client => {
            const service = ctx.container.get(context7ServiceToken);
            return service;
        })
    ).inSingletonScope();
    
    bind(ConnectionHandler).toDynamicValue(ctx => 
        new JsonRpcConnectionHandler(codeGenerationServicePath, client => {
            const service = ctx.container.get(codeGenerationServiceToken);
            return service;
        })
    ).inSingletonScope();
});

/**
 * Helper module for binding service implementations
 * 
 * Use this module to bind your service implementations
 * to their respective interfaces.
 * 
 * @example
 * ```typescript
 * // In your application's module
 * import { CodeVibeAIServices } from './container-modules';
 * import { CodeVibeAICoreServiceImpl } from './implementations/code-vibeai-core-service-impl';
 * 
 * export default new ContainerModule(bind => {
 *   // Bind core service implementation
 *   CodeVibeAIServices.bindCoreService(bind, CodeVibeAICoreServiceImpl);
 *   
 *   // Bind other services
 * });
 * ```
 */
export namespace CodeVibeAIServices {
    /**
     * Bind CodeVibeAI core service implementation
     * 
     * @param bind - Inversify bind function
     * @param impl - Implementation class
     */
    export function bindCoreService(bind: any, impl: any): void {
        bind(codeVibeAICoreServiceToken).to(impl).inSingletonScope();
    }
    
    /**
     * Bind Claude code service implementation
     * 
     * @param bind - Inversify bind function
     * @param impl - Implementation class
     */
    export function bindClaudeService(bind: any, impl: any): void {
        bind(claudeCodeServiceToken).to(impl).inSingletonScope();
    }
    
    /**
     * Bind Context7 service implementation
     * 
     * @param bind - Inversify bind function
     * @param impl - Implementation class
     */
    export function bindContext7Service(bind: any, impl: any): void {
        bind(context7ServiceToken).to(impl).inSingletonScope();
    }
    
    /**
     * Bind code generation service implementation
     * 
     * @param bind - Inversify bind function
     * @param impl - Implementation class
     */
    export function bindCodeGenerationService(bind: any, impl: any): void {
        bind(codeGenerationServiceToken).to(impl).inSingletonScope();
    }
    
    /**
     * Bind context tracking service implementation
     * 
     * @param bind - Inversify bind function
     * @param impl - Implementation class
     */
    export function bindContextTrackingService(bind: any, impl: any): void {
        bind(contextTrackingServiceToken).to(impl).inSingletonScope();
    }
}