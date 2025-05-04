import { injectable, inject } from 'inversify';
import { ILogger } from '@theia/core';
import { 
    Context7Service, 
    Context7Client as Context7ProtocolClient,
    SearchOptions,
    SearchLibrariesResponse,
    LibraryDocumentationResponse,
    CodeExamplesResponse,
    RelatedLibrariesResponse,
    Context7Error,
    SearchResponse,
    GetLibraryDocsOptions,
    MCPServerOptions
} from '../common/context7-protocol';
import { Context7Client } from './context7-client';
import { Context7MCPManager } from './context7-mcp-manager';
import { 
    Context7KnowledgeService, 
    CodeContext, 
    SymbolContext,
    DocumentationResult,
    LibrarySuggestion,
    CodeExampleResult,
    DocumentationSearchResult
} from './context7-knowledge-service';

/**
 * Implementation of the Context7Service interface
 * This service handles backend operations for Context7 functionality
 */
@injectable()
export class Context7ServiceImpl implements Context7Service {
    /**
     * The client connected on the frontend
     */
    protected client: Context7ProtocolClient | undefined;

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(Context7Client)
    protected readonly context7Client: Context7Client;
    
    @inject(Context7MCPManager)
    protected readonly mcpManager: Context7MCPManager;
    
    @inject(Context7KnowledgeService)
    protected readonly knowledgeService: Context7KnowledgeService;

    /**
     * Method to set the client that will receive event notifications
     */
    setClient(client: Context7ProtocolClient | undefined): void {
        this.client = client;
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this.client = undefined;
    }

    /**
     * Search for libraries matching the given query (simplified API)
     * @param query The search query
     */
    async searchLibraries(query: string): Promise<SearchResponse | null> {
        this.logger.info(`Searching libraries with query: "${query}"`);
        return await this.context7Client.searchLibraries(query);
    }
    
    /**
     * Fetch documentation for a specific library (simplified API)
     * @param libraryId Library identifier
     * @param options Documentation options
     */
    async getLibraryDocumentation(libraryId: string, options?: GetLibraryDocsOptions): Promise<string | null> {
        this.logger.info(`Getting documentation for library: "${libraryId}"`);
        return await this.context7Client.getLibraryDocumentation(libraryId, options);
    }
    
    /**
     * Configure MCP server for Context7 integration
     * @param options MCP server configuration options
     */
    async configureMCPServer(options: MCPServerOptions): Promise<boolean> {
        this.logger.info(`Configuring Context7 MCP server: ${options.enabled ? 'enabled' : 'disabled'}`);
        
        try {
            // Use the MCPManager to configure the server
            const result = await this.mcpManager.configureMCPServer(options);
            
            // If enabled and auto-start is requested, start the server
            if (result && options.enabled && options.autoStart) {
                await this.mcpManager.startMCPServer();
            }
            
            return result;
        } catch (error) {
            this.logger.error('Failed to configure Context7 MCP server:', error);
            return false;
        }
    }
    
    /**
     * Get current MCP server status
     */
    async getMCPStatus(): Promise<{ enabled: boolean; running: boolean }> {
        return await this.mcpManager.getMCPStatus();
    }
    
    //
    // Advanced API methods (inherited from previous implementation)
    //
    
    /**
     * Search libraries in the knowledge base (advanced)
     * 
     * @param query Search query string
     * @param options Search options including pagination and filters
     * @returns Promise with search results
     */
    async searchLibrariesExtended(query: string, options?: SearchOptions): Promise<SearchLibrariesResponse> {
        this.logger.info(`Searching libraries with query (extended): "${query}"`);
        
        try {
            if (!this.context7Client.isAuthenticated()) {
                this.logger.error('Context7 client is not authenticated');
                return {
                    success: false,
                    error: {
                        code: 'authentication_error',
                        message: 'Context7 API is not configured. Please set CONTEXT7_API_KEY environment variable.'
                    },
                    libraries: [],
                    pagination: {
                        limit: 0,
                        offset: 0,
                        total: 0
                    }
                };
            }
            
            return await this.context7Client.searchLibrariesExtended(query, options);
        } catch (error) {
            this.handleError(error as Context7Error);
            throw error;
        }
    }
    
    /**
     * Get documentation for a specific library (advanced)
     * 
     * @param libraryName Name of the library
     * @param version Optional specific version, defaults to latest
     * @returns Promise with library documentation
     */
    async getLibraryDocumentationExtended(libraryName: string, version?: string): Promise<LibraryDocumentationResponse> {
        this.logger.info(`Getting documentation for library (extended): "${libraryName}"${version ? ` version: ${version}` : ''}`);
        
        try {
            if (!this.context7Client.isAuthenticated()) {
                this.logger.error('Context7 client is not authenticated');
                return {
                    success: false,
                    error: {
                        code: 'authentication_error',
                        message: 'Context7 API is not configured. Please set CONTEXT7_API_KEY environment variable.'
                    },
                    library: {} as any,
                    documentation: {} as any
                };
            }
            
            return await this.context7Client.getLibraryDocumentationExtended(libraryName, version);
        } catch (error) {
            this.handleError(error as Context7Error);
            throw error;
        }
    }
    
