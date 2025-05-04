import { injectable, inject } from 'inversify';
import {
    CommandContribution,
    CommandRegistry,
    MenuContribution,
    MenuModelRegistry,
    Command,
    FrontendApplicationContribution
} from '@theia/core/lib/common';
import { CommonMenus } from '@theia/core/lib/browser';
import { EditorManager, EditorWidget } from '@theia/editor/lib/browser';
import { MessageService } from '@theia/core';
import { ILogger } from '@theia/core';
import { Context7Service } from '../common/context7-protocol';
import { Context7HoverProvider } from './context7-hover-provider';
import { Context7CompletionProvider } from './context7-completion-provider';
import { Context7CodeActionProvider } from './context7-code-action-provider';
import { Context7DecorationProvider } from './context7-decoration-provider';

/**
 * Command definitions
 */
export namespace Context7Commands {
    export const SEARCH_DOCUMENTATION: Command = {
        id: 'context7.search.documentation',
        label: 'Search Documentation'
    };
    
    export const SUGGEST_LIBRARIES: Command = {
        id: 'context7.suggest.libraries',
        label: 'Suggest Libraries'
    };
    
    export const FIND_EXAMPLES: Command = {
        id: 'context7.find.examples',
        label: 'Find Code Examples'
    };
    
    export const TOGGLE_DECORATIONS: Command = {
        id: 'context7.toggle.decorations',
        label: 'Toggle Knowledge Decorations'
    };
    
    export const CONFIGURE_MCP_SERVER: Command = {
        id: 'context7.configure.mcp',
        label: 'Configure MCP Server'
    };
    
    export const CHECK_MCP_STATUS: Command = {
        id: 'context7.check.mcp.status',
        label: 'Check MCP Server Status'
    };
}

/**
 * Frontend contribution for Context7 integration
 */
@injectable()
export class Context7FrontendContribution implements CommandContribution, MenuContribution, FrontendApplicationContribution {
    @inject(EditorManager)
    protected readonly editorManager: EditorManager;
    
    @inject(MessageService)
    protected readonly messageService: MessageService;
    
    @inject(ILogger)
    protected readonly logger: ILogger;
    
    @inject(Context7Service)
    protected readonly context7Service: Context7Service;
    
    @inject(Context7HoverProvider)
    protected readonly hoverProvider: Context7HoverProvider;
    
    @inject(Context7CompletionProvider)
    protected readonly completionProvider: Context7CompletionProvider;
    
    @inject(Context7CodeActionProvider)
    protected readonly codeActionProvider: Context7CodeActionProvider;
    
    @inject(Context7DecorationProvider)
    protected readonly decorationProvider: Context7DecorationProvider;
    
    private decorationsEnabled: boolean = true;
    
    /**
     * Initialize the contribution
     */
    async initialize(): Promise<void> {
        // Register editor integrations
        this.hoverProvider.registerHoverProvider();
        this.completionProvider.registerCompletionProvider();
        this.codeActionProvider.registerCodeActionProvider();
        this.decorationProvider.initialize();
        
        // Listen to editor changes for decorations
        this.editorManager.onCreated(widget => {
            this.updateDecorationsForWidget(widget);
        });
        
        this.editorManager.onActiveEditorChanged(widget => {
            if (widget) {
                this.updateDecorationsForWidget(widget);
            }
        });
        
        // Delay initialization to allow authentication to be setup
        setTimeout(() => {
            this.logger.info('Context7 integration initialized');
        }, 1000);
    }
    
    /**
     * Update decorations for a widget
     */
    private updateDecorationsForWidget(widget: EditorWidget): void {
        if (this.decorationsEnabled) {
            setTimeout(() => {
                this.decorationProvider.updateDecorations(widget.editor);
            }, 500);
        }
    }
    
