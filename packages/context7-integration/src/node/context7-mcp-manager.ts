import { injectable, inject } from 'inversify';
import { ILogger } from '@theia/core';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as child_process from 'child_process';
import { MCPServerOptions, MCPServerStatus } from '../common/context7-protocol';

/**
 * Default MCP package to use
 */
const DEFAULT_MCP_PACKAGE = '@upstash/context7-mcp';

/**
 * Default MCP configuration
 */
const DEFAULT_MCP_CONFIG = {
  minTokens: 5000,
  autoStart: true,
  port: 51234,
  logLevel: 'info'
};

/**
 * MCP server command timeout (ms)
 */
const MCP_COMMAND_TIMEOUT = 15000;

/**
 * Manages the Context7 MCP server configuration and status
 */
@injectable()
export class Context7MCPManager {
  @inject(ILogger)
  protected readonly logger: ILogger;
  
  private readonly mcpConfigDir = path.join(os.homedir(), '.theia');
  private readonly mcpConfigPath = path.join(this.mcpConfigDir, 'mcp.json');
  private readonly mcpPidFile = path.join(os.tmpdir(), 'context7-mcp.pid');
  
  private mcpProcess: child_process.ChildProcess | null = null;
  private serverStartTime: number = 0;
  private connectedClients: number = 0;
  private serverVersion: string = '';
  
  /**
   * Initialize the MCP manager
   * 
   * Checks for existing MCP server and sets up event listeners 
   */
  async initialize(): Promise<void> {
    try {
      this.logger.debug('Initializing Context7 MCP manager');
      
      // Check if an MCP server is already running (from a previous session)
      await this.checkExistingServer();
      
      // Handle process exit
      process.on('exit', () => {
        this.stopMCPServer().catch(e => 
          this.logger.error('Failed to stop MCP server during shutdown:', e)
        );
      });
      
      // Auto-start server if configured
      const status = await this.getMCPStatus();
      
      if (status.enabled) {
        const config = await this.loadConfig();
        
        if (config.mcpServers?.context7?.autoStart && !status.running) {
          this.logger.info('Auto-starting Context7 MCP server');
          await this.startMCPServer();
        }
      }
    } catch (error) {
      this.logger.error('Error initializing Context7 MCP manager:', error);
    }
  }
  
  /**
   * Configure the Context7 MCP server
   * 
   * @param options Server configuration options
   * @returns True if configuration was successful
   */
  async configureMCPServer(options: MCPServerOptions): Promise<boolean> {
    try {
      // Ensure config directory exists
      if (!fs.existsSync(this.mcpConfigDir)) {
        await fs.promises.mkdir(this.mcpConfigDir, { recursive: true });
      }
      
      // Load or create config
      let config = await this.loadConfig();
      
      // Ensure mcpServers object exists
      if (!config.mcpServers) {
        config.mcpServers = {};
      }
      
      if (options.enabled) {
        // Add or update Context7 MCP server config
        config.mcpServers.context7 = {
          command: 'npx',
          args: ['-y', `${DEFAULT_MCP_PACKAGE}@latest`],
          autoStart: options.autoStart ?? DEFAULT_MCP_CONFIG.autoStart,
          env: {
            DEFAULT_MINIMUM_TOKENS: (options.minTokens ?? DEFAULT_MCP_CONFIG.minTokens).toString(),
            PORT: (options.port ?? DEFAULT_MCP_CONFIG.port).toString(),
            LOG_LEVEL: options.logLevel ?? DEFAULT_MCP_CONFIG.logLevel
          }
        };
        
        this.logger.info('Context7 MCP server configured with:', {
          autoStart: config.mcpServers.context7.autoStart,
          minTokens: options.minTokens ?? DEFAULT_MCP_CONFIG.minTokens,
          port: options.port ?? DEFAULT_MCP_CONFIG.port,
          logLevel: options.logLevel ?? DEFAULT_MCP_CONFIG.logLevel
        });
      } else {
        // Remove Context7 MCP server config if it exists
        if (config.mcpServers.context7) {
          delete config.mcpServers.context7;
          this.logger.info('Context7 MCP server configuration removed');
        }
      }
      
      // Write updated config
      await fs.promises.writeFile(
        this.mcpConfigPath, 
        JSON.stringify(config, null, 2),
        'utf8'
      );
      
      return true;
    } catch (error) {
      this.logger.error('Failed to configure Context7 MCP server:', error);
      return false;
    }
  }
  
