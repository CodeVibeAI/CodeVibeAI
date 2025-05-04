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
import { AIServicePath, AIServiceClient } from '../common/protocol';

/**
 * Import service implementations and contributions
 */
// Import your implementations here

/**
 * Core backend module for CodeVibeAI
 */
export default new ContainerModule(bind => {
    // Bind backend contributions
    // Example: bind(BackendApplicationContribution).to(YourContribution);
    
    // Bind services
    // Example: bind(BackendService).to(BackendServiceImpl).inSingletonScope();
    
    // Bind connection handlers for frontend-backend communication
    bind(ConnectionHandler).toDynamicValue(ctx => 
        new JsonRpcConnectionHandler(AIServicePath, client => {
            // Get service implementation
            // const aiService = ctx.container.get<AIServiceImpl>(AIServiceImpl);
            // return aiService;
            return {}; // Replace with actual service
        })
    ).inSingletonScope();
    
    // Additional bindings
});