import { Event } from '@theia/core/lib/common/event';
import { Disposable } from '@theia/core/lib/common/disposable';
import { CancellationToken } from '@theia/core/lib/common/cancellation';

/**
 * Code generation mode
 */
export enum CodeGenerationMode {
    /** Generate code from scratch */
    CREATE = 'create',
    /** Modify existing code */
    MODIFY = 'modify',
    /** Complete partial code */
    COMPLETE = 'complete',
    /** Fix issues in existing code */
    FIX = 'fix',
    /** Optimize existing code */
    OPTIMIZE = 'optimize',
    /** Add documentation to existing code */
    DOCUMENT = 'document',
    /** Generate test code */
    TEST = 'test'
}

/**
 * Code generation quality level
 */
export enum CodeQualityLevel {
    /** Fast generation with basic quality */
    DRAFT = 'draft',
    /** Balanced generation with good quality */
    STANDARD = 'standard',
    /** Thorough generation with high quality */
    PREMIUM = 'premium'
}

/**
 * Code generation template
 */
export interface CodeTemplate {
    /** Template ID */
    id: string;
    /** Template name */
    name: string;
    /** Template description */
    description: string;
    /** Template content */
    content: string;
    /** Programming language */
    language: string;
    /** Template variables */
    variables?: string[];
    /** Template tags */
    tags?: string[];
}

/**
 * Code generation request
 */
export interface CodeGenerationRequest {
    /** Generation prompt or description */
    prompt: string;
    /** Programming language */
    language: string;
    /** Generation mode */
    mode: CodeGenerationMode;
    /** Base code (for modification modes) */
    baseCode?: string;
    /** File path */
    filePath?: string;
    /** Code quality level */
    qualityLevel?: CodeQualityLevel;
    /** Template ID to use */
    templateId?: string;
    /** Template variables */
    templateVariables?: {[key: string]: string};
    /** Additional context */
    context?: {[key: string]: any};
    /** Generation options */
    options?: {
        /** Maximum number of tokens */
        maxTokens?: number;
        /** Temperature (0-1) */
        temperature?: number;
        /** Include comments */
        includeComments?: boolean;
        /** Include imports */
        includeImports?: boolean;
        /** Include types */
        includeTypes?: boolean;
        /** Include error handling */
        includeErrorHandling?: boolean;
        /** Code style to follow */
        codeStyle?: string;
        /** Additional options */
        [key: string]: any;
    };
}

/**
 * Code completion request
 */
export interface CodeCompletionRequest {
    /** Code prefix (before cursor) */
    prefix: string;
    /** Code suffix (after cursor) */
    suffix?: string;
    /** Programming language */
    language: string;
    /** File path */
    filePath: string;
    /** Cursor position */
    position: {
        /** Line number (0-based) */
        line: number;
        /** Character number (0-based) */
        character: number;
    };
    /** Maximum tokens to generate */
    maxTokens?: number;
    /** Temperature (0-1) */
    temperature?: number;
    /** Number of completions to generate */
    count?: number;
}

/**
 * Code modification request
 */
export interface CodeModificationRequest {
    /** Original code */
    originalCode: string;
    /** Modification prompt */
    prompt: string;
    /** Programming language */
    language: string;
    /** Modification mode */
    mode: 'fix' | 'refactor' | 'optimize' | 'document';
    /** File path */
    filePath?: string;
    /** Quality level */
    qualityLevel?: CodeQualityLevel;
    /** Modification options */
    options?: {[key: string]: any};
}

/**
 * Code test generation request
 */
export interface CodeTestGenerationRequest {
    /** Code to test */
    codeToTest: string;
    /** Programming language */
    language: string;
    /** Test framework to use */
    testFramework: string;
    /** File path */
    filePath?: string;
    /** Test style (unit, integration, e2e) */
    testStyle?: string;
    /** Additional testing requirements */
    requirements?: string;
    /** Options */
    options?: {[key: string]: any};
}

/**
 * Code generation result
 */
export interface CodeGenerationResult {
    /** Generated code */
    code: string;
    /** Request ID */
    requestId: string;
    /** Generation timestamp */
    timestamp: number;
    /** Generation information */
    info: {
        /** Generation mode used */
        mode: CodeGenerationMode;
        /** Quality level used */
        qualityLevel: CodeQualityLevel;
        /** Generation time in milliseconds */
        generationTimeMs: number;
        /** Model used */
        model: string;
        /** Template used (if any) */
        templateId?: string;
    };
    /** Explanation of the generated code */
    explanation?: string;
    /** Alternative generations */
    alternatives?: string[];
    /** Warnings or issues with the generated code */
    warnings?: string[];
    /** Additional metadata */
    metadata?: {[key: string]: any};
}

/**
 * Code generation error
 */
export interface CodeGenerationError {
    /** Error code */
    code: string;
    /** Error message */
    message: string;
    /** Request ID */
    requestId?: string;
    /** Additional error details */
    details?: any;
}