  /**
   * Get the current MCP server status
   * 
   * @returns Current server status
   */
  async getMCPStatus(): Promise<MCPServerStatus> {
    try {
      // Check if config exists
      if (!fs.existsSync(this.mcpConfigPath)) {
        return { 
          enabled: false, 
          running: false 
        };
      }
      
      // Load config
      const config = await this.loadConfig();
      
      // Check if enabled
      const enabled = !!(config.mcpServers?.context7);
      
      // Check if running via our process
      let running = this.mcpProcess !== null && !this.mcpProcess.killed;
      
      // If not running via our process, check PID file
      if (!running) {
        running = await this.isServerRunningViaPidFile();
      }
      
      // Build status object
      const status: MCPServerStatus = {
        enabled,
        running
      };
      
      // Add additional info if running
      if (running) {
        const port = config.mcpServers?.context7?.env?.PORT || DEFAULT_MCP_CONFIG.port;
        status.port = typeof port === 'string' ? parseInt(port, 10) : port;
        
        if (this.serverStartTime > 0) {
          status.uptime = Math.floor((Date.now() - this.serverStartTime) / 1000);
        }
        
        status.connectedClients = this.connectedClients;
        
        if (this.serverVersion) {
          status.version = this.serverVersion;
        }
      }
      
      return status;
    } catch (error) {
      this.logger.error('Error checking MCP status:', error);
      return { enabled: false, running: false };
    }
  }
  
  /**
   * Enable the MCP server
   * 
   * Configure, start, and verify the MCP server
   * 
   * @returns True if the server was enabled successfully
   */
  async enableMCPServer(): Promise<boolean> {
    try {
      // Configure the server
      const configured = await this.configureMCPServer({
        enabled: true,
        autoStart: true
      });
      
      if (!configured) {
        return false;
      }
      
      // Start the server
      const started = await this.startMCPServer();
      
      // Verify it's actually running
      if (started) {
        const status = await this.getMCPStatus();
        return status.running;
      }
      
      return false;
    } catch (error) {
      this.logger.error('Failed to enable MCP server:', error);
      return false;
    }
  }
  
  /**
   * Disable the MCP server
   * 
   * Stop and remove configuration for the MCP server
   * 
   * @returns True if the server was disabled successfully
   */
  async disableMCPServer(): Promise<boolean> {
    try {
      // Stop the server if running
      const stopped = await this.stopMCPServer();
      
      if (!stopped) {
        this.logger.warn('Failed to stop MCP server during disable operation');
      }
      
      // Remove configuration
      const configured = await this.configureMCPServer({
        enabled: false,
        autoStart: false
      });
      
      return configured;
    } catch (error) {
      this.logger.error('Failed to disable MCP server:', error);
      return false;
    }
  }
  
  /**
   * Start the MCP server if not already running
   * 
   * @returns True if the server was started or is already running
   */
  async startMCPServer(): Promise<boolean> {
    try {
      const status = await this.getMCPStatus();
      
      if (!status.enabled) {
        this.logger.warn('Cannot start MCP server: not configured');
        return false;
      }
      
      if (status.running) {
        this.logger.debug('MCP server already running');
        return true;
      }
      
      // Load config to get settings
      const config = await this.loadConfig();
      const mcpConfig = config.mcpServers?.context7;
      
      if (!mcpConfig) {
        this.logger.error('MCP server configuration not found');
        return false;
      }
      
      // Start the server using npx
      this.logger.info('Starting Context7 MCP server');
      
      // Prepare environment variables
      const env: NodeJS.ProcessEnv = {
        ...process.env,
        ...mcpConfig.env
      };
      
      // Spawn process
      this.mcpProcess = child_process.spawn(
        mcpConfig.command || 'npx',
        mcpConfig.args || ['-y', `${DEFAULT_MCP_PACKAGE}@latest`],
        {
          stdio: 'pipe',
          detached: true,
          env
        }
      );
      
      // Listen for startup messages
      const startPromise = new Promise<boolean>((resolve, reject) => {
        // Set timeout
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for MCP server to start'));
        }, MCP_COMMAND_TIMEOUT);
        
        // Track server info
        this.serverStartTime = Date.now();
        
        // Process stdout
        this.mcpProcess?.stdout?.on('data', (data) => {
          const message = data.toString().trim();
          this.logger.debug(`MCP stdout: ${message}`);
          
          // Look for server ready message
          if (message.includes('Server started on port')) {
            clearTimeout(timeout);
            
            // Extract version if included
            const versionMatch = message.match(/version (\d+\.\d+\.\d+)/i);
            if (versionMatch) {
              this.serverVersion = versionMatch[1];
            }
            
            // Extract port if included
            const portMatch = message.match(/port (\d+)/i);
            if (portMatch) {
              const port = parseInt(portMatch[1], 10);
              if (!isNaN(port)) {
                this.updateConfigPort(port);
              }
            }
            
            // Save PID for future reference
            this.savePid();
            
            resolve(true);
          }
        });
        
        // Process stderr
        this.mcpProcess?.stderr?.on('data', (data) => {
          const message = data.toString().trim();
          this.logger.error(`MCP stderr: ${message}`);
          
          // Check for fatal errors that would prevent startup
          if (
            message.includes('EADDRINUSE') || 
            message.includes('Address already in use')
          ) {
            clearTimeout(timeout);
            reject(new Error('MCP server port already in use'));
          }
        });
        
        // Process exit
        this.mcpProcess?.on('exit', (code) => {
          this.logger.info(`MCP server exited with code ${code}`);
          
          if (code !== 0) {
            reject(new Error(`MCP server exited with code ${code}`));
          }
          
          // Clean up
          this.mcpProcess = null;
          this.serverStartTime = 0;
          this.connectedClients = 0;
          this.serverVersion = '';
          
          // Remove PID file
          this.removePid();
        });
        
        // Process error
        this.mcpProcess?.on('error', (err) => {
          clearTimeout(timeout);
          this.logger.error('MCP server process error:', err);
          reject(err);
        });
      });
      
