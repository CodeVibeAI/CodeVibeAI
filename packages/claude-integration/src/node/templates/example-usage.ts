/**
 * Example usage of the template system
 * 
 * This file demonstrates how to use the template system in your code.
 * It's not meant to be imported or used directly.
 */

import { Container } from 'inversify';
import { ILogger } from '@theia/core';

import { ClaudeCodeService, ClaudeCompletionRequest } from '../../common/claude-code-protocol';
import { TemplateEngine, TemplateContext, TemplateName, TemplateABTesting, VariantSelectionStrategy } from './index';

/**
 * Example: Basic template usage
 */
async function basicTemplateUsage(
    templateEngine: TemplateEngine,
    claudeService: ClaudeCodeService,
    logger: ILogger
) {
    try {
        // Define context for the template
        const context: TemplateContext = {
            language: 'typescript',
            userRequest: 'Create a function to sort an array of objects by a property name',
            codeContext: `// Utility functions for array operations
import { isNil } from './utils';

// Other utility functions
export function isEmpty(arr: any[]): boolean {
  return !arr || arr.length === 0;
}
`
        };
        
        // Render the template
        const rendered = await templateEngine.render(
            TemplateName.CODE_GENERATION, 
            context,
            { useSystemPrompt: true }
        );
        
        // Use the rendered template with Claude service
        const request: ClaudeCompletionRequest = {
            prompt: rendered.prompt,
            options: {
                systemPrompt: rendered.systemPrompt,
                ...rendered.options
            }
        };
        
        // Call Claude API
        const response = await claudeService.complete(request);
        
        logger.info(`Generated code: ${response.content}`);
        return response.content;
    } catch (error) {
        logger.error('Template usage error:', error);
        throw error;
    }
}

/**
 * Example: A/B testing with templates
 */
async function abTestingExample(
    templateEngine: TemplateEngine,
    abTesting: TemplateABTesting,
    claudeService: ClaudeCodeService,
    logger: ILogger
) {
    try {
        // Set up experiment if it doesn't exist
        let experimentId = 'code-gen-exp-2023-06';
        let experiment = abTesting.getExperiment(experimentId);
        
        if (!experiment) {
            experiment = await abTesting.createExperiment({
                name: 'Code Generation Improvements',
                templateType: TemplateName.CODE_GENERATION,
                variants: ['A', 'B'],
                distribution: { 'A': 50, 'B': 50 }
            });
            experimentId = experiment.id;
        }
        
        // Define context for the template
        const context: TemplateContext = {
            language: 'typescript',
            userRequest: 'Create a function to calculate the average of numbers in an array',
            codeContext: `// Math utility functions
export function sum(numbers: number[]): number {
  return numbers.reduce((total, num) => total + num, 0);
}
`
        };
        
        // Select variant for this user/session
        const userId = 'user-123'; // In real usage, this would be the actual user ID
        const variant = abTesting.selectVariant(
            experimentId,
            userId,
            VariantSelectionStrategy.USER_CONSISTENT
        );
        
        // Render the selected template variant
        const rendered = await templateEngine.render(
            TemplateName.CODE_GENERATION, 
            context,
            { 
                useSystemPrompt: true,
                experimentId,
                variant
            }
        );
        
        // Use the rendered template with Claude service
        const request: ClaudeCompletionRequest = {
            prompt: rendered.prompt,
            options: {
                systemPrompt: rendered.systemPrompt,
                ...rendered.options
            }
        };
        
        // Measure response time
        const startTime = Date.now();
        const response = await claudeService.complete(request);
        const responseTime = Date.now() - startTime;
        
        // Log metrics for this template usage
        await abTesting.logTemplateUsage({
            templateName: TemplateName.CODE_GENERATION,
            experimentId,
            variant,
            userId,
            responseTime,
            tokenCount: response.usage.totalTokens,
            // These would be collected from user feedback in a real app
            responseQuality: 4.5,
            accepted: true
        });
        
        logger.info(`Generated code (variant ${variant}): ${response.content}`);
        return response.content;
    } catch (error) {
        logger.error('A/B testing error:', error);
        throw error;
    }
}

/**
 * Example: Using different templates for different tasks
 */
async function multiTemplateExample(
    templateEngine: TemplateEngine,
    claudeService: ClaudeCodeService
) {
    // Code generation
    const generationContext: TemplateContext = {
        language: 'python',
        userRequest: 'Create a function to parse CSV data'
    };
    
    const generationRendered = await templateEngine.render(
        TemplateName.CODE_GENERATION, 
        generationContext,
        { useSystemPrompt: true }
    );
    
    // Code explanation
    const explanationContext: TemplateContext = {
        language: 'javascript',
        userRequest: 'Explain how this function works',
        codeContext: `function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}`
    };
    
    const explanationRendered = await templateEngine.render(
        TemplateName.CODE_EXPLANATION, 
        explanationContext,
        { useSystemPrompt: true }
    );
    
    // Debugging
    const debuggingContext: TemplateContext = {
        language: 'typescript',
        userRequest: 'Fix the bug in this code',
        codeContext: `function findDuplicates(arr: string[]): string[] {
  const seen = {};
  const duplicates = [];
  
  for (const item of arr) {
    if (seen[item]) {
      duplicates.push(item);
    } else {
      seen[item] = true;
    }
  }
  
  return duplicates;
}`,
        errorMessage: 'TypeError: seen[item] is not a function'
    };
    
    const debuggingRendered = await templateEngine.render(
        TemplateName.DEBUGGING, 
        debuggingContext,
        { useSystemPrompt: true }
    );
    
    // In a real application, you would use these rendered templates with Claude
}

/**
 * This is just an example file demonstrating how to use the template system.
 * In a real application, you would inject these services via the container.
 */