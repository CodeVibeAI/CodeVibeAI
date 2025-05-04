import { Symbol } from '@theia/core/shared/inversify';
import { CodeVibeAICoreService } from './code-vibeai-core-service';
import { ClaudeCodeService } from './claude-code-service';
import { Context7Service } from './context7-service';
import { CodeGenerationService } from './code-generation-service';
import { ContextTrackingService } from './context-tracking-service';

/**
 * Injection token for CodeVibeAI Core Service
 * 
 * @example
 * ```typescript
 * @inject(codeVibeAICoreServiceToken)
 * protected readonly coreService: CodeVibeAICoreService;
 * ```
 */
export const codeVibeAICoreServiceToken = Symbol('CodeVibeAICoreService');

/**
 * Injection token for Claude Code Service
 * 
 * @example
 * ```typescript
 * @inject(claudeCodeServiceToken)
 * protected readonly claudeService: ClaudeCodeService;
 * ```
 */
export const claudeCodeServiceToken = Symbol('ClaudeCodeService');

/**
 * Injection token for Context7 Service
 * 
 * @example
 * ```typescript
 * @inject(context7ServiceToken)
 * protected readonly contextService: Context7Service;
 * ```
 */
export const context7ServiceToken = Symbol('Context7Service');

/**
 * Injection token for Code Generation Service
 * 
 * @example
 * ```typescript
 * @inject(codeGenerationServiceToken)
 * protected readonly codeGenService: CodeGenerationService;
 * ```
 */
export const codeGenerationServiceToken = Symbol('CodeGenerationService');

/**
 * Injection token for Context Tracking Service
 * 
 * @example
 * ```typescript
 * @inject(contextTrackingServiceToken)
 * protected readonly trackingService: ContextTrackingService;
 * ```
 */
export const contextTrackingServiceToken = Symbol('ContextTrackingService');

/**
 * Type-safe accessor for CodeVibeAI service tokens
 */
export const CodeVibeAIServiceTokens = {
    /**
     * Core Service token
     */
    Core: codeVibeAICoreServiceToken as Symbol<CodeVibeAICoreService>,
    
    /**
     * Claude Code Service token
     */
    Claude: claudeCodeServiceToken as Symbol<ClaudeCodeService>,
    
    /**
     * Context7 Service token
     */
    Context7: context7ServiceToken as Symbol<Context7Service>,
    
    /**
     * Code Generation Service token
     */
    CodeGeneration: codeGenerationServiceToken as Symbol<CodeGenerationService>,
    
    /**
     * Context Tracking Service token
     */
    ContextTracking: contextTrackingServiceToken as Symbol<ContextTrackingService>
};