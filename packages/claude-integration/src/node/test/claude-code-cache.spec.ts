import * as chai from 'chai';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Container } from 'inversify';
import { ILogger } from '@theia/core';

import { ClaudeCodeCache } from '../claude-code-cache';
import { ClaudeModelType, ClaudeCompletionRequest, ClaudeResponse } from '../../common/claude-code-protocol';

chai.use(sinonChai);

/**
 * Create a mock logger for testing
 */
function createMockLogger(): ILogger {
    return {
        debug: sinon.spy(),
        info: sinon.spy(),
        warn: sinon.spy(),
        error: sinon.spy(),
        trace: sinon.spy(),
        fatal: sinon.spy()
    } as any;
}

/**
 * Create a sample Claude completion request
 */
function createSampleRequest(text: string = 'Test prompt'): ClaudeCompletionRequest {
    return {
        prompt: text,
        options: {
            model: ClaudeModelType.CLAUDE_3_HAIKU,
            maxTokens: 100,
            temperature: 0.7
        }
    };
}

/**
 * Create a sample Claude response
 */
function createSampleResponse(content: string = 'Test response'): ClaudeResponse {
    return {
        id: 'test-id',
        content,
        model: ClaudeModelType.CLAUDE_3_HAIKU,
        format: { type: 'text' },
        timestamp: Date.now(),
        usage: {
            inputTokens: 10,
            outputTokens: 20,
            totalTokens: 30
        },
        metadata: {
            processingTimeMs: 500,
            cached: false,
            contentFiltered: false
        }
    };
}

describe('ClaudeCodeCache', () => {
    let cache: ClaudeCodeCache;
    let logger: ILogger;
    let tempDir: string;
    
    beforeEach(async () => {
        // Set up a temp directory for testing
        tempDir = path.join(os.tmpdir(), `claude-cache-test-${Date.now()}`);
        await fs.promises.mkdir(tempDir, { recursive: true });
        
        // Create a new container for each test
        const container = new Container();
        logger = createMockLogger();
        container.bind(ILogger).toConstantValue(logger);
        container.bind(ClaudeCodeCache).toSelf();
        
        cache = container.get(ClaudeCodeCache);
        await cache.initialize({
            persistToDisk: true,
            cacheDir: tempDir,
            ttl: 1000 // 1 second TTL for faster testing
        });
    });
    
    afterEach(async () => {
        // Clean up temp directory
        try {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
            console.error('Error cleaning up temp directory:', error);
        }
    });
    
    it('should store and retrieve cached values', async () => {
        const request = createSampleRequest();
        const response = createSampleResponse();
        
        await cache.set(request, response);
        const cached = await cache.get(request);
        
        expect(cached).to.not.be.null;
        expect(cached?.content).to.equal(response.content);
        expect(cached?.id).to.equal(response.id);
        
        // Check that metadata.cached is set to true
        expect(cached?.metadata.cached).to.be.true;
    });
    
    it('should return null for non-existent cache entries', async () => {
        const request = createSampleRequest();
        const result = await cache.get(request);
        expect(result).to.be.null;
    });
    
    it('should handle cache expiration', async () => {
        const request = createSampleRequest();
        const response = createSampleResponse();
        
        await cache.set(request, response);
        
        // Verify it's in the cache
        let cached = await cache.get(request);
        expect(cached).to.not.be.null;
        
        // Wait for TTL to expire
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Should now return null
        cached = await cache.get(request);
        expect(cached).to.be.null;
    });
    
    it('should invalidate specific cache entries', async () => {
        const request1 = createSampleRequest('Request 1');
        const request2 = createSampleRequest('Request 2');
        const response1 = createSampleResponse('Response 1');
        const response2 = createSampleResponse('Response 2');
        
        await cache.set(request1, response1);
        await cache.set(request2, response2);
        
        // Both should be in cache
        expect(await cache.get(request1)).to.not.be.null;
        expect(await cache.get(request2)).to.not.be.null;
        
        // Invalidate just request1
        await cache.invalidate(request1);
        
        // request1 should be gone, request2 should remain
        expect(await cache.get(request1)).to.be.null;
        expect(await cache.get(request2)).to.not.be.null;
    });
    
    it('should clear the entire cache', async () => {
        const request1 = createSampleRequest('Request 1');
        const request2 = createSampleRequest('Request 2');
        const response1 = createSampleResponse('Response 1');
        const response2 = createSampleResponse('Response 2');
        
        await cache.set(request1, response1);
        await cache.set(request2, response2);
        
        // Both should be in cache
        expect(await cache.get(request1)).to.not.be.null;
        expect(await cache.get(request2)).to.not.be.null;
        
        // Clear cache
        await cache.clear();
        
        // Both should be gone
        expect(await cache.get(request1)).to.be.null;
        expect(await cache.get(request2)).to.be.null;
    });
    
    it('should track cache metrics', async () => {
        const request = createSampleRequest();
        const response = createSampleResponse();
        
        // Initial metrics
        const initialMetrics = cache.getMetrics();
        expect(initialMetrics.hits).to.equal(0);
        expect(initialMetrics.misses).to.equal(0);
        
        // Miss
        await cache.get(request);
        expect(cache.getMetrics().misses).to.equal(1);
        
        // Add to cache
        await cache.set(request, response);
        
        // Hit
        await cache.get(request);
        const metrics = cache.getMetrics();
        expect(metrics.hits).to.equal(1);
        expect(metrics.misses).to.equal(1);
        expect(metrics.hitRate).to.equal(0.5); // 1 hit out of 2 requests
    });
    
    it('should handle file dependencies for invalidation', async () => {
        const request = createSampleRequest();
        const response = createSampleResponse();
        const filePath = path.join(tempDir, 'test-dependency.txt');
        
        // Create the file
        await fs.promises.writeFile(filePath, 'Initial content');
        
        // Cache with file dependency
        await cache.set(request, response, [filePath]);
        
        // Should be in cache
        expect(await cache.get(request)).to.not.be.null;
        
        // Modify the file
        await fs.promises.writeFile(filePath, 'Modified content');
        
        // Invalidate based on file
        const invalidated = await cache.invalidateByFiles([filePath]);
        expect(invalidated).to.equal(1);
        
        // Should now be gone from cache
        expect(await cache.get(request)).to.be.null;
    });
    
    it('should deduplicate in-flight requests', async () => {
        const request = createSampleRequest();
        
        // Create a fake promise that will resolve after some time
        const responsePromise = new Promise<ClaudeResponse>(resolve => {
            setTimeout(() => {
                resolve(createSampleResponse());
            }, 100);
        });
        
        // Register the in-flight request
        cache.registerInFlightRequest(request, responsePromise);
        
        // Get the in-flight request
        const inFlightRequest = cache.getInFlightRequest(request);
        expect(inFlightRequest).to.equal(responsePromise);
        
        // Wait for it to complete
        await responsePromise;
        
        // Should no longer be in-flight
        expect(cache.getInFlightRequest(request)).to.be.null;
    });
    
    it('should respect useCache option in request', async () => {
        const request: ClaudeCompletionRequest = {
            prompt: 'Test prompt',
            options: {
                useCache: false
            }
        };
        
        const response = createSampleResponse();
        
        // Try to set in cache - should be skipped due to useCache: false
        await cache.set(request, response);
        
        // Should not be in cache
        expect(await cache.get(request)).to.be.null;
    });
});

