import { ContainerModule } from 'inversify';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common/messaging';
import { ILogger } from '@theia/core';

import { Context7Service, Context7Symbol } from '../common/context7-protocol';
import { Context7ServiceImpl } from './context7-service-impl';
import { Context7Client } from './context7-client';
import { Context7MCPManager } from './context7-mcp-manager';
import { Context7KnowledgeService } from './context7-knowledge-service';

export default new ContainerModule(bind => {
    // Bind the Context7Client (API client)
    bind(Context7Client).toSelf().inSingletonScope();
    
    // Bind the MCP server manager
    bind(Context7MCPManager).toSelf().inSingletonScope();
    
    // Bind the knowledge service
    bind(Context7KnowledgeService).toSelf().inSingletonScope();
    
    // Bind the main service implementation
    bind(Context7Service).to(Context7ServiceImpl).inSingletonScope();
    
    // Bind the service to its symbol for dependency injection
    bind(Context7Symbol).toService(Context7Service);
    
    // Expose the service via JSON-RPC
    bind(ConnectionHandler).toDynamicValue(ctx => {
        const logger = ctx.container.get<ILogger>(ILogger);
        const serviceImpl = ctx.container.get<Context7ServiceImpl>(Context7Service);
        
        return new JsonRpcConnectionHandler('/services/context7', client => {
            logger.info('Context7 frontend client connected');
            serviceImpl.setClient(client);
            
            return serviceImpl;
        });
    }).inSingletonScope();
});