    /**
     * Register commands
     */
    registerCommands(commands: CommandRegistry): void {
        // Search documentation command
        commands.registerCommand(Context7Commands.SEARCH_DOCUMENTATION, {
            execute: async () => {
                const editor = this.editorManager.activeEditor;
                if (!editor) {
                    this.messageService.info('No active editor');
                    return;
                }
                
                const selection = editor.editor.selection;
                if (!selection) {
                    this.messageService.info('Please select text to search');
                    return;
                }
                
                const selectedText = editor.editor.document.getText(selection);
                if (!selectedText) {
                    this.messageService.info('Please select text to search');
                    return;
                }
                
                try {
                    const language = editor.editor.document.languageId;
                    const results = await this.context7Service.searchDocumentation(
                        selectedText,
                        { language }
                    );
                    
                    if (results.length === 0) {
                        this.messageService.info(`No documentation found for "${selectedText}"`);
                        return;
                    }
                    
                    // Format results
                    const formattedResults = results.map(result => {
                        const docName = 'name' in result.documentation ? 
                            result.documentation.name : 
                            result.library.name;
                            
                        return `**${docName}** (${result.library.name})\n\n${result.matchContext || ''}`;
                    }).join('\n\n---\n\n');
                    
                    // Show in message
                    this.messageService.info(`Documentation for "${selectedText}":\n\n${formattedResults}`);
                } catch (error) {
                    this.logger.error(`Error searching documentation: ${error}`);
                    this.messageService.error('Error searching documentation');
                }
            }
        });
        
        // Suggest libraries command
        commands.registerCommand(Context7Commands.SUGGEST_LIBRARIES, {
            execute: async () => {
                const editor = this.editorManager.activeEditor;
                if (!editor) {
                    this.messageService.info('No active editor');
                    return;
                }
                
                try {
                    const document = editor.editor.document;
                    const language = document.languageId;
                    const documentText = document.getText();
                    
                    // Extract imports
                    const imports = [];
                    const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
                    let match;
                    
                    while ((match = importRegex.exec(documentText)) !== null) {
                        imports.push(match[0]);
                    }
                    
                    // Create code context
                    const codeContext = {
                        language,
                        imports,
                        codeSnippet: documentText
                    };
                    
                    // Get suggestions
                    const suggestions = await this.context7Service.suggestLibraries(codeContext);
                    
                    if (suggestions.length === 0) {
                        this.messageService.info('No library suggestions found');
                        return;
                    }
                    
                    // Format suggestions
                    const formattedSuggestions = suggestions.map(suggestion => {
                        return `**${suggestion.library.name}** (${suggestion.library.stars.toLocaleString()} stars)\n` +
                            `*${suggestion.description}*\n\n` +
                            `${suggestion.reason}\n\n` +
                            `\`\`\`\n${suggestion.importExample || ''}\n\`\`\``;
                    }).join('\n\n---\n\n');
                    
                    // Show in message
                    this.messageService.info(`Suggested libraries:\n\n${formattedSuggestions}`);
                } catch (error) {
                    this.logger.error(`Error suggesting libraries: ${error}`);
                    this.messageService.error('Error suggesting libraries');
                }
            }
        });
        
        // Find examples command
        commands.registerCommand(Context7Commands.FIND_EXAMPLES, {
            execute: async () => {
                const editor = this.editorManager.activeEditor;
                if (!editor) {
                    this.messageService.info('No active editor');
                    return;
                }
                
                const selection = editor.editor.selection;
                if (!selection) {
                    this.messageService.info('Please select function name to find examples');
                    return;
                }
                
                const selectedText = editor.editor.document.getText(selection);
                if (!selectedText) {
                    this.messageService.info('Please select function name to find examples');
                    return;
                }
                
                try {
                    const document = editor.editor.document;
                    const language = document.languageId;
                    const documentText = document.getText();
                    
                    // Extract imports
                    const imports = [];
                    const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
                    let match;
                    
                    while ((match = importRegex.exec(documentText)) !== null) {
                        imports.push(match[0]);
                    }
                    
                    // Get examples
                    const examples = await this.context7Service.getExamples(
                        selectedText,
                        {
                            symbolName: selectedText,
                            language,
                            imports
                        }
                    );
                    
                    if (examples.length === 0 || examples[0].examples.length === 0) {
                        this.messageService.info(`No examples found for "${selectedText}"`);
                        return;
                    }
                    
                    // Format examples
                    const topExample = examples[0];
                    const formattedExamples = topExample.examples.map(example => {
                        return `**${example.description || 'Example'}**\n\n` +
                            `\`\`\`\n${example.code}\n\`\`\``;
                    }).join('\n\n---\n\n');
                    
                    // Show in message
                    this.messageService.info(
                        `Examples for "${selectedText}" from ${topExample.library.name}:\n\n${formattedExamples}`
                    );
                } catch (error) {
                    this.logger.error(`Error finding examples: ${error}`);
                    this.messageService.error('Error finding examples');
                }
            }
        });
        
        // Toggle decorations command
        commands.registerCommand(Context7Commands.TOGGLE_DECORATIONS, {
            execute: async () => {
                this.decorationsEnabled = !this.decorationsEnabled;
                
                if (this.decorationsEnabled) {
                    // Re-enable decorations
                    const widget = this.editorManager.activeEditor;
                    if (widget) {
                        this.updateDecorationsForWidget(widget);
                    }
                    
                    this.messageService.info('Context7 knowledge decorations enabled');
                } else {
                    this.messageService.info('Context7 knowledge decorations disabled');
                }
            }
        });
        
        // Configure MCP Server command
        commands.registerCommand(Context7Commands.CONFIGURE_MCP_SERVER, {
            execute: async () => {
                try {
                    // Default to enabling with auto-start
                    const result = await this.context7Service.configureMCPServer({
                        enabled: true,
                        autoStart: true
                    });
                    
                    if (result) {
                        this.messageService.info('Context7 MCP server configured successfully');
                    } else {
                        this.messageService.error('Failed to configure Context7 MCP server');
                    }
                } catch (error) {
                    this.logger.error(`Error configuring MCP server: ${error}`);
                    this.messageService.error('Error configuring MCP server');
                }
            }
        });
        
        // Check MCP Status command
        commands.registerCommand(Context7Commands.CHECK_MCP_STATUS, {
            execute: async () => {
                try {
                    const status = await this.context7Service.getMCPStatus();
                    
                    const statusMessage = `Context7 MCP Server Status:\n\n` +
                        `Enabled: ${status.enabled ? 'Yes' : 'No'}\n` +
                        `Running: ${status.running ? 'Yes' : 'No'}`;
                    
                    this.messageService.info(statusMessage);
                } catch (error) {
                    this.logger.error(`Error checking MCP server status: ${error}`);
                    this.messageService.error('Error checking MCP server status');
                }
            }
        });
    }
    
