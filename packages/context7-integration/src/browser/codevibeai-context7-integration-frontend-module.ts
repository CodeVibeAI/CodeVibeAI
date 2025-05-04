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
import { 
    CommandContribution, 
    MenuContribution,
    FrontendApplicationContribution 
} from '@theia/core/lib/common';
import { WebSocketConnectionProvider } from '@theia/core/lib/browser/messaging/ws-connection-provider';
import { EditorManager } from '@theia/editor/lib/browser';

/**
 * Import service protocol definitions
 */
import { Context7ServicePath, Context7ServiceClient } from '../common/protocol';
import { Context7Service } from '../common/context7-protocol';

/**
 * Import editor integrations
 */
import { Context7HoverProvider } from './context7-hover-provider';
import { Context7CompletionProvider } from './context7-completion-provider';
import { Context7CodeActionProvider } from './context7-code-action-provider';
import { Context7DecorationProvider } from './context7-decoration-provider';
import { Context7FrontendContribution } from './context7-frontend-contribution';

/**
 * Context7 integration frontend module for CodeVibeAI
 */
export default new ContainerModule(bind => {
    // Bind frontend contributions
    bind(CommandContribution).to(Context7FrontendContribution).inSingletonScope();
    bind(MenuContribution).to(Context7FrontendContribution).inSingletonScope();
    bind(FrontendApplicationContribution).to(Context7FrontendContribution).inSingletonScope();
    
    // Bind editor integration providers
    bind(Context7HoverProvider).toSelf().inSingletonScope();
    bind(Context7CompletionProvider).toSelf().inSingletonScope();
    bind(Context7CodeActionProvider).toSelf().inSingletonScope();
    bind(Context7DecorationProvider).toSelf().inSingletonScope();
    
    // Bind services
    bind(Context7Service).toDynamicValue(ctx => {
        const connection = ctx.container.get(WebSocketConnectionProvider);
        const client = ctx.container.get(Context7ServiceClient);
        
        return connection.createProxy<Context7Service>(
            Context7ServicePath,
            client
        );
    }).inSingletonScope();

    // Bind proxy for backend services
    bind(Context7ServiceClient).toDynamicValue(ctx => {
        const connection = ctx.container.get(WebSocketConnectionProvider);
        return connection.createProxy<Context7ServiceClient>(Context7ServicePath);
    }).inSingletonScope();
});