# Context7 Integration for CodeVibeAI

This package provides integration with the Context7 API for the CodeVibeAI platform. It enables access to library documentation, code examples, and other contextual programming information.

## Features

- Library search with filters and pagination
- Documentation retrieval
- Code examples for specific functions
- Related libraries discovery
- Authentication with API keys
- Rate limiting management
- Retry logic for temporary failures

## Configuration

The Context7 client requires an API key for authentication. Set the API key using the `CONTEXT7_API_KEY` environment variable:

```bash
export CONTEXT7_API_KEY=your-api-key-here
```

## Usage

The Context7 service can be accessed in the frontend using dependency injection:

```typescript
@inject(Context7Service)
protected readonly context7Service: Context7Service;

// Example usage
async searchLibraries(query: string): Promise<void> {
    try {
        const results = await this.context7Service.searchLibraries(query, {
            limit: 10,
            sort: 'relevance'
        });
        
        // Process results
        console.log(`Found ${results.libraries.length} libraries`);
    } catch (error) {
        console.error('Error searching libraries:', error);
    }
}
```

## API

The Context7 service provides the following methods:

### searchLibraries(query, options)

Search for libraries in the Context7 knowledge base.

```typescript
const results = await context7Service.searchLibraries('react', {
    limit: 10,
    offset: 0,
    filters: {
        language: ['javascript']
    },
    sort: 'popularity'
});
```

### getLibraryDocumentation(libraryName, version?)

Get documentation for a specific library, optionally for a specific version.

```typescript
const documentation = await context7Service.getLibraryDocumentation('react', '18.0.0');
```

### findCodeExamples(libraryName, functionName)

Find code examples for a specific function in a library.

```typescript
const examples = await context7Service.findCodeExamples('react', 'useState');
```

### getRelatedLibraries(libraryName)

Get related libraries for a specific library.

```typescript
const relatedLibraries = await context7Service.getRelatedLibraries('react');
```

## Testing

To run the tests:

```bash
cd packages/context7-integration
yarn test
```

## License

This package is licensed under the EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0.