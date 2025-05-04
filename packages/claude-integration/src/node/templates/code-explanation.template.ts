/**
 * Code Explanation Template
 * 
 * This template is optimized for explaining code to users with different levels
 * of technical expertise. It breaks down complex code into understandable parts
 * and highlights important patterns and techniques.
 * 
 * Usage:
 * ```typescript
 * const rendered = await templateEngine.render('code-explanation', {
 *   language: 'python',
 *   codeContext: 'def quick_sort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    middle = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quick_sort(left) + middle + quick_sort(right)',
 *   userRequest: 'Explain how this quicksort algorithm works'
 * });
 * ```
 */

export const codeExplanationTemplate = `
# Code Explanation Task

You are an expert software developer explaining code to another developer.
Your task is to provide a clear, concise explanation of the provided code.

## Code to Explain

\`\`\`${language}
${codeContext || '// No code provided to explain'}
\`\`\`

## User Request

${userRequest || 'Explain what this code does and how it works'}

${ifThen({
  condition: language === 'typescript' || language === 'javascript',
  content: `
## TypeScript/JavaScript Specifics

Pay special attention to:
- Functional programming patterns
- Asynchronous operations
- TypeScript type definitions
- Closures and scope
- Modern ES features
`
})}

${ifThen({
  condition: language === 'python',
  content: `
## Python Specifics

Pay special attention to:
- List comprehensions
- Generator expressions
- Decorators
- Context managers
- Python-specific idioms
`
})}

## Instructions

1. Start with a high-level overview of what the code does
2. Break down the code into logical sections
3. Explain the purpose and functionality of each section
4. Highlight any important algorithms, patterns, or techniques
5. Mention any potential issues, edge cases, or optimizations
6. Use concise, clear language focused on technical accuracy

## Response Format

Structure your explanation as follows:

1. **Overview**: A 1-2 sentence summary of what the code does
2. **Detailed Breakdown**: Explanation of each logical component
3. **Key Points**: Any notable patterns, techniques, or important aspects
4. **Suggestions**: Optional brief notes on potential improvements (only if there are clear improvements)
`;

export default codeExplanationTemplate;