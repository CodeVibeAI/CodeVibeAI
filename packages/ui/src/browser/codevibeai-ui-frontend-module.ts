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
    KeybindingContribution
} from '@theia/core/lib/common';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application';
import { WidgetFactory } from '@theia/core/lib/browser/widget-manager';
import { WebSocketConnectionProvider } from '@theia/core/lib/browser/messaging/ws-connection-provider';

/**
 * Import UI service protocol definitions
 */
import { UIServicePath, UIServiceClient } from '../common/protocol';

// Import CSS
import '../../assets/styles/ui.css';

/**
 * UI frontend module for CodeVibeAI
 */
export default new ContainerModule(bind => {
    // Bind frontend contributions
    // Example: bind(CommandContribution).to(YourContribution);
    
    // Bind services
    // Example: bind(UIService).to(UIServiceImpl).inSingletonScope();

    // Bind widget factories
    // Example: 
    // bind(WidgetFactory).toDynamicValue(ctx => ({
    //    id: 'codevibeai-chat',
    //    createWidget: () => ctx.container.get<ChatWidgetContribution>(ChatWidgetContribution).createWidget()
    // }));

    // Bind proxy for backend services
    bind(UIServiceClient).toDynamicValue(ctx => {
        const connection = ctx.container.get(WebSocketConnectionProvider);
        return connection.createProxy<UIServiceClient>(UIServicePath);
    }).inSingletonScope();

    // Additional bindings
});