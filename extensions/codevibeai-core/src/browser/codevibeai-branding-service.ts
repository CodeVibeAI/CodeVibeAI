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
import { WindowService } from '@theia/core/lib/browser/window/window-service';
import { MessageService } from '@theia/core/lib/common/message-service';
import { 
    ConfirmDialog, 
    Dialog, 
    DialogProps, 
    DialogMode 
} from '@theia/core/lib/browser/dialogs';
import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';
import { AboutDialog } from '@theia/core/lib/browser/about-dialog';
import { FrontendApplicationStateService } from '@theia/core/lib/browser/frontend-application-state';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import { CommandRegistry } from '@theia/core/lib/common/command';
import { environment } from '@theia/core/shared/@theia/application-package/lib/environment';

/**
 * CodeVibeAI branding information
 */
export interface CodeVibeAIBrandingInfo {
    applicationName: string;
    applicationLogo: string;
    applicationLogoDark: string;
    applicationLogoLight: string;
    welcomePageTitle: string;
    welcomePageText: string;
    aboutDialogAdditionalInfo: string;
    version: string;
}

/**
 * Service for CodeVibeAI branding customization
 */
@injectable()
export class CodeVibeAIBrandingService {
    
    @inject(WindowService)
    protected readonly windowService: WindowService;
    
    @inject(MessageService)
    protected readonly messageService: MessageService;
    
    @inject(EnvVariablesServer)
    protected readonly envVariablesServer: EnvVariablesServer;
    
    @inject(CommandRegistry)
    protected readonly commandRegistry: CommandRegistry;
    
    @inject(FrontendApplicationStateService)
    protected readonly appStateService: FrontendApplicationStateService;
    
    /**
     * Get the branding information for CodeVibeAI
     */
    getBrandingInfo(): CodeVibeAIBrandingInfo {
        return {
            applicationName: 'CodeVibeAI',
            applicationLogo: this.getResourcePath('logo/codevibeai-logo.svg'),
            applicationLogoDark: this.getResourcePath('logo/codevibeai-logo-dark.svg'),
            applicationLogoLight: this.getResourcePath('logo/codevibeai-logo-light.svg'),
            welcomePageTitle: 'Welcome to CodeVibeAI',
            welcomePageText: 'Experience emotionally intelligent vibe coding',
            aboutDialogAdditionalInfo: 'CodeVibeAI - An emotionally intelligent vibe coding IDE',
            version: this.getVersion()
        };
    }
    
    /**
     * Get the application version
     */
    getVersion(): string {
        return environment.electron.version || '0.1.0';
    }
    
    /**
     * Get the path to a resource
     */
    getResourcePath(relativePath: string): string {
        return `../resources/${relativePath}`;
    }
    
    /**
     * Update the application logo based on the current theme
     */
    updateLogoForTheme(isDark: boolean): void {
        const logoElement = document.querySelector('.theia-icon') as HTMLImageElement;
        if (logoElement) {
            const branding = this.getBrandingInfo();
            logoElement.src = isDark ? branding.applicationLogoDark : branding.applicationLogoLight;
            logoElement.alt = branding.applicationName;
            logoElement.title = branding.applicationName;
        }
    }
    
    /**
     * Show the about dialog with CodeVibeAI branding
     */
    showAboutDialog(): void {
        const branding = this.getBrandingInfo();
        
        const dialog = new AboutDialog({
            title: `About ${branding.applicationName}`,
            applicationName: branding.applicationName,
            version: branding.version,
            applicationLogo: branding.applicationLogo,
            commitHash: environment.electron.commit,
            additionalInfo: branding.aboutDialogAdditionalInfo,
            okButton: {
                label: 'OK',
                handler: () => dialog.close()
            }
        });
        
        dialog.open();
    }
    
    /**
     * Show the splash message after application loads
     */
    async showSplashMessage(): Promise<void> {
        // Only show splash message if the application is ready
        const appReady = await this.appStateService.reachedState('ready');
        if (!appReady) {
            return;
        }
        
        const branding = this.getBrandingInfo();
        const showSplash = await this.getSplashPreference();
        
        if (showSplash) {
            const versionInfo = `v${branding.version}`;
            this.messageService.info(
                `<div class="codevibeai-splash">
                    <div class="codevibeai-splash-logo">
                        <img src="${branding.applicationLogo}" alt="${branding.applicationName}">
                    </div>
                    <div class="codevibeai-splash-title">
                        ${branding.welcomePageTitle}
                    </div>
                    <div class="codevibeai-splash-text">
                        ${branding.welcomePageText}
                    </div>
                    <div class="codevibeai-splash-version">
                        ${versionInfo}
                    </div>
                </div>`,
                {
                    timeout: 5000
                }
            );
        }
    }
    
    /**
     * Get user preference for showing splash message
     */
    private async getSplashPreference(): Promise<boolean> {
        const config = FrontendApplicationConfigProvider.get();
        return config?.preferences?.['codevibeai.showSplashScreen'] ?? true;
    }
    
    /**
     * Create a custom themed dialog with CodeVibeAI branding
     */
    createCustomDialog<T>(props: DialogProps): Dialog<T> {
        const dialog = new ConfirmDialog(props);
        dialog.node.classList.add('codevibeai-dialog');
        return dialog;
    }
    
    /**
     * Set document title with CodeVibeAI branding
     */
    setDocumentTitle(title?: string): void {
        const branding = this.getBrandingInfo();
        const appName = branding.applicationName;
        
        if (title) {
            document.title = `${title} - ${appName}`;
        } else {
            document.title = appName;
        }
    }
}