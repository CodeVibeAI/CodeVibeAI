import { injectable, inject } from 'inversify';
import { ILogger } from '@theia/core';
import { 
  SearchResponse, 
  GetLibraryDocsOptions, 
  SearchLibrariesOptions, 
  RateLimitInfo, 
  Context7Error,
  CodeExamplesResponse,
  FindCodeExamplesOptions
} from '../common/context7-protocol';

/**
 * Maximum retry attempts for requests that might be affected by transient errors
 */
const MAX_RETRIES = 3;

/**
 * Exponential backoff base (in ms)
 */
const RETRY_BACKOFF_MS = 500;

/**
 * Client for interacting with Context7 API
 */
@injectable()
export class Context7Client {
  private readonly API_BASE_URL = 'https://context7.com/api';
  private readonly API_VERSION = 'v1';
  
  // Rate limiting information
  private rateLimitInfo: RateLimitInfo = {
    limit: 60,
    remaining: 60,
    reset: 0,
    resetIn: 0
  };
  
  @inject(ILogger)
  protected readonly logger: ILogger;
  
  /**
   * Search for libraries matching the given query
   * 
   * @param query The search query
   * @param options Search options for pagination, filtering, and sorting
   * @returns Search results or null if the request fails
   */
  async searchLibraries(query: string, options?: SearchLibrariesOptions): Promise<SearchResponse | null> {
    try {
      const url = new URL(`${this.API_BASE_URL}/${this.API_VERSION}/search`);
      url.searchParams.set('query', query);
      
      // Add optional parameters if provided
      if (options) {
        if (options.page !== undefined) {
          url.searchParams.set('page', options.page.toString());
        }
        
        if (options.perPage !== undefined) {
          url.searchParams.set('per_page', options.perPage.toString());
        }
        
        if (options.language) {
          url.searchParams.set('language', options.language);
        }
        
        if (options.sort) {
          url.searchParams.set('sort', options.sort);
        }
        
        if (options.tags && options.tags.length > 0) {
          url.searchParams.set('tags', options.tags.join(','));
        }
        
        if (options.includeMetadata !== undefined) {
          url.searchParams.set('include_metadata', options.includeMetadata.toString());
        }
      }
      
      this.logger.debug(`Searching Context7 libraries with query: ${query}`, options);
      const response = await this.makeRequest(url.toString());
      
      return response as SearchResponse;
    } catch (error) {
      if (this.isContext7Error(error)) {
        this.logger.error(`Context7 API error searching libraries: ${error.code} - ${error.message}`);
      } else {
        this.logger.error('Error searching libraries:', error);
      }
      return null;
    }
  }
  
  /**
   * Fetches documentation context for a specific library
   * 
   * @param libraryId The library ID to fetch documentation for
   * @param options Options for the request
   * @returns The documentation text or null if the request fails
   */
  async getLibraryDocumentation(libraryId: string, options?: GetLibraryDocsOptions): Promise<string | null> {
    try {
      const url = new URL(`${this.API_BASE_URL}/${this.API_VERSION}/docs/${libraryId}`);
      
      // Add optional parameters if provided
      if (options) {
        if (options.topic) {
          url.searchParams.set('topic', options.topic);
        }
        
        if (options.tokens !== undefined) {
          url.searchParams.set('tokens', options.tokens.toString());
        }
        
        if (options.format) {
          url.searchParams.set('format', options.format);
        }
        
        if (options.version) {
          url.searchParams.set('version', options.version);
        }
        
        if (options.includeExamples !== undefined) {
          url.searchParams.set('include_examples', options.includeExamples.toString());
        }
      }
      
      this.logger.debug(`Fetching library documentation for: ${libraryId}`, options);
      const response = await this.makeRequest(url.toString(), { rawText: true });
      
      return response as string;
    } catch (error) {
      if (this.isContext7Error(error)) {
        this.logger.error(`Context7 API error fetching documentation: ${error.code} - ${error.message}`);
      } else {
        this.logger.error('Error fetching documentation:', error);
      }
      return null;
    }
  }
  
  /**
   * Find code examples for a specific library function
   * 
   * @param libraryId Library ID
   * @param functionName Function name to search for examples
   * @param options Search options
   * @returns Code examples or null if the request fails
   */
  async findCodeExamples(
    libraryId: string, 
    functionName: string, 
    options?: FindCodeExamplesOptions
  ): Promise<CodeExamplesResponse | null> {
    try {
      const url = new URL(`${this.API_BASE_URL}/${this.API_VERSION}/examples/${libraryId}/${functionName}`);
      
      // Add optional parameters if provided
      if (options) {
        if (options.page !== undefined) {
          url.searchParams.set('page', options.page.toString());
        }
        
        if (options.perPage !== undefined) {
          url.searchParams.set('per_page', options.perPage.toString());
        }
        
        if (options.filter) {
          url.searchParams.set('filter', options.filter);
        }
        
        if (options.includeDescription !== undefined) {
          url.searchParams.set('include_description', options.includeDescription.toString());
        }
      }
      
      this.logger.debug(`Finding code examples for ${libraryId}::${functionName}`, options);
      const response = await this.makeRequest(url.toString());
      
      return response as CodeExamplesResponse;
    } catch (error) {
      if (this.isContext7Error(error)) {
        this.logger.error(`Context7 API error finding code examples: ${error.code} - ${error.message}`);
      } else {
        this.logger.error('Error finding code examples:', error);
      }
      return null;
    }
  }
  
