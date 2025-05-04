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
    MenuContribution 
} from '@theia/core/lib/common';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application';
import { ApplicationShell } from '@theia/core/lib/browser/shell/application-shell';
import { WidgetFactory } from '@theia/core/lib/browser/widget-manager';
import { bindViewContribution } from '@theia/core/lib/browser/shell/view-contribution';

// Import CodeVibeAI branding components
import { CodeVibeAIApplicationShell } from './codevibeai-application-shell';
import { CodeVibeAIBrandingService } from './codevibeai-branding-service';
import { CodeVibeAIBrandingContribution } from './codevibeai-branding-contribution';

// Import CodeVibeAI styles
import '../../src/browser/style/branding.css';

export default new ContainerModule(bind => {
    // Bind branding services
    bind(CodeVibeAIBrandingService).toSelf().inSingletonScope();
    
    // Rebind application shell to our custom implementation
    bind(ApplicationShell).to(CodeVibeAIApplicationShell).inSingletonScope();
    
    // Bind branding contribution
    bind(FrontendApplicationContribution).to(CodeVibeAIBrandingContribution).inSingletonScope();
    bind(CommandContribution).to(CodeVibeAIBrandingContribution).inSingletonScope();
    bind(MenuContribution).to(CodeVibeAIBrandingContribution).inSingletonScope();
    
    // Additional contributions would be bound here
    
    // Note: More CodeVibeAI specific contributions would be added here
});