/**
 * CodeVibeAI Prompt Templates System
 * 
 * This module provides optimized templates for AI-assisted coding tasks.
 */

// Template Engine
export * from './template-engine';

// A/B Testing
export * from './template-ab-testing';

// Template Types
import codeGenerationTemplate from './code-generation.template';
import codeCompletionTemplate from './code-completion.template';
import codeExplanationTemplate from './code-explanation.template';
import codeRefactoringTemplate from './code-refactoring.template';
import debuggingTemplate from './debugging.template';

// System Templates
import codeGenerationSystemTemplate from './code-generation.system.template';
import codeCompletionSystemTemplate from './code-completion.system.template';
import codeExplanationSystemTemplate from './code-explanation.system.template';
import codeRefactoringSystemTemplate from './code-refactoring.system.template';
import debuggingSystemTemplate from './debugging.system.template';

// Variants
import codeGenerationTemplateVariantB from './code-generation.variant-b.template';

/**
 * Available templates.
 * 
 * This object provides access to all template strings.
 */
export const templates = {
    // Main templates
    codeGeneration: codeGenerationTemplate,
    codeCompletion: codeCompletionTemplate,
    codeExplanation: codeExplanationTemplate,
    codeRefactoring: codeRefactoringTemplate,
    debugging: debuggingTemplate,
    
    // System templates
    system: {
        codeGeneration: codeGenerationSystemTemplate,
        codeCompletion: codeCompletionSystemTemplate,
        codeExplanation: codeExplanationSystemTemplate,
        codeRefactoring: codeRefactoringSystemTemplate,
        debugging: debuggingSystemTemplate
    },
    
    // Variants for A/B testing
    variants: {
        codeGeneration: {
            B: codeGenerationTemplateVariantB
        }
    }
};

/**
 * Template names enumeration.
 * 
 * Use these constants to reference templates when calling TemplateEngine.render().
 */
export enum TemplateName {
    CODE_GENERATION = 'code-generation',
    CODE_COMPLETION = 'code-completion',
    CODE_EXPLANATION = 'code-explanation',
    CODE_REFACTORING = 'code-refactoring',
    DEBUGGING = 'debugging'
}

/**
 * Template variants enumeration.
 * 
 * Use these constants to reference template variants in A/B testing.
 */
export enum TemplateVariantName {
    A = 'A',
    B = 'B',
    C = 'C',
    D = 'D'
}