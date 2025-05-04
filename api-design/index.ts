/**
 * CodeVibeAI Services API
 * 
 * This package provides the interfaces and dependency injection infrastructure
 * for the CodeVibeAI Coding Assistant.
 */

// Export service interfaces
export * from './code-vibeai-core-service';
export * from './claude-code-service';
export * from './context7-service';
export * from './code-generation-service';
export * from './context-tracking-service';

// Export service tokens and container modules
export * from './service-tokens';
export * from './container-modules';

// Re-export commonly used types from service interfaces
import { 
    CodeVibeAISessionState, 
    CodeVibeAICapability,
    CodeVibeAIRequestOptions,
    CodeGenerationRequest as CoreCodeGenerationRequest,
    CodeCompletionRequest as CoreCodeCompletionRequest,
    CodeAnalysisRequest,
    CodeVibeAIChatRequest,
    CodeVibeAIResponse,
    CodeVibeAIError,
    CodeVibeAIConfiguration
} from './code-vibeai-core-service';

import {
    ClaudeModelType,
    ClaudeMessageRole,
    ClaudeAuthConfig,
    ClaudeRequestOptions,
    ClaudeResponseFormat,
    ClaudeCompletionRequest,
    ClaudeResponse,
    ClaudeError,
    ClaudeRateLimitInfo
} from './claude-code-service';

import {
    ContextLevel,
    ContextDepth,
    Context7AuthConfig,
    Context7AnalysisOptions,
    CodeLocation,
    CodeSymbol,
    CodeReference,
    Dependency,
    FileContext,
    ProjectContext,
    SelectionContext,
    ContextAnalysisResult,
    IndexingProgress,
    Context7Error
} from './context7-service';

import {
    CodeGenerationMode,
    CodeQualityLevel,
    CodeTemplate,
    CodeGenerationRequest,
    CodeCompletionRequest,
    CodeModificationRequest,
    CodeTestGenerationRequest,
    CodeGenerationResult,
    CodeGenerationError,
    CodeCompletionResult,
    CodeModificationResult,
    CodeTestResult
} from './code-generation-service';

import {
    EditorContextEventType,
    EditorContextEvent,
    ProjectContextEventType,
    ProjectContextEvent,
    IDEContextEventType,
    IDEContextEvent,
    ActiveContextState,
    ContextRelevanceScore,
    ContextTrackingConfig,
    ContextFilterOptions,
    ContextSummary
} from './context-tracking-service';

/**
 * Commonly used types from service interfaces
 */
export namespace CodeVibeAITypes {
    // CodeVibeAICoreService types
    export type SessionState = CodeVibeAISessionState;
    export type Capability = CodeVibeAICapability;
    export type RequestOptions = CodeVibeAIRequestOptions;
    export type CoreGenerationRequest = CoreCodeGenerationRequest;
    export type CoreCompletionRequest = CoreCodeCompletionRequest;
    export type AnalysisRequest = CodeAnalysisRequest;
    export type ChatRequest = CodeVibeAIChatRequest;
    export type Response<T = any> = CodeVibeAIResponse<T>;
    export type Error = CodeVibeAIError;
    export type Configuration = CodeVibeAIConfiguration;
    
    // ClaudeCodeService types
    export type ClaudeModel = ClaudeModelType;
    export type ClaudeRole = ClaudeMessageRole;
    export type ClaudeAuth = ClaudeAuthConfig;
    export type ClaudeOptions = ClaudeRequestOptions;
    export type ClaudeFormat = ClaudeResponseFormat;
    export type ClaudeRequest = ClaudeCompletionRequest;
    export type ClaudeResponse = ClaudeResponse;
    export type ClaudeError = ClaudeError;
    export type ClaudeRateLimit = ClaudeRateLimitInfo;
    
    // Context7Service types
    export type ContextLevel = ContextLevel;
    export type ContextDepth = ContextDepth;
    export type Context7Auth = Context7AuthConfig;
    export type Context7Options = Context7AnalysisOptions;
    export type CodeLocation = CodeLocation;
    export type CodeSymbol = CodeSymbol;
    export type CodeReference = CodeReference;
    export type Dependency = Dependency;
    export type FileContext = FileContext;
    export type ProjectContext = ProjectContext;
    export type SelectionContext = SelectionContext;
    export type ContextResult = ContextAnalysisResult;
    export type IndexProgress = IndexingProgress;
    export type Context7Error = Context7Error;
    
    // CodeGenerationService types
    export type GenMode = CodeGenerationMode;
    export type QualityLevel = CodeQualityLevel;
    export type CodeTemplate = CodeTemplate;
    export type GenerationRequest = CodeGenerationRequest;
    export type CompletionRequest = CodeCompletionRequest;
    export type ModificationRequest = CodeModificationRequest;
    export type TestRequest = CodeTestGenerationRequest;
    export type GenerationResult = CodeGenerationResult;
    export type GenerationError = CodeGenerationError;
    export type CompletionResult = CodeCompletionResult;
    export type ModificationResult = CodeModificationResult;
    export type TestResult = CodeTestResult;
    
    // ContextTrackingService types
    export type EditorEventType = EditorContextEventType;
    export type EditorEvent = EditorContextEvent;
    export type ProjectEventType = ProjectContextEventType;
    export type ProjectEvent = ProjectContextEvent;
    export type IDEEventType = IDEContextEventType;
    export type IDEEvent = IDEContextEvent;
    export type ActiveState = ActiveContextState;
    export type RelevanceScore = ContextRelevanceScore;
    export type TrackingConfig = ContextTrackingConfig;
    export type FilterOptions = ContextFilterOptions;
    export type ContextSummary = ContextSummary;
}