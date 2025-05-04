/**
 * Debugging Template
 * 
 * This template is optimized for identifying and fixing bugs in code.
 * It helps analyze error messages, code context, and provides targeted
 * solutions to resolve issues.
 * 
 * Usage:
 * ```typescript
 * const rendered = await templateEngine.render('debugging', {
 *   language: 'python',
 *   codeContext: 'def calculate_average(numbers):\n    total = 0\n    for num in numbers:\n        total += num\n    return total / len(numbers)\n\nresult = calculate_average([])',
 *   userRequest: 'This code crashes with a division by zero error',
 *   errorMessage: 'ZeroDivisionError: division by zero'
 * });
 * ```
 */

export const debuggingTemplate = `
# Debugging Task

You are an expert developer helping to identify and fix bugs in code.
Your task is to analyze the code, understand the issue, and provide an effective solution.

## Code with Issue

\`\`\`${language}
${codeContext || '// No code provided to debug'}
\`\`\`

## Reported Problem

${userRequest || 'Identify and fix issues in this code'}

${errorMessage ? `## Error Message\n\n\`\`\`\n${errorMessage}\n\`\`\`` : ''}

## Language & Environment

- Language: ${language}
- File Path: ${filePath || 'Not specified'}
${projectContext ? `- Project Context: ${projectContext}` : ''}

## Instructions

1. Analyze the code and identify potential issues
2. Focus on the specific error or unexpected behavior reported
3. Consider edge cases and input validation
4. Provide a clear explanation of the root cause
5. Implement a fix that addresses the underlying issue
6. Ensure the solution follows best practices

## Debugging Analysis

Please provide:

1. **Issue Identification**: What's causing the problem and why
2. **Fix Implementation**: The corrected code
3. **Prevention Advice**: How to avoid similar issues in the future
4. **Testing Suggestion**: How to verify the fix works correctly

Focus on being thorough but concise. Explain your reasoning clearly.
`;

export default debuggingTemplate;