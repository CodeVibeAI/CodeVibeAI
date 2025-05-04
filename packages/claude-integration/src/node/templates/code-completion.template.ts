/**
 * Code Completion Template
 * 
 * This template is optimized for completing code based on the existing context.
 * It provides accurate and contextually appropriate code suggestions that match
 * the style and patterns in the codebase.
 * 
 * Usage:
 * ```typescript
 * const rendered = await templateEngine.render('code-completion', {
 *   language: 'typescript',
 *   codeContext: 'function calculateTotal(items) {\n  return ',
 *   filePath: '/path/to/file.ts',
 *   userRequest: 'Complete this function to sum the price property of all items'
 * });
 * ```
 */

export const codeCompletionTemplate = `
# Code Completion Task

You are an AI coding assistant helping to complete code in the middle of development.
Your task is to provide the most logical and idiomatic code continuation based on the provided context.

## Code to Complete

\`\`\`${language}
${codeContext || '// No code context provided'}
\`\`\`

## User Request

${userRequest || 'Complete the code above in a logical way'}

## Context Information

- Language: ${language}
- File Path: ${filePath || 'Not specified'}
${projectContext ? `- Project Context: ${projectContext}` : ''}

## Instructions

1. Continue the code from where it leaves off
2. Match the existing coding style and patterns
3. Consider variable and function names already in use
4. Maintain consistent indentation and formatting
5. Be mindful of scoping and context
6. Include any necessary closing brackets, parentheses, etc.
7. Only provide the completion, not the entire code

## Response Format

Provide only the code completion without any explanation or comments.
Your completion should start exactly where the provided code snippet ends.
`;

export default codeCompletionTemplate;