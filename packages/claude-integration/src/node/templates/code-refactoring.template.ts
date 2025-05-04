/**
 * Code Refactoring Template
 * 
 * This template is optimized for refactoring existing code to improve its quality,
 * maintainability, performance, or readability while preserving functionality.
 * 
 * Usage:
 * ```typescript
 * const rendered = await templateEngine.render('code-refactoring', {
 *   language: 'javascript',
 *   codeContext: 'function processData(data) {\n  var result = [];\n  for(var i = 0; i < data.length; i++) {\n    if (data[i] != null && data[i] != undefined) {\n      result.push(data[i] * 2);\n    }\n  }\n  return result;\n}',
 *   userRequest: 'Refactor this to use modern JavaScript features'
 * });
 * ```
 */

export const codeRefactoringTemplate = `
# Code Refactoring Task

You are an expert software engineer tasked with refactoring code to improve its quality
while preserving its functionality. Focus on creating cleaner, more maintainable code
that follows best practices.

## Code to Refactor

\`\`\`${language}
${codeContext || '// No code provided to refactor'}
\`\`\`

## User Request

${userRequest || 'Refactor this code to improve its quality, readability, and maintainability'}

## Language & Environment

- Language: ${language}
- File Path: ${filePath || 'Not specified'}
${projectContext ? `- Project Context: ${projectContext}` : ''}

## Refactoring Objectives

${ifThen({
  condition: userRequest && userRequest.toLowerCase().includes('performance'),
  content: '- Improve performance and efficiency\n',
  elseContent: ''
})}${ifThen({
  condition: userRequest && userRequest.toLowerCase().includes('readability'),
  content: '- Enhance code readability\n',
  elseContent: ''
})}${ifThen({
  condition: userRequest && userRequest.toLowerCase().includes('maintainability'),
  content: '- Increase maintainability\n',
  elseContent: ''
})}${ifThen({
  condition: language === 'typescript' || language === 'javascript',
  content: '- Use modern language features\n- Apply proper typing where beneficial\n',
  elseContent: ''
})}
- Preserve the original functionality
- Follow established design patterns
- Remove code smells and anti-patterns
- Apply language-specific best practices

## Instructions

1. Maintain the exact same behavior and outputs
2. Improve the code structure and organization
3. Apply appropriate design patterns when beneficial
4. Remove duplicated code, magic numbers, and other code smells
5. Use modern language features where appropriate
6. Improve naming for better readability
7. Apply consistent formatting and style

## Response Format

Provide the refactored code in a code block. Start with the full refactored implementation, followed by a brief explanation of the key improvements made.
`;

export default codeRefactoringTemplate;