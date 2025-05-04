import { expect } from 'chai';
import { Container } from 'inversify';
import { ILogger } from '@theia/core';
import * as sinon from 'sinon';
import { Context7Client } from './context7-client';
import { 
  SearchResponse, 
  LibrarySearchResult, 
  CodeExamplesResponse, 
  RateLimitInfo 
} from '../common/context7-protocol';

// Mock for global fetch
declare const global: any;

// Mock logger for testing
class MockLogger implements ILogger {
  error(message: string, ...params: any[]): void {}
  warn(message: string, ...params: any[]): void {}
  info(message: string, ...params: any[]): void {}
  debug(message: string, ...params: any[]): void {}
  log(logLevel: number, message: string, ...params: any[]): void {}
  setLogLevel(logLevel: number): void {}
  getLogLevel(): number { return 0; }
  isEnabled(logLevel: number): boolean { return true; }
  ifEnabled(logLevel: number): (() => void) | undefined { return () => {}; }
  child(obj: object): ILogger { return this; }
}

/**
 * Helper to create Headers object with rate limit info
 */
function createRateLimitHeaders(
  limit: number = 60, 
  remaining: number = 59, 
  reset: number = Math.floor(Date.now() / 1000) + 3600
): Headers {
  const headers = new Headers();
  headers.set('x-ratelimit-limit', limit.toString());
  headers.set('x-ratelimit-remaining', remaining.toString());
  headers.set('x-ratelimit-reset', reset.toString());
  return headers;
}

/**
 * Helper to mock Response object
 */
function createMockResponse(
  status: number, 
  data: any, 
  headers: Headers = new Headers()
): Response {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    headers,
    json: async () => data,
    text: async () => typeof data === 'string' ? data : JSON.stringify(data)
  } as Response;
  
  return response;
}

/**
 * Mock search results
 */
const mockSearchResults: SearchResponse = {
  results: [
    {
      id: 'react',
      name: 'React',
      description: 'A JavaScript library for building user interfaces',
      version: '18.2.0',
      stars: 200000,
      language: 'javascript',
      tags: ['frontend', 'ui', 'framework']
    },
    {
      id: 'react-dom',
      name: 'React DOM',
      description: 'React package for working with the DOM',
      version: '18.2.0',
      stars: 180000,
      language: 'javascript',
      tags: ['frontend', 'ui', 'framework']
    }
  ],
  pagination: {
    totalResults: 2,
    currentPage: 1,
    totalPages: 1,
    perPage: 10,
    hasMore: false
  }
};

/**
 * Mock code examples
 */
const mockCodeExamples: CodeExamplesResponse = {
  examples: [
    {
      id: 'example1',
      title: 'Basic useState Example',
      code: 'function Counter() {\n  const [count, setCount] = useState(0);\n  return (\n    <div>\n      <p>Count: {count}</p>\n      <button onClick={() => setCount(count + 1)}>Increment</button>\n    </div>\n  );\n}',
      language: 'jsx',
      description: 'A simple counter component using React\'s useState hook',
      source: 'React docs',
      votes: 157
    },
    {
      id: 'example2',
      title: 'useState with Object',
      code: 'function Form() {\n  const [form, setForm] = useState({ name: \'\', email: \'\' });\n  \n  const updateField = (field, value) => {\n    setForm({ ...form, [field]: value });\n  };\n  \n  return (\n    <form>\n      <input\n        value={form.name}\n        onChange={(e) => updateField(\'name\', e.target.value)}\n      />\n      <input\n        value={form.email}\n        onChange={(e) => updateField(\'email\', e.target.value)}\n      />\n    </form>\n  );\n}',
      language: 'jsx',
      description: 'Using useState with an object to manage form state',
      source: 'React docs',
      votes: 124
    }
  ],
  functionName: 'useState',
  libraryId: 'react',
  pagination: {
    totalResults: 2,
    currentPage: 1,
    totalPages: 1,
    perPage: 10,
    hasMore: false
  }
};

/**
 * Mock documentation content
 */
