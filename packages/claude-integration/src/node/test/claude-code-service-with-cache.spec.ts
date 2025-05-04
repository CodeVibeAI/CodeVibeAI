import * as chai from 'chai';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import axios from 'axios';
import { Container } from 'inversify';
import { ILogger } from '@theia/core';
import { FileSystemWatcher } from '@theia/filesystem/lib/browser/filesystem-watcher';
import { PreferenceService } from '@theia/core/lib/browser/preferences';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';

import { ClaudeCodeCache } from '../claude-code-cache';
import { ClaudeCodeServiceImpl } from '../claude-code-service';
import { ClaudeCodeCacheInvalidator } from '../claude-code-cache-invalidator';
import { 
    ClaudeModelType, 
    ClaudeCompletionRequest,
    ClaudeResponse,
    ClaudeCodeService
} from '../../common/claude-code-protocol';

chai.use(sinonChai);

/**
 * Create mock dependencies for testing
 */
function createMockDependencies() {
    return {
        logger: {
            debug: sinon.spy(),
            info: sinon.spy(),
            warn: sinon.spy(),
            error: sinon.spy(),
            trace: sinon.spy(),
            fatal: sinon.spy()
        } as any as ILogger,
        
        fileSystemWatcher: {
            onFilesChanged: sinon.stub().returns({ dispose: () => {} })
        } as any as FileSystemWatcher,
        
        preferenceService: {
            onPreferenceChanged: sinon.stub().returns({ dispose: () => {} })
        } as any as PreferenceService,
        
        workspaceService: {
            onWorkspaceChanged: sinon.stub().returns({ dispose: () => {} }),
            tryGetRoots: sinon.stub().returns([])
        } as any as WorkspaceService
    };
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

describe('ClaudeCodeService with Cache Integration', () => {
    let service: ClaudeCodeService;
    let cache: ClaudeCodeCache;
    let invalidator: ClaudeCodeCacheInvalidator;
    let deps: ReturnType<typeof createMockDependencies>;
    let tempDir: string;
    let axiosPostStub: sinon.SinonStub;
    
    beforeEach(async () => {
        // Set up a temp directory for testing
        tempDir = path.join(os.tmpdir(), `claude-service-test-${Date.now()}`);
        await fs.promises.mkdir(tempDir, { recursive: true });
        
        // Create mocks
        deps = createMockDependencies();
        
        // Create a new container for each test
        const container = new Container();
        container.bind(ILogger).toConstantValue(deps.logger);
        container.bind(FileSystemWatcher).toConstantValue(deps.fileSystemWatcher);
        container.bind(PreferenceService).toConstantValue(deps.preferenceService);
        container.bind(WorkspaceService).toConstantValue(deps.workspaceService);
        container.bind(ClaudeCodeCache).toSelf().inSingletonScope();
        container.bind(ClaudeCodeCacheInvalidator).toSelf().inSingletonScope();
        container.bind(ClaudeCodeService).to(ClaudeCodeServiceImpl).inSingletonScope();
        
        // Get services
        cache = container.get(ClaudeCodeCache);
        invalidator = container.get(ClaudeCodeCacheInvalidator);
        service = container.get(ClaudeCodeService);
        
        // Initialize cache
        await cache.initialize({
            persistToDisk: true,
            cacheDir: tempDir,
            ttl: 1000 // 1 second TTL for faster testing
        });
        
        // Initialize service with test API key
        (service as any).apiKey = 'test-api-key';
        (service as any).ready = true;
        (service as any).setupClient();
        
        // Stub axios post
        axiosPostStub = sinon.stub(axios, 'post').resolves({
            status: 200,
            data: {
                id: 'test-id',
                content: [{ type: 'text', text: 'API response' }],
                model: ClaudeModelType.CLAUDE_3_HAIKU,
                usage: {
                    input_tokens: 10,
                    output_tokens: 20
                }
            },
            headers: {}
        });
    });
    
    afterEach(async () => {
        // Clean up temp directory
        try {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
            console.error('Error cleaning up temp directory:', error);
        }
        
        // Restore stubs
        axiosPostStub.restore();
    });
    
    it('should use cache for repeated identical requests', async () => {
        const request = createSampleRequest();
        
        // First request should go to API
        const response1 = await service.complete(request);
        expect(response1.content).to.equal('API response');
        expect(axiosPostStub.callCount).to.equal(1);
        
        // Second identical request should use cache
        const response2 = await service.complete(request);
        expect(response2.content).to.equal('API response');
        expect(axiosPostStub.callCount).to.equal(1); // Still just one API call
        
        // Response should be marked as cached
        expect(response2.metadata.cached).to.be.true;
    });
    
    it('should bypass cache when useCache is false', async () => {
        const request = createSampleRequest();
        request.options = { ...request.options, useCache: false };
        
        // First request should go to API
        const response1 = await service.complete(request);
        expect(response1.content).to.equal('API response');
        expect(axiosPostStub.callCount).to.equal(1);
        
        // Second identical request should also go to API
        const response2 = await service.complete(request);
        expect(response2.content).to.equal('API response');
        expect(axiosPostStub.callCount).to.equal(2); // Two API calls
        
        // Response should not be marked as cached
        expect(response2.metadata.cached).to.be.false;
    });
    
    it('should clear cache on command', async () => {
        const request1 = createSampleRequest('Request 1');
        const request2 = createSampleRequest('Request 2');
        
        // Make two requests
        await service.complete(request1);
        await service.complete(request2);
        expect(axiosPostStub.callCount).to.equal(2);
        
        // Repeat to use cache
        await service.complete(request1);
        await service.complete(request2);
        expect(axiosPostStub.callCount).to.equal(2); // No new API calls
        
        // Clear cache
        await service.clearCache();
        
        // Repeat requests - should go to API again
        await service.complete(request1);
        await service.complete(request2);
        expect(axiosPostStub.callCount).to.equal(4); // Two new API calls
    });
    
    it('should track and deduplicate in-flight requests', async () => {
        const request = createSampleRequest();
        
        // Make simultaneous requests with the same content
        const promise1 = service.complete(request);
        const promise2 = service.complete(request);
        
        // Both should resolve
        const [response1, response2] = await Promise.all([promise1, promise2]);
        
        // But only one API call should have been made
        expect(axiosPostStub.callCount).to.equal(1);
        expect(response1.content).to.equal('API response');
        expect(response2.content).to.equal('API response');
    });
    
    it('should handle cache expiration', async () => {
        const request = createSampleRequest();
        
        // First request should go to API
        await service.complete(request);
        expect(axiosPostStub.callCount).to.equal(1);
        
        // Repeat immediately - should use cache
        await service.complete(request);
        expect(axiosPostStub.callCount).to.equal(1);
        
        // Wait for TTL to expire
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Request again - should go to API
        await service.complete(request);
        expect(axiosPostStub.callCount).to.equal(2);
    });
    
    it('should not cache streaming requests', async () => {
        const request = createSampleRequest();
        
        // Mock a streaming response
        const mockResponse = {
            status: 200,
            data: {
                on: (event: string, callback: any) => {
                    if (event === 'data') {
                        callback(Buffer.from('data: {"type":"content_block_delta","delta":{"text":"Test"}}'));
                        callback(Buffer.from('data: [DONE]'));
                    } else if (event === 'end') {
                        setTimeout(() => callback(), 10);
                    }
                }
            },
            headers: {}
        };
        
        axiosPostStub.resolves(mockResponse as any);
        
        // Make streaming request
        await service.streamComplete(request);
        expect(axiosPostStub.callCount).to.equal(1);
        
        // Streaming request should have set useCache to false
        expect(axiosPostStub.firstCall.args[1].stream).to.be.true;
        
        // Reset stub for next call
        axiosPostStub.resetHistory();
        axiosPostStub.resolves({
            status: 200,
            data: {
                id: 'test-id',
                content: [{ type: 'text', text: 'API response' }],
                model: ClaudeModelType.CLAUDE_3_HAIKU,
                usage: {
                    input_tokens: 10,
                    output_tokens: 20
                }
            },
            headers: {}
        });
        
        // Make standard request - should go to API, not use cache
        await service.complete(request);
        expect(axiosPostStub.callCount).to.equal(1);
    });
});

describe('Cache Invalidation Integration Tests', () => {
    let service: ClaudeCodeService;
    let cache: ClaudeCodeCache;
    let invalidator: ClaudeCodeCacheInvalidator;
    let deps: ReturnType<typeof createMockDependencies>;
    let tempDir: string;
    let axiosPostStub: sinon.SinonStub;
    
    beforeEach(async () => {
        // Set up a temp directory for testing
        tempDir = path.join(os.tmpdir(), `claude-invalidator-test-${Date.now()}`);
        await fs.promises.mkdir(tempDir, { recursive: true });
        
        // Create mocks
        deps = createMockDependencies();
        
        // Create a new container for each test
        const container = new Container();
        container.bind(ILogger).toConstantValue(deps.logger);
        container.bind(FileSystemWatcher).toConstantValue(deps.fileSystemWatcher);
        container.bind(PreferenceService).toConstantValue(deps.preferenceService);
        container.bind(WorkspaceService).toConstantValue(deps.workspaceService);
        container.bind(ClaudeCodeCache).toSelf().inSingletonScope();
        container.bind(ClaudeCodeCacheInvalidator).toSelf().inSingletonScope();
        container.bind(ClaudeCodeService).to(ClaudeCodeServiceImpl).inSingletonScope();
        
        // Get services
        cache = container.get(ClaudeCodeCache);
        invalidator = container.get(ClaudeCodeCacheInvalidator);
        service = container.get(ClaudeCodeService);
        
        // Initialize cache
        await cache.initialize({
            persistToDisk: true,
            cacheDir: tempDir,
            ttl: 3600000 // 1 hour
        });
        
        // Initialize invalidator
        await invalidator.initialize({
            enabled: true,
            expirationCheckInterval: 100, // 100ms for faster testing
            fileChangeMonitoring: true,
            watchFilePatterns: ['**/*.{js,ts}'],
            configChangeMonitoring: true,
            entryTtl: 3600000, // 1 hour
            invalidateOnUpdate: true,
            maxStorageSize: 1024 * 1024 // 1MB
        });
        
        // Initialize service with test API key
        (service as any).apiKey = 'test-api-key';
        (service as any).ready = true;
        (service as any).setupClient();
        
        // Stub axios post
        axiosPostStub = sinon.stub(axios, 'post').resolves({
            status: 200,
            data: {
                id: 'test-id',
                content: [{ type: 'text', text: 'API response' }],
                model: ClaudeModelType.CLAUDE_3_HAIKU,
                usage: {
                    input_tokens: 10,
                    output_tokens: 20
                }
            },
            headers: {}
        });
    });
    
    afterEach(async () => {
        // Clean up temp directory
        try {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
            console.error('Error cleaning up temp directory:', error);
        }
        
        // Restore stubs
        axiosPostStub.restore();
    });
    
    it('should invalidate cache based on file dependencies', async () => {
        // Create a test file
        const testFilePath = path.join(tempDir, 'test-file.js');
        await fs.promises.writeFile(testFilePath, 'console.log("Initial content");');
        
        // Create a request with the file as a dependency
        const request: ClaudeCompletionRequest = {
            prompt: 'Analyze this code',
            codeContext: {
                language: 'javascript',
                filePath: testFilePath,
                surroundingCode: 'console.log("Initial content");'
            }
        };
        
        // Make a request
        await service.complete(request);
        expect(axiosPostStub.callCount).to.equal(1);
        
        // Repeat - should use cache
        await service.complete(request);
        expect(axiosPostStub.callCount).to.equal(1);
        
        // Simulate a file change event
        const fileChangeCallback = deps.fileSystemWatcher.onFilesChanged.firstCall.args[0];
        fileChangeCallback([{
            uri: FileUri.create(testFilePath).toString(),
            type: 1 // FileChangeType.UPDATED
        }]);
        
        // Give time for async invalidation
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Request again - should go to API
        await service.complete(request);
        expect(axiosPostStub.callCount).to.equal(2);
    });
    
    it('should invalidate cache based on preference changes', async () => {
        const request = createSampleRequest();
        
        // Make a request
        await service.complete(request);
        expect(axiosPostStub.callCount).to.equal(1);
        
        // Repeat - should use cache
        await service.complete(request);
        expect(axiosPostStub.callCount).to.equal(1);
        
        // Simulate a preference change
        const preferenceChangeCallback = deps.preferenceService.onPreferenceChanged.firstCall.args[0];
        preferenceChangeCallback({
            preferenceName: 'claude.model',
            newValue: 'claude-3-opus-20240229',
            oldValue: 'claude-3-sonnet-20240229',
            scope: 'user' as any,
            domain: 'user' as any
        });
        
        // Give time for async invalidation
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Request again - should go to API
        await service.complete(request);
        expect(axiosPostStub.callCount).to.equal(2);
    });
});