/**
 * Code Generation Template - Variant B
 * 
 * This is an alternative version of the code generation template
 * with a different prompt structure focused on specific examples and guidelines.
 * 
 * This variant emphasizes:
 * - More specific guidelines on code style and patterns
 * - Example code for reference
 * - More structured output expectations
 */

export const codeGenerationTemplateVariantB = `
# Code Generation Request

I need you to write code that satisfies the following requirements. Focus on writing high-quality,
production-ready code that follows best practices for ${language}.

## Requirements

${userRequest}

## Context

- Language: ${language}
- File: ${filePath || 'New file'}
${projectContext ? `- Project: ${projectContext}` : ''}

## Guidelines

- Write clean, self-documenting code with minimal comments
- Follow consistent naming conventions (${language === 'typescript' || language === 'javascript' ? 'camelCase for variables/functions, PascalCase for classes' : ''})
- Handle errors and edge cases appropriately
- Keep functions focused and concise
- Avoid unnecessary dependencies
${language === 'typescript' ? '- Use proper TypeScript types and interfaces\n- Prefer explicit types over "any"' : ''}

## Existing Code (for context)

\`\`\`${language}
${codeContext || '// No existing code provided'}
\`\`\`

## Output Format

Generate only the implementation code without explanation. Your code should be ready to use directly. 
If appropriate, organize the code into logical functions or classes. Include necessary imports.

Begin your implementation immediately without introduction.
`;

export default codeGenerationTemplateVariantB;