const mockDocumentation = `
# React Documentation

React is a JavaScript library for building user interfaces.

## Getting Started

To get started with React, you can use Create React App:

\`\`\`bash
npx create-react-app my-app
cd my-app
npm start
\`\`\`

## Core Concepts

- **Components**: React applications are built using components.
- **Props**: Read-only data passed to components.
- **State**: Mutable data that affects component rendering.
`;

describe('Context7Client', () => {
  let context7Client: Context7Client;
  let container: Container;
  let sandbox: sinon.SinonSandbox;
  let mockLogger: ILogger;
  let fetchStub: sinon.SinonStub;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    mockLogger = new MockLogger();
    
    // Create a new container for each test
    container = new Container();
    container.bind(ILogger).toConstantValue(mockLogger);
    container.bind(Context7Client).toSelf().inSingletonScope();
    
    // Mock global fetch
    fetchStub = sandbox.stub(global, 'fetch');
    
    // Get the client instance
    context7Client = container.get(Context7Client);
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('searchLibraries', () => {
    it('should search libraries with query parameter', async () => {
      // Mock successful response
      fetchStub.resolves(createMockResponse(
        200, 
        mockSearchResults, 
        createRateLimitHeaders()
      ));
      
      const result = await context7Client.searchLibraries('react');
      
      // Verify the fetch call
      expect(fetchStub.calledOnce).to.be.true;
      const url = fetchStub.firstCall.args[0] as string;
      expect(url).to.include('/api/v1/search');
      expect(url).to.include('query=react');
      
      // Verify the result
      expect(result).to.deep.equal(mockSearchResults);
    });
    
    it('should include optional parameters in search', async () => {
      // Mock successful response
      fetchStub.resolves(createMockResponse(
        200, 
        mockSearchResults, 
        createRateLimitHeaders()
      ));
      
      const result = await context7Client.searchLibraries('react', {
        page: 2,
        perPage: 5,
        language: 'javascript',
        sort: 'stars',
        tags: ['frontend', 'ui'],
        includeMetadata: true
      });
      
      // Verify the fetch call
      expect(fetchStub.calledOnce).to.be.true;
      const url = fetchStub.firstCall.args[0] as string;
      expect(url).to.include('query=react');
      expect(url).to.include('page=2');
      expect(url).to.include('per_page=5');
      expect(url).to.include('language=javascript');
      expect(url).to.include('sort=stars');
      expect(url).to.include('tags=frontend,ui');
      expect(url).to.include('include_metadata=true');
      
      // Verify the result
      expect(result).to.deep.equal(mockSearchResults);
    });
    
    it('should handle API errors and return null', async () => {
      // Mock error response
      fetchStub.resolves(createMockResponse(
        404, 
        { code: 'not_found', message: 'Resource not found' },
        createRateLimitHeaders()
      ));
      
      const result = await context7Client.searchLibraries('nonexistent');
      
      // Verify the fetch call
      expect(fetchStub.calledOnce).to.be.true;
      
      // Verify the result
      expect(result).to.be.null;
    });
    
    it('should handle network errors and return null', async () => {
      // Mock network error
      fetchStub.rejects(new Error('Network error'));
      
      const result = await context7Client.searchLibraries('react');
      
      // Verify the fetch call
      expect(fetchStub.calledOnce).to.be.true;
      
      // Verify the result
      expect(result).to.be.null;
    });
  });
  
  describe('getLibraryDocumentation', () => {
    it('should fetch documentation with libraryId', async () => {
      // Mock successful response
      fetchStub.resolves(createMockResponse(
        200, 
        mockDocumentation, 
        createRateLimitHeaders()
      ));
      
      const result = await context7Client.getLibraryDocumentation('react');
      
      // Verify the fetch call
      expect(fetchStub.calledOnce).to.be.true;
      const url = fetchStub.firstCall.args[0] as string;
      expect(url).to.include('/api/v1/docs/react');
      
      // Verify the result
      expect(result).to.equal(mockDocumentation);
    });
    
    it('should include optional parameters in documentation request', async () => {
      // Mock successful response
      fetchStub.resolves(createMockResponse(
        200, 
        mockDocumentation, 
        createRateLimitHeaders()
      ));
      
      const result = await context7Client.getLibraryDocumentation('react', {
        topic: 'hooks',
        tokens: 1000,
        format: 'markdown',
        version: '18.0.0',
        includeExamples: true
      });
      
      // Verify the fetch call
      expect(fetchStub.calledOnce).to.be.true;
      const url = fetchStub.firstCall.args[0] as string;
      expect(url).to.include('/api/v1/docs/react');
      expect(url).to.include('topic=hooks');
      expect(url).to.include('tokens=1000');
      expect(url).to.include('format=markdown');
      expect(url).to.include('version=18.0.0');
      expect(url).to.include('include_examples=true');
      
      // Verify the result
      expect(result).to.equal(mockDocumentation);
    });
    
    it('should handle API errors and return null', async () => {
      // Mock error response
      fetchStub.resolves(createMockResponse(
        404, 
        { code: 'not_found', message: 'Library not found' },
        createRateLimitHeaders()
      ));
      
      const result = await context7Client.getLibraryDocumentation('nonexistent');
      
      // Verify the fetch call
      expect(fetchStub.calledOnce).to.be.true;
      
      // Verify the result
      expect(result).to.be.null;
    });
  });
  
  describe('findCodeExamples', () => {
    it('should fetch code examples with libraryId and functionName', async () => {
      // Mock successful response
      fetchStub.resolves(createMockResponse(
        200, 
        mockCodeExamples, 
        createRateLimitHeaders()
      ));
      
      const result = await context7Client.findCodeExamples('react', 'useState');
      
      // Verify the fetch call
      expect(fetchStub.calledOnce).to.be.true;
      const url = fetchStub.firstCall.args[0] as string;
      expect(url).to.include('/api/v1/examples/react/useState');
      
      // Verify the result
      expect(result).to.deep.equal(mockCodeExamples);
    });
    
    it('should include optional parameters in code examples request', async () => {
      // Mock successful response
      fetchStub.resolves(createMockResponse(
        200, 
        mockCodeExamples, 
        createRateLimitHeaders()
      ));
      
      const result = await context7Client.findCodeExamples('react', 'useState', {
        page: 1,
        perPage: 10,
        filter: 'popular',
        includeDescription: true
      });
      
      // Verify the fetch call
      expect(fetchStub.calledOnce).to.be.true;
      const url = fetchStub.firstCall.args[0] as string;
      expect(url).to.include('/api/v1/examples/react/useState');
      expect(url).to.include('page=1');
      expect(url).to.include('per_page=10');
      expect(url).to.include('filter=popular');
      expect(url).to.include('include_description=true');
      
      // Verify the result
      expect(result).to.deep.equal(mockCodeExamples);
    });
    
    it('should handle API errors and return null', async () => {
      // Mock error response
      fetchStub.resolves(createMockResponse(
        404, 
        { code: 'not_found', message: 'Function not found' },
        createRateLimitHeaders()
      ));
      
      const result = await context7Client.findCodeExamples('react', 'nonexistentFunction');
      
      // Verify the fetch call
      expect(fetchStub.calledOnce).to.be.true;
      
      // Verify the result
      expect(result).to.be.null;
    });
  });
  
  describe('getRateLimitInfo', () => {
    it('should return rate limit information', async () => {
      // Mock successful response with rate limit headers
      const headers = createRateLimitHeaders(60, 59, Math.floor(Date.now() / 1000) + 3600);
      fetchStub.resolves(createMockResponse(
        200, 
        {}, 
        headers
      ));
      
      const result = await context7Client.getRateLimitInfo();
      
      // Verify the fetch call
      expect(fetchStub.calledOnce).to.be.true;
      const url = fetchStub.firstCall.args[0] as string;
      expect(url).to.include('/api/v1/rate_limit');
      
      // Verify the result
      expect(result).to.not.be.null;
      expect(result?.limit).to.equal(60);
      expect(result?.remaining).to.equal(59);
      expect(result?.reset).to.be.a('number');
      expect(result?.resetIn).to.be.a('number');
    });
    
    it('should handle errors and return null', async () => {
      // Mock error response
      fetchStub.rejects(new Error('Network error'));
      
      const result = await context7Client.getRateLimitInfo();
      
      // Verify the fetch call
      expect(fetchStub.calledOnce).to.be.true;
      
      // Verify the result
      expect(result).to.be.null;
    });
  });
  
  describe('Retry mechanism', () => {
    it('should retry on network errors', async () => {
      // First call fails with network error, second succeeds
      fetchStub.onFirstCall().rejects(new Error('Network error'));
      fetchStub.onSecondCall().resolves(createMockResponse(
        200, 
        mockSearchResults, 
        createRateLimitHeaders()
      ));
      
      // Stub sleep to avoid actual waiting
      const sleepStub = sandbox.stub(Object.getPrototypeOf(context7Client), 'sleep').resolves();
      
      const result = await context7Client.searchLibraries('react');
      
      // Verify fetch called twice
      expect(fetchStub.calledTwice).to.be.true;
      
      // Verify sleep was called
      expect(sleepStub.calledOnce).to.be.true;
      
      // Verify the result
      expect(result).to.deep.equal(mockSearchResults);
    });
    
    it('should retry on rate limit (429) responses', async () => {
      // Create rate limit headers
      const headers = createRateLimitHeaders(60, 0, Math.floor(Date.now() / 1000) + 5);
      headers.set('retry-after', '1');
      
      // First call fails with 429, second succeeds
      fetchStub.onFirstCall().resolves(createMockResponse(
        429, 
        { code: 'rate_limited', message: 'Too many requests' }, 
        headers
      ));
      fetchStub.onSecondCall().resolves(createMockResponse(
        200, 
        mockSearchResults, 
        createRateLimitHeaders()
      ));
      
      // Stub sleep to avoid actual waiting
      const sleepStub = sandbox.stub(Object.getPrototypeOf(context7Client), 'sleep').resolves();
      
      const result = await context7Client.searchLibraries('react');
      
      // Verify fetch called twice
      expect(fetchStub.calledTwice).to.be.true;
      
      // Verify sleep was called
      expect(sleepStub.calledOnce).to.be.true;
      
      // Verify the result
      expect(result).to.deep.equal(mockSearchResults);
    });
    
    it('should retry on server errors (5xx)', async () => {
      // First call fails with 503, second succeeds
      fetchStub.onFirstCall().resolves(createMockResponse(
        503, 
        { code: 'service_unavailable', message: 'Service temporarily unavailable' }, 
        createRateLimitHeaders()
      ));
      fetchStub.onSecondCall().resolves(createMockResponse(
        200, 
        mockSearchResults, 
        createRateLimitHeaders()
      ));
      
      // Stub sleep to avoid actual waiting
      const sleepStub = sandbox.stub(Object.getPrototypeOf(context7Client), 'sleep').resolves();
      
      const result = await context7Client.searchLibraries('react');
      
      // Verify fetch called twice
      expect(fetchStub.calledTwice).to.be.true;
      
      // Verify sleep was called
      expect(sleepStub.calledOnce).to.be.true;
      
      // Verify the result
      expect(result).to.deep.equal(mockSearchResults);
    });
    
    it('should stop retrying after max attempts', async () => {
      // All calls fail with network error
      fetchStub.rejects(new Error('Network error'));
      
      // Stub sleep to avoid actual waiting
      const sleepStub = sandbox.stub(Object.getPrototypeOf(context7Client), 'sleep').resolves();
      
      const result = await context7Client.searchLibraries('react');
      
      // Verify fetch was called MAX_RETRIES + 1 times
      expect(fetchStub.callCount).to.equal(4); // Original + 3 retries
      
      // Verify sleep was called MAX_RETRIES times
      expect(sleepStub.callCount).to.equal(3);
      
      // Verify the result is null
      expect(result).to.be.null;
    });
    
    it('should not retry on client errors (4xx) except 429', async () => {
      // Call fails with 404
      fetchStub.resolves(createMockResponse(
        404, 
        { code: 'not_found', message: 'Resource not found' }, 
        createRateLimitHeaders()
      ));
      
      const result = await context7Client.searchLibraries('nonexistent');
      
      // Verify fetch called only once
      expect(fetchStub.calledOnce).to.be.true;
      
      // Verify the result is null
      expect(result).to.be.null;
    });
  });
});