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
import { ClaudeServicePath, ClaudeServiceClient } from '../common/protocol';
import { ClaudeCodeService } from '../common/claude-code-protocol';
import { ClaudeCodeServiceImpl } from './claude-code-service';
import { ClaudeCodeCache } from './claude-code-cache';
import { ClaudeCodeCacheInvalidator } from './claude-code-cache-invalidator';

/**
 * Claude integration backend module for CodeVibeAI
 */
export default new ContainerModule(bind => {
    // Bind cache service
    bind(ClaudeCodeCache).toSelf().inSingletonScope();
    
    // Bind cache invalidator
    bind(ClaudeCodeCacheInvalidator).toSelf().inSingletonScope();
    
    // Bind Claude Code service
    bind(ClaudeCodeService).to(ClaudeCodeServiceImpl).inSingletonScope();
    
    // Initialize cache invalidator
    bind(BackendApplicationContribution).toDynamicValue(ctx => {
        const invalidator = ctx.container.get<ClaudeCodeCacheInvalidator>(ClaudeCodeCacheInvalidator);
        return {
            initialize: async () => {
                await invalidator.initialize();
            }
        };
    });
    
    // Bind standard Claude service
    // Bind connection handlers for frontend-backend communication
    bind(ConnectionHandler).toDynamicValue(ctx => 
        new JsonRpcConnectionHandler(ClaudeServicePath, client => {
            // Get service implementation
            // const claudeService = ctx.container.get<ClaudeServiceImpl>(ClaudeServiceImpl);
            // return claudeService;
            return {}; // Replace with actual service
        })
    ).inSingletonScope();
    
    // Bind Claude Code service connection handler
    bind(ConnectionHandler).toDynamicValue(ctx => 
        new JsonRpcConnectionHandler('/services/claude-code', client => {
            const service = ctx.container.get<ClaudeCodeService>(ClaudeCodeService);
            return service;
        })
    ).inSingletonScope();
});