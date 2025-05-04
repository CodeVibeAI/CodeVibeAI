/*
 * Copyright (c) 2023 CodeVibeAI Team and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
 */

import { ContainerModule } from '@theia/core/shared/inversify';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common/messaging';
import { BackendApplicationContribution } from '@theia/core/lib/node';

/**
 * Import service protocol definitions
 */
import { Context7ServicePath, Context7ServiceClient } from '../common/protocol';
import { Context7Service, Context7Client as Context7ProtocolClient } from '../common/context7-protocol';
import { Context7Client } from './context7-client';
import { Context7ServiceImpl } from './context7-service-impl';
import { Context7KnowledgeService } from './context7-knowledge-service';

/**
 * Context7 integration backend module for CodeVibeAI
 */
export default new ContainerModule(bind => {
    // Bind backend contributions
    // Example: bind(BackendApplicationContribution).to(YourContribution);
    
    // Bind Context7Client
    bind(Context7Client).toSelf().inSingletonScope();
    
    // Bind knowledge service
    bind(Context7KnowledgeService).toSelf().inSingletonScope();
    
    // Bind services
    bind(Context7ServiceImpl).toSelf().inSingletonScope();
    bind(Context7Service).toService(Context7ServiceImpl);
    
    // Bind connection handlers for frontend-backend communication
    bind(ConnectionHandler).toDynamicValue(ctx => 
        new JsonRpcConnectionHandler<Context7ProtocolClient>(Context7ServicePath, client => {
            const context7Service = ctx.container.get<Context7ServiceImpl>(Context7ServiceImpl);
            context7Service.setClient(client);
            return context7Service;
        })
    ).inSingletonScope();
});