/**
 * Code completion result
 */
export interface CodeCompletionResult {
    /** Completion ID */
    id: string;
    /** Completed text */
    text: string;
    /** Insertion range */
    range?: {
        /** Start line */
        startLine: number;
        /** Start character */
        startCharacter: number;
        /** End line */
        endLine: number;
        /** End character */
        endCharacter: number;
    };
    /** Confidence score (0-1) */
    confidence: number;
    /** Display information */
    display?: {
        /** Pre-selection info */
        preselect?: boolean;
        /** Sort text */
        sortText?: string;
        /** Filter text */
        filterText?: string;
        /** Insert text */
        insertText?: string;
    };
}

/**
 * Code modification result
 */
export interface CodeModificationResult {
    /** Modified code */
    modifiedCode: string;
    /** Original code */
    originalCode: string;
    /** Diff of changes */
    diff?: string;
    /** Explanation of changes */
    explanation?: string;
    /** Issues fixed */
    issuesFixed?: string[];
}

/**
 * Generated test code result
 */
export interface CodeTestResult {
    /** Test code */
    testCode: string;
    /** Test framework used */
    testFramework: string;
    /** Coverage estimate */
    coverageEstimate?: {
        /** Percentage of code covered */
        percentage: number;
        /** Number of functions tested */
        functionsTested: number;
        /** Number of assertions */
        assertions: number;
    };
    /** Test cases generated */
    testCases?: string[];
    /** Setup code (if separate) */
    setupCode?: string;
}

/**
 * Service for generating code using AI models.
 * 
 * This service provides functionality to generate, complete, modify, and test code
 * using AI models like Claude. It abstracts the underlying AI model details
 * and provides a consistent interface for code generation tasks.
 * 
 * @example
 * ```typescript
 * // Get the code generation service
 * const codeGenService = container.get<CodeGenerationService>(CodeGenerationService);
 * 
 * // Generate a new function
 * const result = await codeGenService.generateCode({
 *   prompt: "Create a function that validates email addresses",
 *   language: "typescript",
 *   mode: CodeGenerationMode.CREATE
 * });
 * 
 * console.log(result.code);
 * // function validateEmail(email: string): boolean {
 * //   const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 * //   return regex.test(email);
 * // }
 * ```
 */
export interface CodeGenerationService extends Disposable {
    /**
     * Event fired when code generation starts
     */
    readonly onGenerationStarted: Event<string>;
    
    /**
     * Event fired when code generation completes
     */
    readonly onGenerationCompleted: Event<CodeGenerationResult>;
    
    /**
     * Event fired when code generation fails
     */
    readonly onGenerationFailed: Event<CodeGenerationError>;
    
    /**
     * Event fired when a code template is added or updated
     */
    readonly onTemplateChanged: Event<CodeTemplate>;
    
    /**
     * Initialize the code generation service.
     * 
     * @returns Promise that resolves when initialization is complete
     * 
     * @example
     * ```typescript
     * await codeGenService.initialize();
     * console.log("Code generation service initialized");
     * ```
     */
    initialize(): Promise<void>;
    
    /**
     * Generate code based on a prompt and specifications.
     * 
     * @param request - Code generation request
     * @param token - Optional cancellation token
     * @returns Promise that resolves to generated code result
     * 
     * @example
     * ```typescript
     * const result = await codeGenService.generateCode({
     *   prompt: "Create a React component for a user profile",
     *   language: "typescript",
     *   mode: CodeGenerationMode.CREATE,
     *   qualityLevel: CodeQualityLevel.PREMIUM,
     *   options: {
     *     includeComments: true,
     *     includeTypes: true
     *   }
     * });
     * ```
     */
    generateCode(
        request: CodeGenerationRequest, 
        token?: CancellationToken
    ): Promise<CodeGenerationResult>;
    
    /**
     * Complete code at a specific position.
     * 
     * @param request - Code completion request
     * @param token - Optional cancellation token
     * @returns Promise that resolves to array of code completion results
     * 
     * @example
     * ```typescript
     * const completions = await codeGenService.completeCode({
     *   prefix: "function calculateArea(radius) {\n  return ",
     *   language: "javascript",
     *   filePath: "/project/src/math.js",
     *   position: { line: 1, character: 10 },
     *   count: 3
     * });
     * 
     * // Get the best completion
     * const bestCompletion = completions[0];
     * ```
     */
    completeCode(
        request: CodeCompletionRequest, 
        token?: CancellationToken
    ): Promise<CodeCompletionResult[]>;
    
