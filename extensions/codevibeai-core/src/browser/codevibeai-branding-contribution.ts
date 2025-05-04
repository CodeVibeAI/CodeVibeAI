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

import { injectable, inject } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution, FrontendApplication } from '@theia/core/lib/browser/frontend-application';
import { CommandContribution, CommandRegistry, Command } from '@theia/core/lib/common/command';
import { MenuContribution, MenuModelRegistry } from '@theia/core/lib/common/menu';
import { CommonMenus } from '@theia/core/lib/browser/common-frontend-contribution';
import { WindowService } from '@theia/core/lib/browser/window/window-service';
import { MessageService } from '@theia/core/lib/common/message-service';
import { CodeVibeAIBrandingService } from './codevibeai-branding-service';
import { FrontendApplicationStateService } from '@theia/core/lib/browser/frontend-application-state';
import { ThemeService } from '@theia/core/lib/browser/theming/theme-service';
import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';

/**
 * Contribution for CodeVibeAI branding
 */
@injectable()
export class CodeVibeAIBrandingContribution implements FrontendApplicationContribution, CommandContribution, MenuContribution {
    
    @inject(WindowService)
    protected readonly windowService: WindowService;
    
    @inject(MessageService)
    protected readonly messageService: MessageService;
    
    @inject(CodeVibeAIBrandingService)
    protected readonly brandingService: CodeVibeAIBrandingService;
    
    @inject(FrontendApplicationStateService)
    protected readonly appStateService: FrontendApplicationStateService;
    
    @inject(ThemeService)
    protected readonly themeService: ThemeService;
    
    /**
     * Commands for branding
     */
    static readonly ABOUT_COMMAND: Command = {
        id: 'codevibeai.about',
        label: 'About CodeVibeAI'
    };
    
    onStart(app: FrontendApplication): void {
        // Apply initial branding CSS class to body based on theme
        const isDark = this.themeService.getCurrentTheme().type === 'dark';
        document.body.classList.add(isDark ? 'codevibeai-dark-theme' : 'codevibeai-light-theme');
        
        // Set window title
        this.brandingService.setDocumentTitle();
        
        // Init favicon
        this.initFavicon();
        
        // Update document title when configuration is loaded
        this.updateTitleFromConfig();
        
        // Show splash screen when application is ready
        this.appStateService.reachedState('ready').then(() => {
            setTimeout(() => {
                this.brandingService.showSplashMessage();
            }, 1000);
        });
    }
    
    /**
     * Register branding commands
     */
    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(CodeVibeAIBrandingContribution.ABOUT_COMMAND, {
            execute: () => this.brandingService.showAboutDialog()
        });
    }
    
    /**
     * Register branding menu items
     */
    registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(CommonMenus.HELP, {
            commandId: CodeVibeAIBrandingContribution.ABOUT_COMMAND.id,
            label: 'About CodeVibeAI',
            order: '0'
        });
    }
    
    /**
     * Initialize favicon
     */
    protected initFavicon(): void {
        const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
        link.setAttribute('rel', 'icon');
        link.setAttribute('href', this.getFaviconPath());
        document.head.appendChild(link);
    }
    
    /**
     * Get favicon path
     */
    protected getFaviconPath(): string {
        return 'resources/icons/favicon.ico';
    }
    
    /**
     * Update document title from configuration
     */
    protected updateTitleFromConfig(): void {
        const config = FrontendApplicationConfigProvider.get();
        if (config?.frontend?.config?.applicationName) {
            const appName = config.frontend.config.applicationName;
            document.title = appName;
        }
    }
}