// Integration tests for cache persistency
describe('ClaudeCodeCache Persistence', () => {
    let cache: ClaudeCodeCache;
    let logger: ILogger;
    let tempDir: string;
    
    beforeEach(async () => {
        // Set up a temp directory for testing
        tempDir = path.join(os.tmpdir(), `claude-cache-test-${Date.now()}`);
        await fs.promises.mkdir(tempDir, { recursive: true });
        
        // Create the logger
        logger = createMockLogger();
    });
    
    afterEach(async () => {
        // Clean up temp directory
        try {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
            console.error('Error cleaning up temp directory:', error);
        }
    });
    
    it('should persist and restore cache entries from disk', async () => {
        // Create first cache instance
        const container1 = new Container();
        container1.bind(ILogger).toConstantValue(logger);
        container1.bind(ClaudeCodeCache).toSelf();
        
        const cache1 = container1.get(ClaudeCodeCache);
        await cache1.initialize({
            persistToDisk: true,
            cacheDir: tempDir,
            ttl: 3600000 // 1 hour
        });
        
        // Add some entries
        const request1 = createSampleRequest('Request 1');
        const request2 = createSampleRequest('Request 2');
        const response1 = createSampleResponse('Response 1');
        const response2 = createSampleResponse('Response 2');
        
        await cache1.set(request1, response1);
        await cache1.set(request2, response2);
        
        // Create a new cache instance that should load from disk
        const container2 = new Container();
        container2.bind(ILogger).toConstantValue(logger);
        container2.bind(ClaudeCodeCache).toSelf();
        
        const cache2 = container2.get(ClaudeCodeCache);
        await cache2.initialize({
            persistToDisk: true,
            cacheDir: tempDir,
            ttl: 3600000
        });
        
        // Check that entries were loaded
        const loadedResponse1 = await cache2.get(request1);
        const loadedResponse2 = await cache2.get(request2);
        
        expect(loadedResponse1).to.not.be.null;
        expect(loadedResponse2).to.not.be.null;
        expect(loadedResponse1?.content).to.equal('Response 1');
        expect(loadedResponse2?.content).to.equal('Response 2');
    });
});