import { expect } from 'chai';
import { Container } from 'inversify';
import { ILogger } from '@theia/core';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';
import * as child_process from 'child_process';
import { Context7MCPManager } from './context7-mcp-manager';
import { MCPServerOptions, MCPServerStatus } from '../common/context7-protocol';

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
 * Creates a mock ChildProcess
 */
function createMockChildProcess() {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const process = new EventEmitter();
  
  process.stdout = stdout;
  process.stderr = stderr;
  process.kill = sinon.stub().returns(true);
  process.pid = 12345;
  
  return process as unknown as child_process.ChildProcess;
}

describe('Context7MCPManager', () => {
  let mcpManager: Context7MCPManager;
  let container: Container;
  let sandbox: sinon.SinonSandbox;
  let mockLogger: ILogger;
  let fsExistsSyncStub: sinon.SinonStub;
  let fsMkdirStub: sinon.SinonStub;
  let fsReadFileStub: sinon.SinonStub;
  let fsWriteFileStub: sinon.SinonStub;
  let fsUnlinkStub: sinon.SinonStub;
  let spawnStub: sinon.SinonStub;
  let processKillStub: sinon.SinonStub;
  let mockConfig: any;
  let mockChildProcess: any;
  
  const testConfigPath = path.join(os.homedir(), '.theia', 'mcp.json');
  const testPidFile = path.join(os.tmpdir(), 'context7-mcp.pid');
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    mockLogger = new MockLogger();
    
    // Mock file system operations
    fsExistsSyncStub = sandbox.stub(fs, 'existsSync');
    fsMkdirStub = sandbox.stub(fs.promises, 'mkdir').resolves();
    fsReadFileStub = sandbox.stub(fs.promises, 'readFile');
    fsWriteFileStub = sandbox.stub(fs.promises, 'writeFile').resolves();
    fsUnlinkStub = sandbox.stub(fs.promises, 'unlink').resolves();
    
    // Mock child_process.spawn
    mockChildProcess = createMockChildProcess();
    spawnStub = sandbox.stub(child_process, 'spawn').returns(mockChildProcess);
    
    // Mock process.kill
    processKillStub = sandbox.stub(process, 'kill');
    
    // Default configuration
    mockConfig = {
      mcpServers: {
        context7: {
          command: 'npx',
          args: ['-y', '@upstash/context7-mcp@latest'],
          autoStart: true,
          env: {
            DEFAULT_MINIMUM_TOKENS: '5000',
            PORT: '51234',
            LOG_LEVEL: 'info'
          }
        }
      }
    };
    
    // Create a container for dependency injection
    container = new Container();
    container.bind(ILogger).toConstantValue(mockLogger);
    container.bind(Context7MCPManager).toSelf().inSingletonScope();
    
    // Get the MCP manager instance
    mcpManager = container.get(Context7MCPManager);
    
    // Make sure we don't wait in tests
    sandbox.stub(mcpManager as any, 'sleep').resolves();
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('initialization', () => {
    it('should initialize and check for existing server', async () => {
      // Mock no existing config or server
      fsExistsSyncStub.returns(false);
      
      await mcpManager.initialize();
      
      // Verify that PID file was checked
      expect(fsExistsSyncStub.calledWith(testPidFile)).to.be.true;
    });
    
    it('should detect an existing server from PID file', async () => {
      // Mock existing PID file
      fsExistsSyncStub.withArgs(testPidFile).returns(true);
      fsReadFileStub.withArgs(testPidFile, 'utf8').resolves('12345');
      
      // Mock that process exists
      processKillStub.returns(true);
      
      await mcpManager.initialize();
      
      // Verify process.kill was called with signal 0 to check existence
      expect(processKillStub.calledWith(12345, 0)).to.be.true;
    });
    
    it('should auto-start server if configured', async () => {
      // Mock existing config with auto-start
      fsExistsSyncStub.withArgs(testConfigPath).returns(true);
      fsReadFileStub.withArgs(testConfigPath, 'utf8').resolves(JSON.stringify(mockConfig));
      
      // Mock existing PID file but process not running
      fsExistsSyncStub.withArgs(testPidFile).returns(true);
      fsReadFileStub.withArgs(testPidFile, 'utf8').resolves('12345');
      processKillStub.throws({ code: 'ESRCH' });
      
      // Stub startMCPServer to avoid full execution
      const startStub = sandbox.stub(mcpManager, 'startMCPServer').resolves(true);
      
      await mcpManager.initialize();
      
      // Verify server was started
      expect(startStub.calledOnce).to.be.true;
    });
  });
  
  describe('configureMCPServer', () => {
    it('should create new configuration when enabled', async () => {
      // Mock directory and file don't exist
      fsExistsSyncStub.returns(false);
      
      const options: MCPServerOptions = {
        enabled: true,
        autoStart: true,
        minTokens: 10000,
        port: 51235,
        logLevel: 'debug'
      };
      
      const result = await mcpManager.configureMCPServer(options);
      
      // Verify directory was created
      expect(fsMkdirStub.calledWith(path.dirname(testConfigPath), { recursive: true })).to.be.true;
      
      // Verify file was written with correct content
      expect(fsWriteFileStub.calledOnce).to.be.true;
      
      const writtenConfig = JSON.parse(fsWriteFileStub.firstCall.args[1]);
      expect(writtenConfig.mcpServers.context7).to.exist;
      expect(writtenConfig.mcpServers.context7.autoStart).to.equal(true);
      expect(writtenConfig.mcpServers.context7.env.DEFAULT_MINIMUM_TOKENS).to.equal('10000');
      expect(writtenConfig.mcpServers.context7.env.PORT).to.equal('51235');
      expect(writtenConfig.mcpServers.context7.env.LOG_LEVEL).to.equal('debug');
      
      // Verify result
      expect(result).to.be.true;
    });
    
    it('should update existing configuration', async () => {
      // Mock file exists with existing config
      fsExistsSyncStub.returns(true);
      fsReadFileStub.withArgs(testConfigPath, 'utf8').resolves(JSON.stringify(mockConfig));
      
      const options: MCPServerOptions = {
        enabled: true,
        autoStart: false,
        minTokens: 20000
      };
      
      const result = await mcpManager.configureMCPServer(options);
      
      // Verify file was written with updated content
      expect(fsWriteFileStub.calledOnce).to.be.true;
      
      const writtenConfig = JSON.parse(fsWriteFileStub.firstCall.args[1]);
      expect(writtenConfig.mcpServers.context7.autoStart).to.equal(false);
      expect(writtenConfig.mcpServers.context7.env.DEFAULT_MINIMUM_TOKENS).to.equal('20000');
      
      // Original values should be preserved
      expect(writtenConfig.mcpServers.context7.env.PORT).to.equal('51234');
      expect(writtenConfig.mcpServers.context7.env.LOG_LEVEL).to.equal('info');
      
      // Verify result
      expect(result).to.be.true;
    });
    
    it('should remove configuration when disabled', async () => {
      // Mock file exists with existing config
      fsExistsSyncStub.returns(true);
      fsReadFileStub.withArgs(testConfigPath, 'utf8').resolves(JSON.stringify(mockConfig));
      
      const options: MCPServerOptions = {
        enabled: false,
        autoStart: false
      };
      
      const result = await mcpManager.configureMCPServer(options);
      
      // Verify file was written with updated content
      expect(fsWriteFileStub.calledOnce).to.be.true;
      
      const writtenConfig = JSON.parse(fsWriteFileStub.firstCall.args[1]);
      expect(writtenConfig.mcpServers.context7).to.be.undefined;
      
      // Verify result
      expect(result).to.be.true;
    });
    
    it('should handle file system errors', async () => {
      // Mock file system error
      fsExistsSyncStub.returns(true);
      fsReadFileStub.withArgs(testConfigPath, 'utf8').rejects(new Error('File system error'));
      
      const options: MCPServerOptions = {
        enabled: true,
        autoStart: true
      };
      
      const result = await mcpManager.configureMCPServer(options);
      
      // Verify result indicates failure
      expect(result).to.be.false;
    });
  });
  
  describe('getMCPStatus', () => {
    it('should return disabled status when config doesn\'t exist', async () => {
      // Mock no config file
      fsExistsSyncStub.withArgs(testConfigPath).returns(false);
      
      const status = await mcpManager.getMCPStatus();
      
      expect(status.enabled).to.be.false;
      expect(status.running).to.be.false;
    });
    
    it('should return enabled but not running when not started', async () => {
      // Mock config exists but no running process
      fsExistsSyncStub.withArgs(testConfigPath).returns(true);
      fsReadFileStub.withArgs(testConfigPath, 'utf8').resolves(JSON.stringify(mockConfig));
      
      // No PID file
      fsExistsSyncStub.withArgs(testPidFile).returns(false);
      
      const status = await mcpManager.getMCPStatus();
      
      expect(status.enabled).to.be.true;
      expect(status.running).to.be.false;
    });
    
    it('should return running status with details when running', async () => {
      // Mock config exists
      fsExistsSyncStub.withArgs(testConfigPath).returns(true);
      fsReadFileStub.withArgs(testConfigPath, 'utf8').resolves(JSON.stringify(mockConfig));
      
      // Mock running process via private field
      (mcpManager as any).mcpProcess = mockChildProcess;
      (mcpManager as any).serverStartTime = Date.now() - 60000; // Started 1 minute ago
      (mcpManager as any).connectedClients = 3;
      (mcpManager as any).serverVersion = '1.2.3';
      
      const status = await mcpManager.getMCPStatus();
      
      expect(status.enabled).to.be.true;
      expect(status.running).to.be.true;
      expect(status.port).to.equal(51234);
      expect(status.uptime).to.be.at.least(59); // At least 59 seconds
      expect(status.connectedClients).to.equal(3);
      expect(status.version).to.equal('1.2.3');
    });
    
    it('should detect running process from PID file', async () => {
      // Mock config exists
      fsExistsSyncStub.withArgs(testConfigPath).returns(true);
      fsReadFileStub.withArgs(testConfigPath, 'utf8').resolves(JSON.stringify(mockConfig));
      
      // Mock PID file exists with running process
      fsExistsSyncStub.withArgs(testPidFile).returns(true);
      fsReadFileStub.withArgs(testPidFile, 'utf8').resolves('12345');
      processKillStub.returns(true); // Process exists
      
      const status = await mcpManager.getMCPStatus();
      
      expect(status.enabled).to.be.true;
      expect(status.running).to.be.true;
    });
  });
  
  describe('enableMCPServer', () => {
    it('should configure and start the server', async () => {
      // Stub the methods to verify calls
      const configureStub = sandbox.stub(mcpManager, 'configureMCPServer').resolves(true);
      const startStub = sandbox.stub(mcpManager, 'startMCPServer').resolves(true);
      const getStatusStub = sandbox.stub(mcpManager, 'getMCPStatus').resolves({ 
        enabled: true, 
        running: true 
      });
      
      const result = await mcpManager.enableMCPServer();
      
      // Verify each step was called
      expect(configureStub.calledOnce).to.be.true;
      expect(startStub.calledOnce).to.be.true;
      expect(getStatusStub.calledOnce).to.be.true;
      
      // Verify result
      expect(result).to.be.true;
    });
    
    it('should return false if configuration fails', async () => {
      // Stub configure to fail
      sandbox.stub(mcpManager, 'configureMCPServer').resolves(false);
      
      const result = await mcpManager.enableMCPServer();
      
      // Verify result
      expect(result).to.be.false;
    });
    
    it('should return false if server fails to start', async () => {
      // Stub configure to succeed but start to fail
      sandbox.stub(mcpManager, 'configureMCPServer').resolves(true);
      sandbox.stub(mcpManager, 'startMCPServer').resolves(false);
      
      const result = await mcpManager.enableMCPServer();
      
      // Verify result
      expect(result).to.be.false;
    });
  });
  
  describe('disableMCPServer', () => {
    it('should stop and remove configuration', async () => {
      // Stub the methods to verify calls
      const stopStub = sandbox.stub(mcpManager, 'stopMCPServer').resolves(true);
      const configureStub = sandbox.stub(mcpManager, 'configureMCPServer').resolves(true);
      
      const result = await mcpManager.disableMCPServer();
      
      // Verify each step was called
      expect(stopStub.calledOnce).to.be.true;
      expect(configureStub.calledOnce).to.be.true;
      expect(configureStub.firstCall.args[0].enabled).to.be.false;
      
      // Verify result
      expect(result).to.be.true;
    });
    
    it('should continue if stop fails but warn', async () => {
      // Spy on logger
      const warnSpy = sandbox.spy(mockLogger, 'warn');
      
      // Stub stop to fail but configure to succeed
      sandbox.stub(mcpManager, 'stopMCPServer').resolves(false);
      sandbox.stub(mcpManager, 'configureMCPServer').resolves(true);
      
      const result = await mcpManager.disableMCPServer();
      
      // Verify warning was logged
      expect(warnSpy.calledOnce).to.be.true;
      
      // Verify result is still true since configuration succeeded
      expect(result).to.be.true;
    });
  });
  
  describe('startMCPServer', () => {
    beforeEach(() => {
      // Common setup for start tests
      fsExistsSyncStub.withArgs(testConfigPath).returns(true);
      fsReadFileStub.withArgs(testConfigPath, 'utf8').resolves(JSON.stringify(mockConfig));
    });
    
    it('should not start if not configured', async () => {
      // Mock not configured
      sandbox.stub(mcpManager, 'getMCPStatus').resolves({ enabled: false, running: false });
      
      const result = await mcpManager.startMCPServer();
      
      // Verify not started
      expect(spawnStub.called).to.be.false;
      expect(result).to.be.false;
    });
    
    it('should not start if already running', async () => {
      // Mock already running
      sandbox.stub(mcpManager, 'getMCPStatus').resolves({ enabled: true, running: true });
      
      const result = await mcpManager.startMCPServer();
      
      // Verify not started
      expect(spawnStub.called).to.be.false;
      expect(result).to.be.true; // Returns true because it's already running
    });
    
    it('should start server and wait for ready message', async () => {
      // Mock configured but not running
      sandbox.stub(mcpManager, 'getMCPStatus').resolves({ enabled: true, running: false });
      
      // Start the server
      const startPromise = mcpManager.startMCPServer();
      
      // Simulate server startup message
      process.nextTick(() => {
        mockChildProcess.stdout.emit('data', 'Server started on port 51234 (version 1.2.3)');
      });
      
      const result = await startPromise;
      
      // Verify server was started with correct args
      expect(spawnStub.calledOnce).to.be.true;
      expect(spawnStub.firstCall.args[0]).to.equal('npx');
      expect(spawnStub.firstCall.args[1]).to.deep.equal(['-y', '@upstash/context7-mcp@latest']);
      
      // Verify PID was saved
      expect(fsWriteFileStub.calledWith(testPidFile)).to.be.true;
      
      // Verify result
      expect(result).to.be.true;
      
      // Verify server info was captured
      expect((mcpManager as any).serverVersion).to.equal('1.2.3');
    });
    
    it('should handle server startup errors', async () => {
      // Mock configured but not running
      sandbox.stub(mcpManager, 'getMCPStatus').resolves({ enabled: true, running: false });
      
      // Start the server
      const startPromise = mcpManager.startMCPServer();
      
      // Simulate server error
      process.nextTick(() => {
        mockChildProcess.stderr.emit('data', 'Error: Address already in use');
      });
      
      // Force the promise to resolve (in actual code, there would be a timeout)
      process.nextTick(() => {
        mockChildProcess.emit('exit', 1);
      });
      
      const result = await startPromise;
      
      // Verify result
      expect(result).to.be.false;
    });
    
    it('should cleanup on server exit', async () => {
      // Mock configured but not running
      sandbox.stub(mcpManager, 'getMCPStatus').resolves({ enabled: true, running: false });
      
      // Start the server successfully
      const startPromise = mcpManager.startMCPServer();
      
      // Simulate server startup
      process.nextTick(() => {
        mockChildProcess.stdout.emit('data', 'Server started on port 51234');
      });
      
      await startPromise;
      
      // Now simulate server exit
      mockChildProcess.emit('exit', 0);
      
      // Verify PID file was removed
      expect(fsUnlinkStub.calledWith(testPidFile)).to.be.true;
      
      // Verify process reference was cleared
      expect((mcpManager as any).mcpProcess).to.be.null;
    });
  });
  
  describe('stopMCPServer', () => {
    it('should stop running server gracefully', async () => {
      // Set up running server
      (mcpManager as any).mcpProcess = mockChildProcess;
      
      // Stop the server
      const stopPromise = mcpManager.stopMCPServer();
      
      // Simulate graceful exit
      process.nextTick(() => {
        mockChildProcess.emit('exit', 0);
      });
      
      const result = await stopPromise;
      
      // Verify SIGTERM was sent
      expect(mockChildProcess.kill.calledWith('SIGTERM')).to.be.true;
      
      // Verify PID file was removed
      expect(fsUnlinkStub.calledWith(testPidFile)).to.be.true;
      
      // Verify result
      expect(result).to.be.true;
    });
    
    it('should force kill if server doesn\'t exit gracefully', async () => {
      // Set up running server that doesn't exit gracefully
      (mcpManager as any).mcpProcess = mockChildProcess;
      
      // Prevent normal timeout waiting by resolving immediately
      // In a real implementation, this would be handled by a timeout
      const origPromise = Promise.prototype.then;
      sandbox.stub(Promise.prototype, 'then').callsFake(function(this: Promise<any>, onfulfilled, onrejected) {
        if (onfulfilled && onfulfilled.toString().includes('timeout')) {
          // This is the timeout handler, call it directly
          return Promise.resolve((onfulfilled as Function)());
        }
        return origPromise.call(this, onfulfilled, onrejected);
      });
      
      const result = await mcpManager.stopMCPServer();
      
      // Verify SIGKILL was sent after SIGTERM
      expect(mockChildProcess.kill.calledWith('SIGKILL')).to.be.true;
      
      // Verify result
      expect(result).to.be.true;
    });
    
    it('should handle errors when killing the process', async () => {
      // Set up running server that throws when killed
      (mcpManager as any).mcpProcess = mockChildProcess;
      mockChildProcess.kill.throws(new Error('Kill failed'));
      
      const result = await mcpManager.stopMCPServer();
      
      // Verify result indicates failure
      expect(result).to.be.false;
    });
    
    it('should stop server using PID file if no process reference', async () => {
      // No current process reference but PID file exists
      fsExistsSyncStub.withArgs(testPidFile).returns(true);
      fsReadFileStub.withArgs(testPidFile, 'utf8').resolves('12345');
      
      // Mock process exists
      processKillStub.returns(true);
      
      const result = await mcpManager.stopMCPServer();
      
      // Verify kill was called with SIGTERM
      expect(processKillStub.calledWith(12345, 'SIGTERM')).to.be.true;
      
      // Verify PID file was removed
      expect(fsUnlinkStub.calledWith(testPidFile)).to.be.true;
      
      // Verify result
      expect(result).to.be.true;
    });
  });
});