    /**
     * Modify existing code based on a prompt.
     * 
     * @param request - Code modification request
     * @param token - Optional cancellation token
     * @returns Promise that resolves to code modification result
     * 
     * @example
     * ```typescript
     * const result = await codeGenService.modifyCode({
     *   originalCode: "function add(a, b) { return a + b; }",
     *   prompt: "Add TypeScript types to this function",
     *   language: "typescript",
     *   mode: "refactor"
     * });
     * 
     * console.log(result.modifiedCode);
     * // function add(a: number, b: number): number { return a + b; }
     * ```
     */
    modifyCode(
        request: CodeModificationRequest, 
        token?: CancellationToken
    ): Promise<CodeModificationResult>;
    
    /**
     * Generate test code for a given implementation.
     * 
     * @param request - Test generation request
     * @param token - Optional cancellation token
     * @returns Promise that resolves to test code result
     * 
     * @example
     * ```typescript
     * const testResult = await codeGenService.generateTests({
     *   codeToTest: "function isPrime(n) { ... }",
     *   language: "javascript",
     *   testFramework: "jest",
     *   testStyle: "unit"
     * });
     * 
     * console.log(testResult.testCode);
     * ```
     */
    generateTests(
        request: CodeTestGenerationRequest, 
        token?: CancellationToken
    ): Promise<CodeTestResult>;
    
    /**
     * Get available code templates.
     * 
     * @param language - Optional language filter
     * @returns Array of available code templates
     * 
     * @example
     * ```typescript
     * // Get all TypeScript templates
     * const tsTemplates = codeGenService.getTemplates("typescript");
     * 
     * // Display available templates
     * for (const template of tsTemplates) {
     *   console.log(`${template.name}: ${template.description}`);
     * }
     * ```
     */
    getTemplates(language?: string): CodeTemplate[];
    
    /**
     * Get a specific code template by ID.
     * 
     * @param templateId - Template ID
     * @returns Template if found, undefined otherwise
     * 
     * @example
     * ```typescript
     * const template = codeGenService.getTemplateById("react-component");
     * if (template) {
     *   console.log(`Template found: ${template.name}`);
     * }
     * ```
     */
    getTemplateById(templateId: string): CodeTemplate | undefined;
    
    /**
     * Add or update a code template.
     * 
     * @param template - Code template to add or update
     * @returns Promise that resolves when the template is saved
     * 
     * @example
     * ```typescript
     * await codeGenService.saveTemplate({
     *   id: "express-route",
     *   name: "Express Route",
     *   description: "Basic Express route handler",
     *   language: "javascript",
     *   content: "router.{{method}}('{{path}}', (req, res) => {\n  // {{description}}\n});",
     *   variables: ["method", "path", "description"]
     * });
     * ```
     */
    saveTemplate(template: CodeTemplate): Promise<void>;
    
    /**
     * Delete a code template.
     * 
     * @param templateId - ID of the template to delete
     * @returns Promise that resolves when the template is deleted
     * 
     * @example
     * ```typescript
     * await codeGenService.deleteTemplate("old-template");
     * ```
     */
    deleteTemplate(templateId: string): Promise<void>;
    
    /**
     * Estimate the quality of generated code.
     * 
     * @param code - Code to evaluate
     * @param language - Programming language
     * @returns Promise that resolves to a quality score (0-1)
     * 
     * @example
     * ```typescript
     * const quality = await codeGenService.evaluateCodeQuality(
     *   "function add(a, b) { return a + b; }",
     *   "javascript"
     * );
     * 
     * console.log(`Code quality score: ${quality}`);
     * ```
     */
    evaluateCodeQuality(code: string, language: string): Promise<number>;
    
    /**
     * Get the explanation for a piece of code.
     * 
     * @param code - Code to explain
     * @param language - Programming language
     * @param detailLevel - Level of detail (basic, standard, detailed)
     * @returns Promise that resolves to code explanation
     * 
     * @example
     * ```typescript
     * const explanation = await codeGenService.explainCode(
     *   "const result = array.map(x => x * 2).filter(x => x > 10);",
     *   "javascript",
     *   "detailed"
     * );
     * 
     * console.log(explanation);
     * ```
     */
    explainCode(
        code: string, 
        language: string, 
        detailLevel?: 'basic' | 'standard' | 'detailed'
    ): Promise<string>;
    
    /**
     * Set preferences for code generation.
     * 
     * @param preferences - Code generation preferences
     * @returns Promise that resolves when preferences are updated
     * 
     * @example
     * ```typescript
     * await codeGenService.setPreferences({
     *   defaultLanguage: "typescript",
     *   defaultQualityLevel: CodeQualityLevel.PREMIUM,
     *   includeComments: true,
     *   codeStyle: "google"
     * });
     * ```
     */
    setPreferences(preferences: {[key: string]: any}): Promise<void>;
    
    /**
     * Get current code generation preferences.
     * 
     * @returns Current preferences
     * 
     * @example
     * ```typescript
     * const prefs = codeGenService.getPreferences();
     * console.log(`Default language: ${prefs.defaultLanguage}`);
     * ```
     */
    getPreferences(): {[key: string]: any};
}