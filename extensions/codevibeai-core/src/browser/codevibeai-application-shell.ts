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

import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { ApplicationShell, SplitPanel, TabBar, Widget, Title } from '@theia/core/lib/browser';
import { FrontendApplicationStateService } from '@theia/core/lib/browser/frontend-application-state';
import { StatusBar } from '@theia/core/lib/browser/status-bar/status-bar';
import { StatusBarImpl } from '@theia/core/lib/browser/status-bar/status-bar-impl';
import { WidgetManager } from '@theia/core/lib/browser/widget-manager';
import { ThemeService } from '@theia/core/lib/browser/theming/theme-service';
import { CodeVibeAIBrandingService } from './codevibeai-branding-service';

/**
 * Custom ApplicationShell for CodeVibeAI with branding enhancements
 */
@injectable()
export class CodeVibeAIApplicationShell extends ApplicationShell {

    @inject(StatusBar)
    protected readonly statusBar: StatusBar;

    @inject(StatusBarImpl)
    protected readonly statusBarImpl: StatusBarImpl;

    @inject(ThemeService)
    protected readonly themeService: ThemeService;

    @inject(WidgetManager)
    protected readonly widgetManager: WidgetManager;

    @inject(FrontendApplicationStateService)
    protected readonly appStateService: FrontendApplicationStateService;

    @inject(CodeVibeAIBrandingService)
    protected readonly brandingService: CodeVibeAIBrandingService;

    /**
     * Add CodeVibeAI CSS class to the shell for styling customization
     */
    @postConstruct()
    protected override init(): void {
        super.init();
        
        this.addClass('codevibeai-shell');
        this.initBranding();
        
        // Listen for theme changes to update branding accordingly
        this.themeService.onThemeChange(() => {
            this.updateBranding();
        });
        
        // Wait for the application to be ready before applying custom branding
        this.appStateService.reachedState('ready').then(() => {
            setTimeout(() => {
                this.applyCustomTabStyles();
                this.updateBranding();
                this.brandingService.showSplashMessage();
            }, 500);
        });
    }

    /**
     * Initialize custom branding elements
     */
    protected initBranding(): void {
        // Add version info to status bar
        this.statusBarImpl.setElement('codevibeai-version', {
            text: `CodeVibeAI v${this.brandingService.getVersion()}`,
            alignment: 'RIGHT',
            priority: 1000,
            onclick: () => this.brandingService.showAboutDialog()
        });
        
        // Add CodeVibeAI branding class to status bar
        const statusBarElement = document.querySelector('.theia-statusBar');
        if (statusBarElement) {
            statusBarElement.classList.add('codevibeai-statusbar');
        }
    }

    /**
     * Update branding elements when theme changes
     */
    protected updateBranding(): void {
        const isDark = this.themeService.getCurrentTheme().type === 'dark';
        document.body.classList.toggle('codevibeai-dark-theme', isDark);
        document.body.classList.toggle('codevibeai-light-theme', !isDark);
        
        // Update logo based on theme
        this.brandingService.updateLogoForTheme(isDark);
        
        // Apply custom status bar colors based on theme
        this.applyStatusBarColors(isDark);
    }

    /**
     * Apply custom status bar colors based on theme
     */
    protected applyStatusBarColors(isDark: boolean): void {
        const statusBarElement = document.querySelector('.theia-statusBar');
        if (statusBarElement) {
            const accentColor = isDark ? '#836fff' : '#6a4feb';
            const textColor = isDark ? '#ffffff' : '#333333';
            
            statusBarElement.setAttribute('style', 
                `background-color: ${accentColor} !important; color: ${textColor} !important;`);
        }
    }

    /**
     * Apply custom styling to tab bars
     */
    protected applyCustomTabStyles(): void {
        // Customize tab bars with CodeVibeAI styling
        const tabBars = document.querySelectorAll('.p-TabBar') as NodeListOf<HTMLElement>;
        tabBars.forEach(tabBar => {
            tabBar.classList.add('codevibeai-tabbar');
        });
    }

    /**
     * Override to add custom styling to newly created tab bars
     */
    protected override createTabBar(): TabBar<Widget> {
        const tabBar = super.createTabBar();
        tabBar.node.classList.add('codevibeai-tabbar');
        return tabBar;
    }

    /**
     * Override to customize tab title rendering with CodeVibeAI styling
     */
    protected override decorateTitle(title: Title<Widget>): void {
        super.decorateTitle(title);
        
        // Add custom class to titles for styling
        if (title.owner && title.owner.node) {
            title.owner.node.classList.add('codevibeai-widget');
            
            // Add file type specific styling for editor tabs
            const id = title.owner.id;
            if (id && id.includes(':')) {
                const fileExt = id.split(':').pop()?.split('.').pop();
                if (fileExt) {
                    title.owner.node.setAttribute('data-file-ext', fileExt);
                }
            }
        }
    }
    
    /**
     * Override to customize split panels with CodeVibeAI styling
     */
    protected override createSplitPanel(): SplitPanel {
        const splitPanel = super.createSplitPanel();
        splitPanel.node.classList.add('codevibeai-split-panel');
        return splitPanel;
    }
}