    /**
     * Register menus
     */
    registerMenus(menus: MenuModelRegistry): void {
        // Add commands to editor context menu
        menus.registerMenuAction(CommonMenus.EDIT_CONTEXT_MENU, {
            commandId: Context7Commands.SEARCH_DOCUMENTATION.id,
            label: 'Search Documentation'
        });
        
        menus.registerMenuAction(CommonMenus.EDIT_CONTEXT_MENU, {
            commandId: Context7Commands.FIND_EXAMPLES.id,
            label: 'Find Code Examples'
        });
        
        // Add commands to main menu
        const context7SubMenu = [...CommonMenus.HELP, 'context7'];
        menus.registerSubmenu(context7SubMenu, 'Context7 Knowledge');
        
        menus.registerMenuAction(context7SubMenu, {
            commandId: Context7Commands.SEARCH_DOCUMENTATION.id,
            order: '1'
        });
        
        menus.registerMenuAction(context7SubMenu, {
            commandId: Context7Commands.SUGGEST_LIBRARIES.id,
            order: '2'
        });
        
        menus.registerMenuAction(context7SubMenu, {
            commandId: Context7Commands.FIND_EXAMPLES.id,
            order: '3'
        });
        
        menus.registerMenuAction(context7SubMenu, {
            commandId: Context7Commands.TOGGLE_DECORATIONS.id,
            order: '4'
        });
        
        // Add separator
        menus.registerMenuAction(context7SubMenu, {
            commandId: '-',
            order: '5'
        });
        
        // Add MCP server commands
        menus.registerMenuAction(context7SubMenu, {
            commandId: Context7Commands.CONFIGURE_MCP_SERVER.id,
            order: '6'
        });
        
        menus.registerMenuAction(context7SubMenu, {
            commandId: Context7Commands.CHECK_MCP_STATUS.id,
            order: '7'
        });
    }
}