  /**
   * Get current rate limit information
   * 
   * @returns Current rate limit information or null if not available
   */
  async getRateLimitInfo(): Promise<RateLimitInfo | null> {
    try {
      // Make a lightweight call to the API to get updated rate limit headers
      const url = new URL(`${this.API_BASE_URL}/${this.API_VERSION}/rate_limit`);
      await this.makeRequest(url.toString(), { method: 'HEAD' });
      
      return { ...this.rateLimitInfo };
    } catch (error) {
      this.logger.error('Error fetching rate limit info:', error);
      return null;
    }
  }
  
  /**
   * Make a request to the Context7 API with retries and rate limiting
   * 
   * @param url The URL to fetch
   * @param options Request options
   * @returns The parsed response or raw text
   */
  private async makeRequest(
    url: string, 
    options: {
      method?: string;
      body?: any;
      rawText?: boolean;
      retries?: number;
      retryDelay?: number;
    } = {}
  ): Promise<any> {
    const method = options.method || 'GET';
    const retries = options.retries !== undefined ? options.retries : MAX_RETRIES;
    const retryDelay = options.retryDelay || RETRY_BACKOFF_MS;
    let currentRetry = 0;
    
    while (true) {
      try {
        // Check rate limits before making the request
        if (this.rateLimitInfo.remaining <= 0) {
          const timeToReset = this.rateLimitInfo.reset * 1000 - Date.now();
          
          if (timeToReset > 0) {
            this.logger.warn(`Rate limit exceeded, waiting ${Math.ceil(timeToReset / 1000)}s before retrying`);
            await this.sleep(timeToReset);
          }
        }
        
        // Prepare request
        const fetchOptions: RequestInit = {
          method,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'CodeVibeAI/Context7Integration'
          }
        };
        
        // Add body if applicable
        if (options.body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
          fetchOptions.body = JSON.stringify(options.body);
          (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
        }
        
        // Make the request
        const response = await fetch(url, fetchOptions);
        
        // Update rate limit information from headers
        this.updateRateLimits(response.headers);
        
        // Check for error responses
        if (!response.ok) {
          let errorData: any = {};
          
          try {
            errorData = await response.json();
          } catch (e) {
            // Couldn't parse JSON, use default error
          }
          
          const error: Context7Error = {
            code: errorData.code || 'api_error',
            message: errorData.message || `API request failed with status ${response.status}`,
            status: response.status,
            details: errorData.details
          };
          
          // Handle rate limiting
          if (response.status === 429) {
            if (currentRetry < retries) {
              const retryAfter = parseInt(response.headers.get('retry-after') || '1');
              const delay = retryAfter * 1000 || retryDelay * Math.pow(2, currentRetry);
              
              this.logger.warn(`Rate limited, retrying in ${delay}ms (attempt ${currentRetry + 1}/${retries})`);
              await this.sleep(delay);
              currentRetry++;
              continue;
            }
          }
          
          // Handle server errors (retryable)
          if (response.status >= 500 && response.status < 600) {
            if (currentRetry < retries) {
              const delay = retryDelay * Math.pow(2, currentRetry);
              this.logger.warn(`Server error ${response.status}, retrying in ${delay}ms (attempt ${currentRetry + 1}/${retries})`);
              await this.sleep(delay);
              currentRetry++;
              continue;
            }
          }
          
          throw error;
        }
        
        // Process successful response
        if (options.rawText) {
          return await response.text();
        } else {
          return await response.json();
        }
      } catch (error) {
        // Handle network errors (retryable)
        if (
          error instanceof TypeError || 
          error instanceof Error && error.message.includes('network') ||
          error instanceof Error && error.message.includes('connection')
        ) {
          if (currentRetry < retries) {
            const delay = retryDelay * Math.pow(2, currentRetry);
            this.logger.warn(`Network error, retrying in ${delay}ms (attempt ${currentRetry + 1}/${retries})`);
            await this.sleep(delay);
            currentRetry++;
            continue;
          }
        }
        
        // Rethrow other errors
        throw error;
      }
    }
  }
  
  /**
   * Update rate limit information from response headers
   * 
   * @param headers Response headers
   */
  private updateRateLimits(headers: Headers): void {
    const limit = headers.get('x-ratelimit-limit');
    const remaining = headers.get('x-ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset');
    
    if (limit) {
      this.rateLimitInfo.limit = parseInt(limit);
    }
    
    if (remaining) {
      this.rateLimitInfo.remaining = parseInt(remaining);
    }
    
    if (reset) {
      const resetTime = parseInt(reset);
      this.rateLimitInfo.reset = resetTime;
      this.rateLimitInfo.resetIn = Math.max(0, resetTime - Math.floor(Date.now() / 1000));
    }
    
    this.logger.debug(`Rate limits: ${this.rateLimitInfo.remaining}/${this.rateLimitInfo.limit}, reset in ${this.rateLimitInfo.resetIn}s`);
  }
  
  /**
   * Sleep for a specified time
   * 
   * @param ms Milliseconds to sleep
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Type guard for Context7Error
   * 
   * @param error Error to check
   */
  private isContext7Error(error: any): error is Context7Error {
    return (
      error && 
      typeof error === 'object' && 
      'code' in error && 
      'message' in error && 
      'status' in error
    );
  }
}