    /**
     * Find code examples for a specific function in a library
     * 
     * @param libraryName Name of the library
     * @param functionName Name of the function
     * @returns Promise with code examples
     */
    async findCodeExamples(libraryName: string, functionName: string): Promise<CodeExamplesResponse> {
        this.logger.info(`Finding code examples for function: "${functionName}" in library: "${libraryName}"`);
        
        try {
            if (!this.context7Client.isAuthenticated()) {
                this.logger.error('Context7 client is not authenticated');
                return {
                    success: false,
                    error: {
                        code: 'authentication_error',
                        message: 'Context7 API is not configured. Please set CONTEXT7_API_KEY environment variable.'
                    },
                    examples: [],
                    pagination: {
                        limit: 0,
                        offset: 0,
                        total: 0
                    }
                };
            }
            
            return await this.context7Client.findCodeExamples(libraryName, functionName);
        } catch (error) {
            this.handleError(error as Context7Error);
            throw error;
        }
    }
    
    /**
     * Get related libraries for a given library
     * 
     * @param libraryName Name of the library
     * @returns Promise with related libraries
     */
    async getRelatedLibraries(libraryName: string): Promise<RelatedLibrariesResponse> {
        this.logger.info(`Getting related libraries for: "${libraryName}"`);
        
        try {
            if (!this.context7Client.isAuthenticated()) {
                this.logger.error('Context7 client is not authenticated');
                return {
                    success: false,
                    error: {
                        code: 'authentication_error',
                        message: 'Context7 API is not configured. Please set CONTEXT7_API_KEY environment variable.'
                    },
                    libraries: []
                };
            }
            
            return await this.context7Client.getRelatedLibraries(libraryName);
        } catch (error) {
            this.handleError(error as Context7Error);
            throw error;
        }
    }
    
    /**
     * Find documentation for a specific symbol with context awareness
     * 
     * @param symbolName Name of the symbol to find documentation for
     * @param context Context information for better matching
     * @returns Array of documentation results ranked by relevance
     */
    async findDocumentationForSymbol(
        symbolName: string, 
        context: SymbolContext
    ): Promise<DocumentationResult[]> {
        this.logger.info(`Finding documentation for symbol: "${symbolName}"`);
        
        try {
            if (!this.context7Client.isAuthenticated()) {
                this.logger.error('Context7 client is not authenticated');
                return [];
            }
            
            return await this.knowledgeService.findDocumentationForSymbol(symbolName, context);
        } catch (error) {
            this.handleError(error as Context7Error);
            throw error;
        }
    }
    
    /**
     * Suggest libraries based on code context
     * 
     * @param codeContext Context information about current code
     * @returns Array of library suggestions ranked by relevance
     */
    async suggestLibraries(codeContext: CodeContext): Promise<LibrarySuggestion[]> {
        this.logger.info(`Suggesting libraries for code context`);
        
        try {
            if (!this.context7Client.isAuthenticated()) {
                this.logger.error('Context7 client is not authenticated');
                return [];
            }
            
            return await this.knowledgeService.suggestLibraries(codeContext);
        } catch (error) {
            this.handleError(error as Context7Error);
            throw error;
        }
    }
    
    /**
     * Get code examples for a specific API
     * 
     * @param apiName Name of the API to find examples for
     * @param context Optional context information for better matching
     * @returns Array of code examples ranked by relevance
     */
    async getExamples(
        apiName: string, 
        context?: SymbolContext
    ): Promise<CodeExampleResult[]> {
        this.logger.info(`Getting examples for API: "${apiName}"`);
        
        try {
            if (!this.context7Client.isAuthenticated()) {
                this.logger.error('Context7 client is not authenticated');
                return [];
            }
            
            return await this.knowledgeService.getExamples(apiName, context);
        } catch (error) {
            this.handleError(error as Context7Error);
            throw error;
        }
    }
    
    /**
     * Search documentation based on a query
     * 
     * @param query Search query
     * @param options Search options
     * @returns Array of documentation search results
     */
    async searchDocumentation(
        query: string, 
        options?: SearchOptions & { language?: string }
    ): Promise<DocumentationSearchResult[]> {
        this.logger.info(`Searching documentation for: "${query}"`);
        
        try {
            if (!this.context7Client.isAuthenticated()) {
                this.logger.error('Context7 client is not authenticated');
                return [];
            }
            
            return await this.knowledgeService.searchDocumentation(query, options);
        } catch (error) {
            this.handleError(error as Context7Error);
            throw error;
        }
    }
    
    /**
     * Handle errors and notify the client if connected
     */
    private handleError(error: Context7Error): void {
        this.logger.error(`Context7 error: ${error.code}: ${error.message} - ${error.details || ''}`);
        
        // Notify frontend client if available
        if (this.client) {
            this.client.onError(error);
        }
    }
}