      // Wait for startup or failure
      await startPromise;
      
      this.logger.info('Context7 MCP server started successfully');
      return true;
    } catch (error) {
      // Clean up on failure
      if (this.mcpProcess) {
        try {
          this.mcpProcess.kill();
        } catch (e) {
          // Ignore errors when killing the process
        }
        this.mcpProcess = null;
      }
      
      this.serverStartTime = 0;
      this.connectedClients = 0;
      this.serverVersion = '';
      
      this.logger.error('Failed to start MCP server:', error);
      return false;
    }
  }
  
  /**
   * Stop the MCP server if running
   * 
   * @returns True if the server was stopped or wasn't running
   */
  async stopMCPServer(): Promise<boolean> {
    const isRunningViaPidFile = await this.isServerRunningViaPidFile();
    
    // First try to stop via our process reference
    if (this.mcpProcess && !this.mcpProcess.killed) {
      try {
        this.logger.info('Stopping Context7 MCP server');
        
        // Create promise to wait for exit
        const exitPromise = new Promise<void>((resolve, reject) => {
          // Set timeout
          const timeout = setTimeout(() => {
            this.logger.warn('Timeout waiting for MCP server to exit gracefully, forcing kill');
            if (this.mcpProcess) {
              try {
                // Force kill
                this.mcpProcess.kill('SIGKILL');
              } catch (e) {
                this.logger.error('Error force killing MCP process:', e);
              }
            }
            resolve();
          }, 5000);
          
          // Listen for exit
          this.mcpProcess?.once('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
          
          // Listen for error
          this.mcpProcess?.once('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
          
          // Send SIGTERM for graceful shutdown
          this.mcpProcess?.kill('SIGTERM');
        });
        
        // Wait for exit
        await exitPromise;
        
        // Clean up
        this.mcpProcess = null;
        this.serverStartTime = 0;
        this.connectedClients = 0;
        this.serverVersion = '';
        
        // Remove PID file
        this.removePid();
        
        this.logger.info('Context7 MCP server stopped');
        return true;
      } catch (error) {
        this.logger.error('Failed to stop MCP server:', error);
        return false;
      }
    } else if (isRunningViaPidFile) {
      // Try to stop via PID file
      return await this.stopServerViaPidFile();
    }
    
    // Not running
    return true;
  }
  
  /**
   * Update connected clients count
   * 
   * @param count New client count
   */
  updateConnectedClients(count: number): void {
    this.connectedClients = count;
  }
  
  /**
   * Load MCP configuration
   * 
   * @returns MCP configuration object
   */
  private async loadConfig(): Promise<any> {
    try {
      if (!fs.existsSync(this.mcpConfigPath)) {
        return {};
      }
      
      const content = await fs.promises.readFile(this.mcpConfigPath, 'utf8');
      
      try {
        return JSON.parse(content);
      } catch (e) {
        this.logger.warn(`Invalid MCP config, creating new: ${e}`);
        return {};
      }
    } catch (error) {
      this.logger.error('Error loading MCP config:', error);
      return {};
    }
  }
  
  /**
   * Update port in MCP configuration
   * 
   * @param port Port number
   */
  private async updateConfigPort(port: number): Promise<void> {
    try {
      const config = await this.loadConfig();
      
      if (config.mcpServers?.context7?.env) {
        config.mcpServers.context7.env.PORT = port.toString();
        
        await fs.promises.writeFile(
          this.mcpConfigPath,
          JSON.stringify(config, null, 2),
          'utf8'
        );
      }
    } catch (error) {
      this.logger.error('Error updating MCP config port:', error);
    }
  }
  
  /**
   * Save the process ID to a file
   */
  private async savePid(): Promise<void> {
    if (!this.mcpProcess || !this.mcpProcess.pid) {
      return;
    }
    
    try {
      await fs.promises.writeFile(
        this.mcpPidFile,
        this.mcpProcess.pid.toString(),
        'utf8'
      );
    } catch (error) {
      this.logger.error('Error saving MCP PID file:', error);
    }
  }
  
  /**
   * Remove the process ID file
   */
  private async removePid(): Promise<void> {
    try {
      if (fs.existsSync(this.mcpPidFile)) {
        await fs.promises.unlink(this.mcpPidFile);
      }
    } catch (error) {
      this.logger.error('Error removing MCP PID file:', error);
    }
  }
  
  /**
   * Check if an MCP server is running via PID file
   * 
   * @returns True if a server is running
   */
  private async isServerRunningViaPidFile(): Promise<boolean> {
    try {
      if (!fs.existsSync(this.mcpPidFile)) {
        return false;
      }
      
      const pidStr = await fs.promises.readFile(this.mcpPidFile, 'utf8');
      const pid = parseInt(pidStr.trim(), 10);
      
      if (isNaN(pid)) {
        return false;
      }
      
      // Check if process is running
      try {
        // On Unix-like systems, sending signal 0 checks if process exists
        process.kill(pid, 0);
        return true;
      } catch (e) {
        // ESRCH means process doesn't exist
        if ((e as NodeJS.ErrnoException).code === 'ESRCH') {
          // Process doesn't exist, clean up PID file
          await this.removePid();
          return false;
        }
        
        // EPERM means process exists but we don't have permission to send signals
        if ((e as NodeJS.ErrnoException).code === 'EPERM') {
          return true;
        }
        
        throw e;
      }
    } catch (error) {
      this.logger.error('Error checking if MCP server is running via PID file:', error);
      return false;
    }
  }
  
  /**
   * Stop an MCP server using the PID file
   * 
   * @returns True if the server was stopped
   */
  private async stopServerViaPidFile(): Promise<boolean> {
    try {
      if (!fs.existsSync(this.mcpPidFile)) {
        return true;
      }
      
      const pidStr = await fs.promises.readFile(this.mcpPidFile, 'utf8');
      const pid = parseInt(pidStr.trim(), 10);
      
      if (isNaN(pid)) {
        await this.removePid();
        return true;
      }
      
      this.logger.info(`Stopping MCP server with PID ${pid}`);
      
      // Try to kill the process
      try {
        process.kill(pid, 'SIGTERM');
        
        // Wait a bit and check if it's still running
        await this.sleep(2000);
        
        try {
          process.kill(pid, 0);
          
          // Still running, try SIGKILL
          this.logger.warn(`MCP server with PID ${pid} did not exit gracefully, using SIGKILL`);
          process.kill(pid, 'SIGKILL');
          
          // Wait a bit and check again
          await this.sleep(1000);
          
          try {
            process.kill(pid, 0);
            this.logger.error(`Failed to kill MCP server with PID ${pid}`);
            return false;
          } catch (e) {
            // Process killed successfully
            await this.removePid();
            return true;
          }
        } catch (e) {
          // Process exited gracefully
          await this.removePid();
          return true;
        }
      } catch (e) {
        // Process doesn't exist
        if ((e as NodeJS.ErrnoException).code === 'ESRCH') {
          await this.removePid();
          return true;
        }
        
        this.logger.error(`Error stopping MCP server with PID ${pid}:`, e);
        return false;
      }
    } catch (error) {
      this.logger.error('Error stopping MCP server via PID file:', error);
      return false;
    }
  }
  
  /**
   * Check for an existing MCP server from a previous session
   */
  private async checkExistingServer(): Promise<void> {
    const isRunning = await this.isServerRunningViaPidFile();
    
    if (isRunning) {
      this.logger.info('Found existing MCP server from previous session');
      this.serverStartTime = Date.now() - 3600000; // Assume it's been running for an hour
    }
  }
  
  /**
   * Sleep for a specified time
   * 
   * @param ms Milliseconds to sleep
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}