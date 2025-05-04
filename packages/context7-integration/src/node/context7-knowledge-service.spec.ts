import { Container } from 'inversify';
import { ILogger } from '@theia/core';
import { Context7KnowledgeService, CodeContext, SymbolContext } from './context7-knowledge-service';
import { Context7Client } from './context7-client';
import { 
    ApiDocumentation, 
    Documentation, 
    LibraryInfo,
    CodeExample
} from '../common/context7-protocol';

describe('Context7KnowledgeService', () => {
    let container: Container;
    let knowledgeService: Context7KnowledgeService;
    let mockContext7Client: jest.Mocked<Context7Client>;
    let mockLogger: jest.Mocked<ILogger>;
    
    // Mock data
    const mockLibraries: LibraryInfo[] = [
        {
            name: 'react',
            description: 'A JavaScript library for building user interfaces',
            version: '18.2.0',
            language: 'javascript',
            category: ['frontend', 'ui'],
            stars: 200000,
            lastUpdated: '2023-06-15',
            homepage: 'https://reactjs.org'
        },
        {
            name: 'lodash',
            description: 'A modern JavaScript utility library',
            version: '4.17.21',
            language: 'javascript',
            category: ['utilities'],
            stars: 50000,
            lastUpdated: '2023-03-10',
            homepage: 'https://lodash.com'
        },
        {
            name: 'axios',
            description: 'Promise based HTTP client for the browser and node.js',
            version: '1.6.0',
            language: 'typescript',
            category: ['http', 'client'],
            stars: 98000,
            lastUpdated: '2023-05-20',
            homepage: 'https://axios-http.com'
        }
    ];
    
    const mockApiDocumentation: ApiDocumentation[] = [
        {
            name: 'useState',
            type: 'function',
            description: 'A hook that lets you add React state to function components',
            signature: 'function useState<T>(initialValue: T): [T, (newValue: T) => void]',
            parameters: [
                {
                    name: 'initialValue',
                    type: 'T',
                    description: 'The initial state value',
                    isOptional: false
                }
            ],
            returnType: '[T, (newValue: T) => void]',
            returnDescription: 'A stateful value and a function to update it',
            examples: ['const [count, setCount] = useState(0)']
        },
        {
            name: 'map',
            type: 'function',
            description: 'Creates an array of values by running each element through iteratee',
            signature: 'function map<T, U>(array: T[], iteratee: (value: T) => U): U[]',
            parameters: [
                {
                    name: 'array',
                    type: 'T[]',
                    description: 'The array to iterate over',
                    isOptional: false
                },
                {
                    name: 'iteratee',
                    type: '(value: T) => U',
                    description: 'The function invoked per iteration',
                    isOptional: false
                }
            ],
            returnType: 'U[]',
            returnDescription: 'Returns the new mapped array',
            examples: ['_.map([1, 2, 3], x => x * 2)']
        }
    ];
    
    const mockDocumentation: Documentation = {
        overview: 'React is a JavaScript library for building user interfaces',
        sections: [
            { title: 'Getting Started', content: 'To install React...' }
        ],
        api: [mockApiDocumentation[0]]
    };
    
    const mockCodeExamples: CodeExample[] = [
        {
            id: '123',
            code: 'const [count, setCount] = useState(0);\n\nreturn (\n  <div>\n    <p>Count: {count}</p>\n    <button onClick={() => setCount(count + 1)}>Increment</button>\n  </div>\n);',
            description: 'Basic counter with useState',
            source: 'React docs',
            library: 'react',
            libraryVersion: '18.2.0',
            language: 'javascript',
            function: 'useState'
        },
        {
            id: '456',
            code: 'const namesArray = _.map(users, user => user.name);',
            description: 'Extract names from user objects',
            source: 'Lodash docs',
            library: 'lodash',
            libraryVersion: '4.17.21',
            language: 'javascript',
            function: 'map'
        }
    ];
    
    // Mock responses
    const mockSearchLibrariesResponse = {
        success: true,
        libraries: mockLibraries,
        pagination: {
            limit: 10,
            offset: 0,
            total: 3
        }
    };
    
    const mockLibraryDocumentationResponse = {
        success: true,
        library: mockLibraries[0],
        documentation: mockDocumentation
    };
    
    const mockCodeExamplesResponse = {
        success: true,
        examples: [mockCodeExamples[0]],
        pagination: {
            limit: 10,
            offset: 0,
            total: 1
        }
    };
    
    const mockRelatedLibrariesResponse = {
        success: true,
        libraries: [mockLibraries[1]]
    };
    
    beforeEach(() => {
        // Create mocks
        mockContext7Client = {
            isAuthenticated: jest.fn(),
            setApiKey: jest.fn(),
            searchLibraries: jest.fn(),
            getLibraryDocumentation: jest.fn(),
            findCodeExamples: jest.fn(),
            getRelatedLibraries: jest.fn()
        } as unknown as jest.Mocked<Context7Client>;
        
        mockLogger = {
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            debug: jest.fn(),
            trace: jest.fn(),
            fatal: jest.fn(),
            setLogLevel: jest.fn(),
            getLogLevel: jest.fn(),
            isEnabled: jest.fn(),
            ifEnabled: jest.fn(),
            isTrace: jest.fn(),
            isDebug: jest.fn(),
            isInfo: jest.fn(),
            isWarn: jest.fn(),
            isError: jest.fn(),
            isFatal: jest.fn(),
            child: jest.fn()
        } as unknown as jest.Mocked<ILogger>;
        
        // Create container
        container = new Container();
        container.bind(ILogger).toConstantValue(mockLogger);
        container.bind(Context7Client).toConstantValue(mockContext7Client);
        container.bind(Context7KnowledgeService).toSelf().inSingletonScope();
        
        // Get service instance
        knowledgeService = container.get(Context7KnowledgeService);
        
        // Setup mocks
        mockContext7Client.searchLibraries.mockResolvedValue(mockSearchLibrariesResponse);
        mockContext7Client.getLibraryDocumentation.mockResolvedValue(mockLibraryDocumentationResponse);
        mockContext7Client.findCodeExamples.mockResolvedValue(mockCodeExamplesResponse);
        mockContext7Client.getRelatedLibraries.mockResolvedValue(mockRelatedLibrariesResponse);
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });
    
    describe('findDocumentationForSymbol', () => {
        it('should find documentation for a symbol with context', async () => {
            const context: SymbolContext = {
                symbolName: 'useState',
                language: 'javascript',
                imports: ["import { useState } from 'react'"],
                sourceFile: 'app.js'
            };
            
            const results = await knowledgeService.findDocumentationForSymbol('useState', context);
            
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].symbolName).toBe('useState');
            expect(results[0].library.name).toBe('react');
            expect(results[0].documentation).toBeDefined();
            expect(mockContext7Client.searchLibraries).toHaveBeenCalled();
            expect(mockContext7Client.getLibraryDocumentation).toHaveBeenCalled();
        });
        
        it('should handle empty results', async () => {
            // Mock empty search results
            mockContext7Client.searchLibraries.mockResolvedValueOnce({
                success: true,
                libraries: [],
                pagination: {
                    limit: 10,
                    offset: 0,
                    total: 0
                }
            });
            
            const context: SymbolContext = {
                symbolName: 'nonExistentFunction',
                language: 'javascript',
                imports: [],
                sourceFile: 'app.js'
            };
            
            const results = await knowledgeService.findDocumentationForSymbol('nonExistentFunction', context);
            
            expect(results.length).toBe(0);
            expect(mockContext7Client.searchLibraries).toHaveBeenCalled();
            expect(mockContext7Client.getLibraryDocumentation).not.toHaveBeenCalled();
        });
        
        it('should handle errors gracefully', async () => {
            mockContext7Client.searchLibraries.mockRejectedValueOnce(new Error('API error'));
            
            const context: SymbolContext = {
                symbolName: 'useState',
                language: 'javascript',
                imports: [],
                sourceFile: 'app.js'
            };
            
            const results = await knowledgeService.findDocumentationForSymbol('useState', context);
            
            expect(results.length).toBe(0);
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });
    
    describe('suggestLibraries', () => {
        it('should suggest libraries based on code context', async () => {
            const codeContext: CodeContext = {
                language: 'javascript',
                imports: [],
                codeSnippet: 'function App() { const [count, setCount] = useState(0); return <div>{count}</div>; }'
            };
            
            const suggestions = await knowledgeService.suggestLibraries(codeContext);
            
            expect(suggestions.length).toBeGreaterThan(0);
            expect(suggestions[0].library).toBeDefined();
            expect(suggestions[0].reason).toBeDefined();
            expect(suggestions[0].importExample).toBeDefined();
            expect(mockContext7Client.searchLibraries).toHaveBeenCalled();
        });
        
        it('should not suggest already imported libraries', async () => {
            const codeContext: CodeContext = {
                language: 'javascript',
                imports: ["import React from 'react'", "import { useState } from 'react'"],
                codeSnippet: 'function App() { const [count, setCount] = useState(0); return <div>{count}</div>; }'
            };
            
            // Call the method
            const suggestions = await knowledgeService.suggestLibraries(codeContext);
            
            // Verify that react is not in the suggestions
            const reactSuggestion = suggestions.find(s => s.library.name === 'react');
            expect(reactSuggestion).toBeUndefined();
        });
        
        it('should handle errors gracefully', async () => {
            mockContext7Client.searchLibraries.mockRejectedValueOnce(new Error('API error'));
            
            const codeContext: CodeContext = {
                language: 'javascript',
                imports: [],
                codeSnippet: 'const x = 1;'
            };
            
            const suggestions = await knowledgeService.suggestLibraries(codeContext);
            
            expect(suggestions.length).toBe(0);
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });
    
    describe('getExamples', () => {
        it('should get code examples for an API', async () => {
            const context: SymbolContext = {
                symbolName: 'useState',
                language: 'javascript',
                imports: ["import { useState } from 'react'"],
                sourceFile: 'app.js'
            };
            
            const examples = await knowledgeService.getExamples('useState', context);
            
            expect(examples.length).toBeGreaterThan(0);
            expect(examples[0].library.name).toBe('react');
            expect(examples[0].examples.length).toBeGreaterThan(0);
            expect(examples[0].examples[0].code).toBeDefined();
            expect(mockContext7Client.findCodeExamples).toHaveBeenCalled();
        });
        
        it('should handle empty results', async () => {
            // Mock empty search results
            mockContext7Client.searchLibraries.mockResolvedValueOnce({
                success: true,
                libraries: [],
                pagination: {
                    limit: 10,
                    offset: 0,
                    total: 0
                }
            });
            
            const examples = await knowledgeService.getExamples('nonExistentFunction');
            
            expect(examples.length).toBe(0);
        });
        
        it('should handle errors gracefully', async () => {
            mockContext7Client.searchLibraries.mockRejectedValueOnce(new Error('API error'));
            
            const examples = await knowledgeService.getExamples('useState');
            
            expect(examples.length).toBe(0);
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });
    
    describe('searchDocumentation', () => {
        it('should search documentation with language filter', async () => {
            const results = await knowledgeService.searchDocumentation('state management', {
                language: 'javascript'
            });
            
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].library).toBeDefined();
            expect(results[0].documentation).toBeDefined();
            expect(mockContext7Client.searchLibraries).toHaveBeenCalled();
            expect(mockContext7Client.getLibraryDocumentation).toHaveBeenCalled();
        });
        
        it('should handle empty results', async () => {
            // Mock empty search results
            mockContext7Client.searchLibraries.mockResolvedValueOnce({
                success: true,
                libraries: [],
                pagination: {
                    limit: 10,
                    offset: 0,
                    total: 0
                }
            });
            
            const results = await knowledgeService.searchDocumentation('nonexistentquery');
            
            expect(results.length).toBe(0);
            expect(mockContext7Client.searchLibraries).toHaveBeenCalled();
            expect(mockContext7Client.getLibraryDocumentation).not.toHaveBeenCalled();
        });
        
        it('should handle errors gracefully', async () => {
            mockContext7Client.searchLibraries.mockRejectedValueOnce(new Error('API error'));
            
            const results = await knowledgeService.searchDocumentation('state');
            
            expect(results.length).toBe(0);
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });
    
    describe('Scoring algorithms', () => {
        it('should calculate context score correctly', async () => {
            const context: SymbolContext = {
                symbolName: 'useState',
                language: 'javascript',
                imports: ["import { useState } from 'react'"],
                sourceFile: 'app.js',
                surroundingSymbols: ['setCount', 'count']
            };
            
            const results = await knowledgeService.findDocumentationForSymbol('useState', context);
            
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].matchDetails).toBeDefined();
            // Context score should be high due to matching imports
            expect(results[0].matchDetails!.contextScore).toBeGreaterThan(0.5);
        });
        
        it('should calculate popularity score correctly', async () => {
            const context: SymbolContext = {
                symbolName: 'useState',
                language: 'javascript',
                imports: [],
                sourceFile: 'app.js'
            };
            
            const results = await knowledgeService.findDocumentationForSymbol('useState', context);
            
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].matchDetails).toBeDefined();
            // Popularity score should be high for react
            expect(results[0].matchDetails!.popularityScore).toBeGreaterThan(0.5);
        });
        
        it('should calculate language score correctly', async () => {
            const context: SymbolContext = {
                symbolName: 'useState',
                language: 'javascript',
                imports: [],
                sourceFile: 'app.js'
            };
            
            const results = await knowledgeService.findDocumentationForSymbol('useState', context);
            
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].matchDetails).toBeDefined();
            // Language score should be high for matching languages
            expect(results[0].matchDetails!.languageScore).toBe(1.0);
        });
    });
});