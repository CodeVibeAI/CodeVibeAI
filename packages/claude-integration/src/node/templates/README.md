# CodeVibeAI Prompt Templates

This module provides optimized prompt templates for Claude AI interactions in CodeVibeAI. These templates are designed to enhance AI responses for various coding tasks by providing structured, consistent prompts with appropriate context.

## Overview

The template system provides:

- Type-safe template rendering with TypeScript
- Context-aware prompt generation
- Customizable templates for different coding tasks
- Support for system prompts and regular prompts
- A/B testing capabilities for prompt optimization
- Multi-language support

## Template Types

Each template is optimized for a specific coding task:

1. **Code Generation** - Creating new code based on requirements
2. **Code Completion** - Continuing partially written code
3. **Code Explanation** - Explaining how code works
4. **Code Refactoring** - Improving existing code quality
5. **Debugging** - Identifying and fixing bugs

## Usage

### Basic Usage

```typescript
import { TemplateEngine, TemplateContext } from './templates/template-engine';

// Render a template with context
const templateEngine = new TemplateEngine();
const context: TemplateContext = {
  language: 'typescript',
  userRequest: 'Create a function to sort objects by property',
  codeContext: '// Existing code here...'
};

const rendered = await templateEngine.render('code-generation', context, {
  useSystemPrompt: true,
  modelPreferences: {
    temperature: 0.7,
    maxTokens: 2000
  }
});

// Use the rendered content in Claude API requests
const response = await claudeService.complete({
  prompt: rendered.prompt,
  systemPrompt: rendered.systemPrompt,
  options: rendered.options
});
```

### A/B Testing

```typescript
// Create an experiment
const experimentId = 'code-gen-experiment-2023-06-01';

// Test variant A vs B
const renderedA = await templateEngine.render('code-generation', context, {
  experimentId,
  variant: 'A'
});

const renderedB = await templateEngine.render('code-generation', context, {
  experimentId,
  variant: 'B'
});

// Log metrics for each variant
await metricsService.logTemplateUsage({
  templateName: 'code-generation',
  experimentId,
  variant: 'A',
  responseQuality: 4.5, // determined through feedback
  responseTime: 1200,    // ms to generate
  tokenCount: 350        // tokens used
});
```

## Template Structure

Each template consists of:

1. Main template file (`*.template.ts`)
2. Optional system prompt file (`*.system.template.ts`)
3. A/B testing variants (optional)

### Template Variables

Templates support variable interpolation using `${variableName}` syntax.

Common context variables:

- `language` - Programming language (typescript, python, etc.)
- `codeContext` - Existing code or surrounding code context
- `userRequest` - The specific request from the user
- `filePath` - Path to the file being worked on
- `projectContext` - Information about the project
- `errorMessage` - For debugging templates

### Helper Functions

Templates can use helper functions:

```
${ifThen({
  condition: language === 'typescript',
  content: 'Apply proper TypeScript types',
  elseContent: 'Ensure type safety where possible'
})}
```

Available helpers:

- String manipulation: `trim`, `upperCase`, `lowerCase`, `capitalize`
- Code formatting: `formatIndentation`, `stripComments`
- Conditionals: `ifThen`, `switch`
- Language helpers: `getLanguageCommentStyle`, `getPrimaryFileExtension`
- A/B testing: `selectVariant`

## Extending the System

### Creating New Templates

1. Create a new `*.template.ts` file
2. Export the template string literal
3. (Optional) Create a matching `*.system.template.ts` for system prompts
4. Register A/B testing variants if needed

### Custom Helper Functions

You can register custom helper functions:

```typescript
templateEngine.registerHelper('customFunction', (param1, param2) => {
  // Custom logic
  return `Processed result for ${param1} and ${param2}`;
});
```

## Best Practices

1. Keep templates focused on specific tasks
2. Use consistent formatting and structure
3. Include explicit instructions for AI
4. Prioritize information most relevant to the task
5. Regularly test and optimize templates based on performance
6. Use A/B testing to validate improvements

## Template Maintenance

Regular reviews should:

1. Evaluate template effectiveness
2. Incorporate user feedback
3. Update as Claude capabilities evolve
4. Remove underperforming variants
5. Maintain documentation