import { injectable } from 'inversify';

/**
 * Context7 API response for library search queries
 */
export interface SearchResponse {
  results: LibrarySearchResult[];
  pagination?: PaginationInfo;
}

/**
 * Individual library search result
 */
export interface LibrarySearchResult {
  id: string;
  name: string;
  description: string;
  version?: string;
  stars?: number;
  lastUpdated?: string;
  language?: string;
  tags?: string[];
  url?: string;
}

/**
 * Pagination information for search responses
 */
export interface PaginationInfo {
  totalResults: number;
  currentPage: number;
  totalPages: number;
  perPage: number;
  hasMore: boolean;
}

/**
 * Options for library search
 */
export interface SearchLibrariesOptions {
  page?: number;
  perPage?: number;
  language?: string;
  sort?: 'relevance' | 'stars' | 'updated' | 'name';
  tags?: string[];
  includeMetadata?: boolean;
}

/**
 * Options for fetching library documentation
 */
export interface GetLibraryDocsOptions {
  topic?: string;
  tokens?: number; // Default is 5000
  format?: 'markdown' | 'text' | 'html';
  version?: string;
  includeExamples?: boolean;
}

/**
 * Code example result
 */
export interface CodeExample {
  id: string;
  title: string;
  code: string;
  language: string;
  description?: string;
  source?: string;
  url?: string;
  votes?: number;
}

/**
 * Code examples response
 */
export interface CodeExamplesResponse {
  examples: CodeExample[];
  functionName: string;
  libraryId: string;
  pagination?: PaginationInfo;
}

/**
 * Options for finding code examples
 */
export interface FindCodeExamplesOptions {
  page?: number;
  perPage?: number;
  filter?: 'popular' | 'recent' | 'recommended';
  includeDescription?: boolean;
}

/**
 * Context7 API error
 */
export interface Context7Error {
  code: string;
  message: string;
  status: number;
  details?: Record<string, any>;
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  resetIn: number; // Seconds
}

/**
 * MCP Server configuration options
 */
export interface MCPServerOptions {
  enabled: boolean;
  autoStart: boolean;
  minTokens?: number; // DEFAULT_MINIMUM_TOKENS, default 5000
  port?: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * MCP Server status
 */
export interface MCPServerStatus {
  enabled: boolean;
  running: boolean;
  port?: number;
  uptime?: number; // seconds
  connectedClients?: number;
  version?: string;
}

/**
 * Context7 service interface for IDE integration
 */
export interface Context7Service {
  /**
   * Search for libraries matching a query
   * @param query The search query
   * @param options Search options
   */
  searchLibraries(query: string, options?: SearchLibrariesOptions): Promise<SearchResponse | null>;
  
  /**
   * Fetch documentation for a specific library
   * @param libraryId Library identifier
   * @param options Documentation options
   */
  getLibraryDocumentation(libraryId: string, options?: GetLibraryDocsOptions): Promise<string | null>;
  
  /**
   * Find code examples for a specific library function
   * @param libraryId Library identifier
   * @param functionName Function name to search for
   * @param options Search options
   */
  findCodeExamples(libraryId: string, functionName: string, options?: FindCodeExamplesOptions): Promise<CodeExamplesResponse | null>;
  
  /**
   * Configure MCP server for Context7 integration
   * @param options MCP server configuration options
   */
  configureMCPServer(options: MCPServerOptions): Promise<boolean>;
  
  /**
   * Get current MCP server status
   */
  getMCPStatus(): Promise<MCPServerStatus>;
  
  /**
   * Enable MCP server
   */
  enableMCPServer(): Promise<boolean>;
  
  /**
   * Disable MCP server
   */
  disableMCPServer(): Promise<boolean>;
  
  /**
   * Get current rate limit information
   */
  getRateLimitInfo(): Promise<RateLimitInfo | null>;
}

// Symbol for dependency injection
export const Context7Symbol = Symbol('Context7Service');