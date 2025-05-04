import { Container } from 'inversify';
import { ILogger } from '@theia/core';
import { Context7ServiceImpl } from './context7-service-impl';
import { Context7Client } from './context7-client';
import { Context7Client as Context7ProtocolClient, Context7ErrorCode } from '../common/context7-protocol';

describe('Context7ServiceImpl', () => {
    let container: Container;
    let context7Service: Context7ServiceImpl;
    let mockContext7Client: jest.Mocked<Context7Client>;
    let mockLogger: jest.Mocked<ILogger>;
    let mockProtocolClient: jest.Mocked<Context7ProtocolClient>;

    // Mock successful responses
    const mockSearchResponse = {
        success: true,
        libraries: [
            {
                name: 'react',
                description: 'A JavaScript library for building user interfaces',
                version: '18.2.0',
                language: 'javascript',
                category: ['frontend', 'ui'],
                stars: 200000,
                lastUpdated: '2023-06-15'
            }
        ],
        pagination: {
            limit: 10,
            offset: 0,
            total: 1
        }
    };

    const mockDocumentationResponse = {
        success: true,
        library: {
            name: 'react',
            description: 'A JavaScript library for building user interfaces',
            version: '18.2.0',
            language: 'javascript',
            category: ['frontend', 'ui'],
            stars: 200000,
            lastUpdated: '2023-06-15'
        },
        documentation: {
            overview: 'React is a JavaScript library for building user interfaces',
            sections: [
                { title: 'Getting Started', content: 'To install React...' }
            ],
            api: [
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
                }
            ]
        }
    };

    const mockCodeExamplesResponse = {
        success: true,
        examples: [
            {
                id: '123',
                code: 'const [count, setCount] = useState(0);',
                description: 'Basic counter with useState',
                source: 'React docs',
                library: 'react',
                libraryVersion: '18.2.0',
                language: 'javascript',
                function: 'useState'
            }
        ],
        pagination: {
            limit: 10,
            offset: 0,
            total: 1
        }
    };

    const mockRelatedLibrariesResponse = {
        success: true,
        libraries: [
            {
                name: 'react-dom',
                description: 'React package for working with the DOM',
                version: '18.2.0',
                language: 'javascript',
                category: ['frontend', 'ui'],
                stars: 200000,
                lastUpdated: '2023-06-15'
            }
        ]
    };

    // Mock error
    const mockError = {
        code: Context7ErrorCode.NETWORK_ERROR,
        message: 'Network error occurred',
        details: 'Connection timeout'
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

        mockProtocolClient = {
            onError: jest.fn()
        } as unknown as jest.Mocked<Context7ProtocolClient>;

        // Create a new container
        container = new Container();
        container.bind(ILogger).toConstantValue(mockLogger);
        container.bind(Context7Client).toConstantValue(mockContext7Client);
        container.bind(Context7ServiceImpl).toSelf().inSingletonScope();

        // Get the service instance
        context7Service = container.get(Context7ServiceImpl);
        context7Service.setClient(mockProtocolClient);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Authentication', () => {
        it('should return error response when not authenticated', async () => {
            mockContext7Client.isAuthenticated.mockReturnValue(false);

            const result = await context7Service.searchLibraries('react');

            expect(result.success).toBe(false);
            expect(result.error?.code).toBe('authentication_error');
            expect(mockContext7Client.searchLibraries).not.toHaveBeenCalled();
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('searchLibraries', () => {
        it('should call the client method and return results when authenticated', async () => {
            mockContext7Client.isAuthenticated.mockReturnValue(true);
            mockContext7Client.searchLibraries.mockResolvedValue(mockSearchResponse);

            const options = { limit: 5, sort: 'popularity' as const };
            const result = await context7Service.searchLibraries('react', options);

            expect(mockLogger.info).toHaveBeenCalledWith('Searching libraries with query: "react"');
            expect(mockContext7Client.searchLibraries).toHaveBeenCalledWith('react', options);
            expect(result).toEqual(mockSearchResponse);
        });

        it('should handle errors and notify the client', async () => {
            mockContext7Client.isAuthenticated.mockReturnValue(true);
            mockContext7Client.searchLibraries.mockRejectedValue(mockError);

            await expect(context7Service.searchLibraries('react')).rejects.toEqual(mockError);
            
            expect(mockLogger.error).toHaveBeenCalled();
            expect(mockProtocolClient.onError).toHaveBeenCalledWith(mockError);
        });
    });

    describe('getLibraryDocumentation', () => {
        it('should call the client method with correct parameters', async () => {
            mockContext7Client.isAuthenticated.mockReturnValue(true);
            mockContext7Client.getLibraryDocumentation.mockResolvedValue(mockDocumentationResponse);

            const result = await context7Service.getLibraryDocumentation('react', '18.0.0');

            expect(mockLogger.info).toHaveBeenCalledWith('Getting documentation for library: "react" version: 18.0.0');
            expect(mockContext7Client.getLibraryDocumentation).toHaveBeenCalledWith('react', '18.0.0');
            expect(result).toEqual(mockDocumentationResponse);
        });
        
        it('should call the client method without version if not provided', async () => {
            mockContext7Client.isAuthenticated.mockReturnValue(true);
            mockContext7Client.getLibraryDocumentation.mockResolvedValue(mockDocumentationResponse);

            const result = await context7Service.getLibraryDocumentation('react');

            expect(mockLogger.info).toHaveBeenCalledWith('Getting documentation for library: "react"');
            expect(mockContext7Client.getLibraryDocumentation).toHaveBeenCalledWith('react', undefined);
            expect(result).toEqual(mockDocumentationResponse);
        });
    });

    describe('findCodeExamples', () => {
        it('should call the client method with correct parameters', async () => {
            mockContext7Client.isAuthenticated.mockReturnValue(true);
            mockContext7Client.findCodeExamples.mockResolvedValue(mockCodeExamplesResponse);

            const result = await context7Service.findCodeExamples('react', 'useState');

            expect(mockLogger.info).toHaveBeenCalledWith('Finding code examples for function: "useState" in library: "react"');
            expect(mockContext7Client.findCodeExamples).toHaveBeenCalledWith('react', 'useState');
            expect(result).toEqual(mockCodeExamplesResponse);
        });
    });

    describe('getRelatedLibraries', () => {
        it('should call the client method with correct parameters', async () => {
            mockContext7Client.isAuthenticated.mockReturnValue(true);
            mockContext7Client.getRelatedLibraries.mockResolvedValue(mockRelatedLibrariesResponse);

            const result = await context7Service.getRelatedLibraries('react');

            expect(mockLogger.info).toHaveBeenCalledWith('Getting related libraries for: "react"');
            expect(mockContext7Client.getRelatedLibraries).toHaveBeenCalledWith('react');
            expect(result).toEqual(mockRelatedLibrariesResponse);
        });
    });

    describe('Client management', () => {
        it('should set and clear client reference', () => {
            const newMockClient = { onError: jest.fn() } as unknown as Context7ProtocolClient;
            
            context7Service.setClient(newMockClient);
            expect((context7Service as any).client).toBe(newMockClient);
            
            context7Service.dispose();
            expect((context7Service as any).client).toBeUndefined();
        });
    });
});