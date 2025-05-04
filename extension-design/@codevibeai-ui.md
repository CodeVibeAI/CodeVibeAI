# @codevibeai/ui Extension Design

## Overview
The `@codevibeai/ui` extension provides specialized UI components for the CodeVibeAI coding assistant. It delivers a rich, interactive "vibe coding" experience by integrating AI features into the Theia UI.

## Directory Structure

```
@codevibeai/ui/
├── src/
│   ├── browser/
│   │   ├── codevibeai-ui-frontend-module.ts
│   │   ├── codevibeai-ui-contribution.ts
│   │   ├── codevibeai-ui-keybinding-contribution.ts
│   │   ├── codevibeai-ui-menu-contribution.ts
│   │   ├── codevibeai-ui-commands.ts
│   │   ├── codevibeai-ui-preferences.ts
│   │   ├── components/
│   │   │   ├── base/
│   │   │   │   ├── base-component.tsx
│   │   │   │   └── component-registry.ts
│   │   │   ├── chat/
│   │   │   │   ├── chat-panel.tsx
│   │   │   │   ├── chat-message.tsx
│   │   │   │   ├── chat-input.tsx
│   │   │   │   └── chat-service.ts
│   │   │   ├── completion/
│   │   │   │   ├── inline-completion-provider.ts
│   │   │   │   ├── completion-renderer.tsx
│   │   │   │   └── completion-widget.tsx
│   │   │   ├── context/
│   │   │   │   ├── context-panel.tsx
│   │   │   │   ├── context-tree-view.tsx
│   │   │   │   └── semantic-graph.tsx
│   │   │   ├── editor/
│   │   │   │   ├── editor-enhancements.ts
│   │   │   │   ├── inline-actions.tsx
│   │   │   │   ├── hover-widget.tsx
│   │   │   │   └── code-lens-provider.ts
│   │   │   ├── feedback/
│   │   │   │   ├── feedback-widget.tsx
│   │   │   │   └── feedback-service.ts
│   │   │   ├── insights/
│   │   │   │   ├── code-insights-panel.tsx
│   │   │   │   └── insights-service.ts
│   │   │   ├── notification/
│   │   │   │   ├── ai-notification.tsx
│   │   │   │   └── notification-service.ts
│   │   │   ├── settings/
│   │   │   │   ├── ai-settings-panel.tsx
│   │   │   │   └── settings-service.ts
│   │   │   ├── sidebar/
│   │   │   │   ├── ai-sidebar.tsx
│   │   │   │   └── sidebar-service.ts
│   │   │   ├── status/
│   │   │   │   ├── ai-status-bar.tsx
│   │   │   │   └── status-service.ts
│   │   │   └── toolbar/
│   │   │       ├── ai-toolbar.tsx
│   │   │       └── toolbar-service.ts
│   │   ├── common/
│   │   │   ├── theme-registry.ts
│   │   │   ├── ui-utils.ts
│   │   │   └── widget-lifecycle.ts
│   │   ├── icons/
│   │   │   └── ui-icons-contribution.ts
│   │   ├── observers/
│   │   │   ├── code-observer.ts
│   │   │   ├── activity-observer.ts
│   │   │   └── observer-manager.ts
│   │   ├── services/
│   │   │   ├── prompt-service.ts
│   │   │   ├── suggestion-service.ts
│   │   │   ├── vibe-coding-service.ts
│   │   │   └── ui-integration-service.ts
│   │   ├── theme/
│   │   │   ├── dark-theme.ts
│   │   │   ├── light-theme.ts
│   │   │   └── theme-contribution.ts
│   │   ├── utils/
│   │   │   ├── dom-utils.ts
│   │   │   ├── widget-utils.ts
│   │   │   └── monaco-utils.ts
│   │   └── views/
│   │       ├── main-view-contribution.ts
│   │       ├── chat-view-contribution.ts
│   │       ├── insights-view-contribution.ts
│   │       └── context-view-contribution.ts
│   ├── common/
│   │   ├── ui-protocol.ts
│   │   ├── ui-types.ts
│   │   ├── index.ts
│   │   └── vibe-coding-service.ts
│   └── node/
│       ├── codevibeai-ui-backend-module.ts
│       └── feedback-service-impl.ts
├── assets/
│   ├── icons/
│   │   ├── dark/
│   │   │   └── [dark icons]
│   │   └── light/
│   │       └── [light icons]
│   ├── images/
│   │   └── [images]
│   └── styles/
│       ├── chat.css
│       ├── completion.css
│       ├── context.css
│       ├── editor.css
│       ├── insights.css
│       ├── variables.css
│       └── vibe-theme.css
├── i18n/
│   ├── en.json
│   ├── fr.json
│   ├── de.json
│   └── nls.metadata.json
├── license.txt
├── package.json
├── README.md
└── tsconfig.json
```

## Key Files

### package.json

```json
{
  "name": "@codevibeai/ui",
  "version": "0.1.0",
  "description": "UI components for CodeVibeAI coding assistant",
  "keywords": [
    "theia-extension"
  ],
  "license": "EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/organization/codevibeai.git"
  },
  "bugs": {
    "url": "https://github.com/organization/codevibeai/issues"
  },
  "homepage": "https://github.com/organization/codevibeai",
  "files": [
    "lib",
    "src",
    "assets",
    "i18n"
  ],
  "dependencies": {
    "@theia/core": "^1.42.0",
    "@theia/editor": "^1.42.0",
    "@theia/monaco": "^1.42.0",
    "@theia/navigator": "^1.42.0",
    "@theia/output": "^1.42.0",
    "@theia/workspace": "^1.42.0",
    "@theia/messages": "^1.42.0",
    "@theia/filesystem": "^1.42.0",
    "@theia/preferences": "^1.42.0",
    "@codevibeai/core": "^0.1.0",
    "@codevibeai/claude-integration": "^0.1.0",
    "@codevibeai/context7-integration": "^0.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "uuid": "^9.0.0",
    "marked": "^5.0.0",
    "highlight.js": "^11.7.0",
    "vscode-languageserver-protocol": "^3.17.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/uuid": "^9.0.0",
    "@types/marked": "^5.0.0",
    "rimraf": "latest",
    "typescript": "~4.5.5"
  },
  "scripts": {
    "prepare": "yarn clean && yarn build",
    "clean": "rimraf lib",
    "build": "tsc && yarn run copy-assets",
    "copy-assets": "cp -r assets lib/",
    "watch": "tsc -w"
  },
  "theiaExtensions": [
    {
      "frontend": "lib/browser/codevibeai-ui-frontend-module",
      "backend": "lib/node/codevibeai-ui-backend-module"
    }
  ]
}
```

### src/common/vibe-coding-service.ts

```typescript
import { Event } from '@theia/core/lib/common/event';

/**
 * Service interface for the "vibe coding" experience
 */
export const VibeCodingService = Symbol('VibeCodingService');
export interface VibeCodingService {
    /**
     * Activate vibe coding mode
     */
    activate(): Promise<void>;
    
    /**
     * Deactivate vibe coding mode
     */
    deactivate(): Promise<void>;
    
    /**
     * Check if vibe coding mode is active
     */
    isActive(): boolean;
    
    /**
     * Get the current vibe coding level (0-3)
     * 0: Off
     * 1: Basic assistance
     * 2: Enhanced assistance
     * 3: Proactive assistance
     */
    getLevel(): number;
    
    /**
     * Set the vibe coding level
     * @param level The level to set (0-3)
     */
    setLevel(level: number): Promise<void>;
    
    /**
     * Event fired when vibe coding mode is activated
     */
    readonly onActivated: Event<void>;
    
    /**
     * Event fired when vibe coding mode is deactivated
     */
    readonly onDeactivated: Event<void>;
    
    /**
     * Event fired when vibe coding level changes
     */
    readonly onLevelChanged: Event<number>;
}
```

### src/common/ui-types.ts

```typescript
/**
 * Common types used in the UI extension
 */

/**
 * AI chat message type
 */
export interface ChatMessage {
    /** Message ID */
    id: string;
    /** Sender (user or assistant) */
    sender: 'user' | 'assistant';
    /** Message content */
    content: string;
    /** Message format */
    format: 'text' | 'markdown' | 'code';
    /** Timestamp */
    timestamp: number;
    /** Associated file path (if any) */
    filePath?: string;
    /** Associated code selection (if any) */
    codeSelection?: {
        /** Starting line */
        startLine: number;
        /** Starting character */
        startCharacter: number;
        /** Ending line */
        endLine: number;
        /** Ending character */
        endCharacter: number;
    };
    /** Message status (for assistant messages) */
    status?: 'pending' | 'streaming' | 'complete' | 'error';
    /** Error message (if status is error) */
    error?: string;
    /** Message metadata */
    metadata?: { [key: string]: any };
}

/**
 * Chat session
 */
export interface ChatSession {
    /** Session ID */
    id: string;
    /** Session title */
    title: string;
    /** Creation timestamp */
    createdAt: number;
    /** Last update timestamp */
    updatedAt: number;
    /** Messages in the session */
    messages: ChatMessage[];
    /** Session context */
    context?: {
        /** Related file paths */
        filePaths: string[];
        /** Related project context */
        projectContext?: any;
    };
}

/**
 * In-editor code completion
 */
export interface CodeCompletion {
    /** Completion ID */
    id: string;
    /** Text to insert */
    text: string;
    /** Position information */
    position: {
        /** Line number */
        line: number;
        /** Character position */
        character: number;
    };
    /** Range to replace */
    range?: {
        /** Starting line */
        startLine: number;
        /** Starting character */
        startCharacter: number;
        /** Ending line */
        endLine: number;
        /** Ending character */
        endCharacter: number;
    };
    /** Confidence score (0-1) */
    confidence: number;
    /** Display information */
    display?: {
        /** Prefix to highlight */
        prefix?: string;
        /** Suffix to highlight */
        suffix?: string;
        /** Detail text */
        detail?: string;
    };
}

/**
 * Code insight
 */
export interface CodeInsight {
    /** Insight ID */
    id: string;
    /** Insight type */
    type: 'suggestion' | 'optimization' | 'security' | 'best_practice' | 'refactoring';
    /** Title */
    title: string;
    /** Description */
    description: string;
    /** Severity (0-3) */
    severity: number;
    /** Related file path */
    filePath: string;
    /** Code location */
    location?: {
        /** Starting line */
        startLine: number;
        /** Starting character */
        startCharacter: number;
        /** Ending line */
        endLine: number;
        /** Ending character */
        endCharacter: number;
    };
    /** Fix suggestion */
    fix?: {
        /** Description of the fix */
        description: string;
        /** Replacement code */
        replacement: string;
        /** Automation level */
        automation: 'manual' | 'semi_automatic' | 'automatic';
    };
}

/**
 * User feedback
 */
export interface UserFeedback {
    /** Feedback ID */
    id: string;
    /** Feedback type */
    type: 'thumbs_up' | 'thumbs_down' | 'rating' | 'text';
    /** Feature ID */
    featureId: string;
    /** Rating value (1-5) */
    rating?: number;
    /** Text feedback */
    text?: string;
    /** Timestamp */
    timestamp: number;
    /** Context information */
    context?: {
        /** Message ID (for chat feedback) */
        messageId?: string;
        /** Completion ID (for completion feedback) */
        completionId?: string;
        /** Insight ID (for insight feedback) */
        insightId?: string;
    };
}

/**
 * Theme type
 */
export enum ThemeType {
    LIGHT = 'light',
    DARK = 'dark',
    HIGH_CONTRAST = 'high-contrast'
}

/**
 * UI component visibility settings
 */
export interface UIVisibilitySettings {
    /** Show chat panel */
    showChatPanel: boolean;
    /** Show inline completions */
    showInlineCompletions: boolean;
    /** Show code insights */
    showCodeInsights: boolean;
    /** Show AI status in status bar */
    showAIStatus: boolean;
    /** Show feedback widget */
    showFeedbackWidget: boolean;
}
```

### src/browser/codevibeai-ui-frontend-module.ts

```typescript
import { ContainerModule } from '@theia/core/shared/inversify';
import { 
    CommandContribution, 
    MenuContribution, 
    KeybindingContribution 
} from '@theia/core/lib/common';
import { WidgetFactory, OpenHandler } from '@theia/core/lib/browser';
import { CodeVibeAIUIContribution } from './codevibeai-ui-contribution';
import { CodeVibeAIUIKeybindingContribution } from './codevibeai-ui-keybinding-contribution';
import { CodeVibeAIUIMenuContribution } from './codevibeai-ui-menu-contribution';
import { bindUIPreferences } from './codevibeai-ui-preferences';
import { VibeCodingService } from '../common/vibe-coding-service';
import { VibeCodingServiceImpl } from './services/vibe-coding-service';
import { PromptService } from './services/prompt-service';
import { SuggestionService } from './services/suggestion-service';
import { UIIntegrationService } from './services/ui-integration-service';
import { ChatViewContribution } from './views/chat-view-contribution';
import { InsightsViewContribution } from './views/insights-view-contribution';
import { ContextViewContribution } from './views/context-view-contribution';
import { MainViewContribution } from './views/main-view-contribution';
import { UIIconsContribution } from './icons/ui-icons-contribution';
import { ThemeContribution } from './theme/theme-contribution';
import { ComponentRegistry } from './components/base/component-registry';
import { ChatService } from './components/chat/chat-service';
import { InlineCompletionProvider } from './components/completion/inline-completion-provider';
import { EditorEnhancements } from './components/editor/editor-enhancements';
import { CodeLensProvider } from './components/editor/code-lens-provider';
import { FeedbackService } from './components/feedback/feedback-service';
import { InsightsService } from './components/insights/insights-service';
import { NotificationService } from './components/notification/notification-service';
import { AISettingsService } from './components/settings/settings-service';
import { SidebarService } from './components/sidebar/sidebar-service';
import { StatusService } from './components/status/status-service';
import { ToolbarService } from './components/toolbar/toolbar-service';
import { ObserverManager } from './observers/observer-manager';
import { CodeObserver } from './observers/code-observer';
import { ActivityObserver } from './observers/activity-observer';
import { ThemeRegistry } from './common/theme-registry';

export default new ContainerModule(bind => {
    // Bind contributions
    bind(CommandContribution).to(CodeVibeAIUIContribution);
    bind(MenuContribution).to(CodeVibeAIUIMenuContribution);
    bind(KeybindingContribution).to(CodeVibeAIUIKeybindingContribution);
    bind(CodeVibeAIUIContribution).toSelf().inSingletonScope();
    
    // Bind core services
    bind(VibeCodingService).to(VibeCodingServiceImpl).inSingletonScope();
    bind(PromptService).toSelf().inSingletonScope();
    bind(SuggestionService).toSelf().inSingletonScope();
    bind(UIIntegrationService).toSelf().inSingletonScope();
    
    // Bind UI components and services
    bind(ComponentRegistry).toSelf().inSingletonScope();
    bind(ChatService).toSelf().inSingletonScope();
    bind(InlineCompletionProvider).toSelf().inSingletonScope();
    bind(EditorEnhancements).toSelf().inSingletonScope();
    bind(CodeLensProvider).toSelf().inSingletonScope();
    bind(FeedbackService).toSelf().inSingletonScope();
    bind(InsightsService).toSelf().inSingletonScope();
    bind(NotificationService).toSelf().inSingletonScope();
    bind(AISettingsService).toSelf().inSingletonScope();
    bind(SidebarService).toSelf().inSingletonScope();
    bind(StatusService).toSelf().inSingletonScope();
    bind(ToolbarService).toSelf().inSingletonScope();
    
    // Bind observers
    bind(ObserverManager).toSelf().inSingletonScope();
    bind(CodeObserver).toSelf().inSingletonScope();
    bind(ActivityObserver).toSelf().inSingletonScope();
    
    // Bind theme contributions
    bind(ThemeRegistry).toSelf().inSingletonScope();
    bind(ThemeContribution).toSelf().inSingletonScope();
    bind(UIIconsContribution).toSelf().inSingletonScope();
    
    // Bind view contributions
    bind(ChatViewContribution).toSelf().inSingletonScope();
    bind(InsightsViewContribution).toSelf().inSingletonScope();
    bind(ContextViewContribution).toSelf().inSingletonScope();
    bind(MainViewContribution).toSelf().inSingletonScope();
    
    // Register view widgets
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: 'codevibeai-chat',
        createWidget: () => ctx.container.get<ChatViewContribution>(
            ChatViewContribution
        ).createWidget()
    })).inSingletonScope();
    
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: 'codevibeai-insights',
        createWidget: () => ctx.container.get<InsightsViewContribution>(
            InsightsViewContribution
        ).createWidget()
    })).inSingletonScope();
    
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: 'codevibeai-context',
        createWidget: () => ctx.container.get<ContextViewContribution>(
            ContextViewContribution
        ).createWidget()
    })).inSingletonScope();
    
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: 'codevibeai-main',
        createWidget: () => ctx.container.get<MainViewContribution>(
            MainViewContribution
        ).createWidget()
    })).inSingletonScope();
    
    // Register open handlers
    bind(OpenHandler).toService(ChatViewContribution);
    bind(OpenHandler).toService(InsightsViewContribution);
    bind(OpenHandler).toService(ContextViewContribution);
    bind(OpenHandler).toService(MainViewContribution);
    
    // Bind preferences
    bindUIPreferences(bind);
});
```

### src/browser/components/chat/chat-panel.tsx

```tsx
import * as React from 'react';
import { injectable, inject } from '@theia/core/shared/inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { Message } from '@theia/core/lib/browser/widgets/widget';
import { CommandRegistry } from '@theia/core/lib/common/command';
import { ChatService } from './chat-service';
import { ChatMessage, ChatSession } from '../../../common/ui-types';
import { MessageComponent } from './chat-message';
import { ChatInput } from './chat-input';
import { Emitter } from '@theia/core/lib/common/event';
import { AIService } from '@codevibeai/core';
import { Marked } from 'marked';
import { v4 as uuidv4 } from 'uuid';

@injectable()
export class ChatPanelWidget extends ReactWidget {
    static readonly ID = 'codevibeai-chat-panel';
    static readonly LABEL = 'AI Chat';

    @inject(CommandRegistry)
    protected readonly commandRegistry: CommandRegistry;

    @inject(ChatService)
    protected readonly chatService: ChatService;
    
    @inject(AIService)
    protected readonly aiService: AIService;

    protected marked = new Marked();
    protected session: ChatSession;
    protected loading = false;
    
    protected readonly onMessageSentEmitter = new Emitter<ChatMessage>();
    readonly onMessageSent = this.onMessageSentEmitter.event;
    
    protected readonly onMessageReceivedEmitter = new Emitter<ChatMessage>();
    readonly onMessageReceived = this.onMessageReceivedEmitter.event;

    constructor() {
        super();
        this.id = ChatPanelWidget.ID;
        this.title.label = ChatPanelWidget.LABEL;
        this.title.caption = 'CodeVibeAI Chat';
        this.title.closable = true;
        this.title.iconClass = 'fa fa-comments-o';
        this.addClass('codevibeai-chat-panel');
        
        this.session = {
            id: uuidv4(),
            title: 'New Chat',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: []
        };
    }

    protected onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        const inputElem = document.getElementById('codevibeai-chat-input');
        if (inputElem) {
            inputElem.focus();
        }
    }

    protected render(): React.ReactNode {
        const { messages } = this.session;
        
        return (
            <div className="codevibeai-chat-container">
                <div className="codevibeai-chat-header">
                    <div className="codevibeai-chat-title">{this.session.title}</div>
                    <div className="codevibeai-chat-actions">
                        <button 
                            className="codevibeai-chat-action" 
                            title="New Chat"
                            onClick={this.onNewChat}>
                            <i className="fa fa-plus"></i>
                        </button>
                        <button 
                            className="codevibeai-chat-action" 
                            title="Clear Chat"
                            onClick={this.onClearChat}>
                            <i className="fa fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div className="codevibeai-chat-messages">
                    {messages.length === 0 ? (
                        <div className="codevibeai-chat-empty">
                            <div className="codevibeai-chat-empty-icon">
                                <i className="fa fa-comments-o"></i>
                            </div>
                            <div className="codevibeai-chat-empty-text">
                                Ask anything about your code
                            </div>
                            <div className="codevibeai-chat-suggestions">
                                <button 
                                    className="codevibeai-chat-suggestion"
                                    onClick={() => this.sendSuggestion("Explain how this code works")}>
                                    Explain how this code works
                                </button>
                                <button 
                                    className="codevibeai-chat-suggestion"
                                    onClick={() => this.sendSuggestion("Help me refactor this function")}>
                                    Help me refactor this function
                                </button>
                                <button 
                                    className="codevibeai-chat-suggestion"
                                    onClick={() => this.sendSuggestion("How can I improve this code?")}>
                                    How can I improve this code?
                                </button>
                                <button 
                                    className="codevibeai-chat-suggestion"
                                    onClick={() => this.sendSuggestion("Find potential bugs in this code")}>
                                    Find potential bugs in this code
                                </button>
                            </div>
                        </div>
                    ) : (
                        messages.map(message => (
                            <MessageComponent 
                                key={message.id} 
                                message={message} 
                                onFeedback={this.handleFeedback}
                                onCopyToClipboard={this.handleCopyToClipboard}
                                onInsertCode={this.handleInsertCode}
                            />
                        ))
                    )}
                    {this.loading && (
                        <div className="codevibeai-chat-loading">
                            <div className="codevibeai-chat-loading-spinner">
                                <div className="spinner"></div>
                            </div>
                            <div className="codevibeai-chat-loading-text">
                                Claude is thinking...
                            </div>
                        </div>
                    )}
                </div>
                <ChatInput
                    onSendMessage={this.handleSendMessage}
                    loading={this.loading}
                />
            </div>
        );
    }
    
    protected handleSendMessage = async (content: string): Promise<void> => {
        if (!content.trim()) return;
        
        // Create user message
        const userMessage: ChatMessage = {
            id: uuidv4(),
            sender: 'user',
            content,
            format: 'text',
            timestamp: Date.now()
        };
        
        // Add user message to chat
        this.session.messages.push(userMessage);
        this.session.updatedAt = Date.now();
        this.onMessageSentEmitter.fire(userMessage);
        this.update();
        
        // Set loading state
        this.loading = true;
        this.update();
        
        try {
            // Create assistant message placeholder
            const assistantMessage: ChatMessage = {
                id: uuidv4(),
                sender: 'assistant',
                content: '',
                format: 'markdown',
                timestamp: Date.now(),
                status: 'pending'
            };
            
            // Add assistant message to chat
            this.session.messages.push(assistantMessage);
            this.update();
            
            // Get context for the current file or selection
            const context = await this.chatService.getCurrentContext();
            
            // Send the message to AI service
            const response = await this.aiService.answerQuestion(content, JSON.stringify(context));
            
            // Update assistant message with response
            assistantMessage.content = response.content;
            assistantMessage.status = 'complete';
            assistantMessage.timestamp = Date.now();
            this.session.updatedAt = Date.now();
            this.onMessageReceivedEmitter.fire(assistantMessage);
            this.update();
        } catch (error) {
            // Handle error
            const errorMessage: ChatMessage = {
                id: uuidv4(),
                sender: 'assistant',
                content: `I'm sorry, but I encountered an error while processing your request. ${error.message}`,
                format: 'text',
                timestamp: Date.now(),
                status: 'error',
                error: error.message
            };
            
            // Add error message to chat
            this.session.messages.pop(); // Remove pending message
            this.session.messages.push(errorMessage);
            this.session.updatedAt = Date.now();
            this.onMessageReceivedEmitter.fire(errorMessage);
            this.update();
        } finally {
            // Reset loading state
            this.loading = false;
            this.update();
        }
    };
    
    protected handleFeedback = (messageId: string, feedback: 'thumbs_up' | 'thumbs_down'): void => {
        this.chatService.sendFeedback(messageId, feedback);
    };
    
    protected handleCopyToClipboard = (content: string): void => {
        navigator.clipboard.writeText(content);
    };
    
    protected handleInsertCode = (code: string): void => {
        this.chatService.insertCodeIntoEditor(code);
    };
    
    protected onNewChat = (): void => {
        this.session = {
            id: uuidv4(),
            title: 'New Chat',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: []
        };
        this.update();
    };
    
    protected onClearChat = (): void => {
        this.session.messages = [];
        this.session.updatedAt = Date.now();
        this.update();
    };
    
    protected sendSuggestion = (suggestion: string): void => {
        this.handleSendMessage(suggestion);
    };
}
```

### src/browser/components/editor/inline-actions.tsx

```tsx
import * as React from 'react';
import { injectable, inject } from '@theia/core/shared/inversify';
import { EditorWidget } from '@theia/editor/lib/browser';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { Message } from '@theia/core/lib/browser/widgets/widget';
import { AIService } from '@codevibeai/core';
import { DisposableCollection } from '@theia/core/lib/common/disposable';
import { CodeInsight } from '../../../common/ui-types';
import { VibeCodingService } from '../../../common/vibe-coding-service';

@injectable()
export class InlineActionsWidget extends ReactWidget {
    static readonly ID = 'codevibeai-inline-actions';
    
    @inject(AIService)
    protected readonly aiService: AIService;
    
    @inject(VibeCodingService)
    protected readonly vibeCodingService: VibeCodingService;
    
    protected readonly toDispose = new DisposableCollection();
    protected editor: EditorWidget | undefined;
    protected insights: CodeInsight[] = [];
    protected position = { line: 0, column: 0 };
    protected selectedCode = '';
    
    constructor() {
        super();
        this.id = InlineActionsWidget.ID;
        this.hide();
        this.addClass('codevibeai-inline-actions');
    }
    
    public setEditor(editor: EditorWidget): void {
        this.editor = editor;
        this.update();
    }
    
    public setPosition(line: number, column: number): void {
        this.position = { line, column };
        this.update();
    }
    
    public setSelectedCode(code: string): void {
        this.selectedCode = code;
        if (code) {
            this.getInsights();
        } else {
            this.insights = [];
        }
        this.update();
    }
    
    protected async getInsights(): Promise<void> {
        if (!this.selectedCode || !this.editor) {
            return;
        }
        
        try {
            const response = await this.aiService.analyzeCode(this.selectedCode, {});
            const insights = JSON.parse(response.content);
            if (Array.isArray(insights)) {
                this.insights = insights;
                this.update();
            }
        } catch (error) {
            console.error('Error getting insights', error);
        }
    }
    
    protected onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        this.update();
    }
    
    protected render(): React.ReactNode {
        if (!this.selectedCode) {
            return null;
        }
        
        return (
            <div className="codevibeai-inline-actions-container">
                <div className="codevibeai-inline-actions-buttons">
                    <button 
                        className="codevibeai-inline-action-button"
                        title="Explain Code"
                        onClick={this.handleExplainAction}>
                        <i className="fa fa-question-circle"></i>
                    </button>
                    <button 
                        className="codevibeai-inline-action-button"
                        title="Refactor Code"
                        onClick={this.handleRefactorAction}>
                        <i className="fa fa-magic"></i>
                    </button>
                    <button 
                        className="codevibeai-inline-action-button"
                        title="Find Issues"
                        onClick={this.handleFindIssuesAction}>
                        <i className="fa fa-bug"></i>
                    </button>
                    <button 
                        className="codevibeai-inline-action-button"
                        title="Optimize Code"
                        onClick={this.handleOptimizeAction}>
                        <i className="fa fa-bolt"></i>
                    </button>
                </div>
                {this.insights.length > 0 && (
                    <div className="codevibeai-inline-insights">
                        {this.insights.map(insight => (
                            <div key={insight.id} className="codevibeai-inline-insight">
                                <div className="codevibeai-inline-insight-icon">
                                    {this.getInsightIcon(insight.type)}
                                </div>
                                <div className="codevibeai-inline-insight-content">
                                    <div className="codevibeai-inline-insight-title">
                                        {insight.title}
                                    </div>
                                    <div className="codevibeai-inline-insight-description">
                                        {insight.description}
                                    </div>
                                    {insight.fix && (
                                        <button 
                                            className="codevibeai-inline-insight-fix-button"
                                            onClick={() => this.handleApplyFix(insight)}>
                                            Apply Fix
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }
    
    protected handleExplainAction = (): void => {
        // Implementation for explain action
    };
    
    protected handleRefactorAction = (): void => {
        // Implementation for refactor action
    };
    
    protected handleFindIssuesAction = (): void => {
        // Implementation for find issues action
    };
    
    protected handleOptimizeAction = (): void => {
        // Implementation for optimize action
    };
    
    protected handleApplyFix(insight: CodeInsight): void {
        if (!this.editor || !insight.fix) {
            return;
        }
        
        // Implementation for applying fix
    }
    
    protected getInsightIcon(type: string): React.ReactNode {
        switch (type) {
            case 'suggestion':
                return <i className="fa fa-lightbulb-o"></i>;
            case 'optimization':
                return <i className="fa fa-bolt"></i>;
            case 'security':
                return <i className="fa fa-shield"></i>;
            case 'best_practice':
                return <i className="fa fa-check-circle"></i>;
            case 'refactoring':
                return <i className="fa fa-code"></i>;
            default:
                return <i className="fa fa-info-circle"></i>;
        }
    }
}
```

### src/browser/services/vibe-coding-service.ts

```typescript
import { injectable, inject } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';
import { Emitter } from '@theia/core/lib/common/event';
import { PreferenceService } from '@theia/core/lib/browser';
import { VibeCodingService } from '../../common/vibe-coding-service';
import { AIService } from '@codevibeai/core';
import { Context7Service } from '@codevibeai/context7-integration';
import { NotificationService } from '../components/notification/notification-service';
import { ObserverManager } from '../observers/observer-manager';

/**
 * Implementation of the vibe coding service
 */
@injectable()
export class VibeCodingServiceImpl implements VibeCodingService {
    @inject(ILogger)
    protected readonly logger: ILogger;
    
    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;
    
    @inject(AIService)
    protected readonly aiService: AIService;
    
    @inject(Context7Service)
    protected readonly contextService: Context7Service;
    
    @inject(NotificationService)
    protected readonly notificationService: NotificationService;
    
    @inject(ObserverManager)
    protected readonly observerManager: ObserverManager;
    
    protected active = false;
    protected level = 0;
    
    protected readonly onActivatedEmitter = new Emitter<void>();
    readonly onActivated = this.onActivatedEmitter.event;
    
    protected readonly onDeactivatedEmitter = new Emitter<void>();
    readonly onDeactivated = this.onDeactivatedEmitter.event;
    
    protected readonly onLevelChangedEmitter = new Emitter<number>();
    readonly onLevelChanged = this.onLevelChangedEmitter.event;
    
    constructor() {
        this.initialize();
    }
    
    protected async initialize(): Promise<void> {
        try {
            // Load preferences
            const savedLevel = this.preferenceService.get('codevibeai.vibeCoding.level', 0);
            this.level = savedLevel;
            
            const autoActivate = this.preferenceService.get('codevibeai.vibeCoding.autoActivate', false);
            if (autoActivate) {
                await this.activate();
            }
            
            // Listen for preference changes
            this.preferenceService.onPreferenceChanged(change => {
                if (change.preferenceName === 'codevibeai.vibeCoding.level') {
                    this.level = change.newValue;
                    this.onLevelChangedEmitter.fire(this.level);
                    this.applyVibeCodingLevel();
                }
            });
        } catch (error) {
            this.logger.error(`Error initializing vibe coding service: ${error}`);
        }
    }
    
    /**
     * Activate vibe coding mode
     */
    async activate(): Promise<void> {
        if (this.active) {
            return;
        }
        
        try {
            // Check if AI service is ready
            const aiReady = await this.aiService.isReady();
            if (!aiReady) {
                this.notificationService.showError('AI service is not ready. Please check your configuration.');
                return;
            }
            
            // Start observers
            this.observerManager.startObservers();
            
            // Set active state
            this.active = true;
            this.onActivatedEmitter.fire();
            
            // Apply current level
            this.applyVibeCodingLevel();
            
            this.notificationService.showInfo(`Vibe Coding activated at level ${this.level}`);
        } catch (error) {
            this.logger.error(`Error activating vibe coding: ${error}`);
            this.notificationService.showError(`Failed to activate Vibe Coding: ${error.message}`);
        }
    }
    
    /**
     * Deactivate vibe coding mode
     */
    async deactivate(): Promise<void> {
        if (!this.active) {
            return;
        }
        
        try {
            // Stop observers
            this.observerManager.stopObservers();
            
            // Set inactive state
            this.active = false;
            this.onDeactivatedEmitter.fire();
            
            this.notificationService.showInfo('Vibe Coding deactivated');
        } catch (error) {
            this.logger.error(`Error deactivating vibe coding: ${error}`);
            this.notificationService.showError(`Failed to deactivate Vibe Coding: ${error.message}`);
        }
    }
    
    /**
     * Check if vibe coding mode is active
     */
    isActive(): boolean {
        return this.active;
    }
    
    /**
     * Get the current vibe coding level
     */
    getLevel(): number {
        return this.level;
    }
    
    /**
     * Set the vibe coding level
     */
    async setLevel(level: number): Promise<void> {
        if (level < 0 || level > 3) {
            throw new Error('Vibe coding level must be between 0 and 3');
        }
        
        this.level = level;
        this.onLevelChangedEmitter.fire(this.level);
        
        // Save to preferences
        await this.preferenceService.set('codevibeai.vibeCoding.level', level, undefined, 'user');
        
        // Apply level changes
        this.applyVibeCodingLevel();
        
        if (this.active) {
            this.notificationService.showInfo(`Vibe Coding level set to ${level}`);
        }
    }
    
    /**
     * Apply the current vibe coding level
     */
    protected applyVibeCodingLevel(): void {
        if (!this.active) {
            return;
        }
        
        // Configure observers based on level
        this.observerManager.setObserverLevel(this.level);
        
        // Configure completion and suggestion frequency based on level
        switch (this.level) {
            case 0: // Off
                this.observerManager.stopObservers();
                break;
                
            case 1: // Basic assistance
                // Only show completions when explicitly requested
                // Minimal automatic suggestions
                this.configureLevelOne();
                break;
                
            case 2: // Enhanced assistance
                // Show completions more frequently
                // More automatic suggestions
                this.configureLevelTwo();
                break;
                
            case 3: // Proactive assistance
                // Maximum assistance
                // Frequent completions and suggestions
                this.configureLevelThree();
                break;
        }
    }
    
    protected configureLevelOne(): void {
        // Implementation for level 1
    }
    
    protected configureLevelTwo(): void {
        // Implementation for level 2
    }
    
    protected configureLevelThree(): void {
        // Implementation for level 3
    }
}
```

### src/browser/codevibeai-ui-commands.ts

```typescript
/**
 * UI Commands for CodeVibeAI
 */
export namespace CodeVibeAIUICommands {
    // Category
    export const CODEVIBEAI_UI_CATEGORY = 'CodeVibeAI';
    
    // Chat commands
    export const OPEN_CHAT = {
        id: 'codevibeai.ui.openChat',
        label: 'Open AI Chat'
    };
    
    export const CLEAR_CHAT = {
        id: 'codevibeai.ui.clearChat',
        label: 'Clear AI Chat'
    };
    
    export const ASK_QUESTION = {
        id: 'codevibeai.ui.askQuestion',
        label: 'Ask AI About Code'
    };
    
    // Editor commands
    export const EXPLAIN_CODE = {
        id: 'codevibeai.ui.explainCode',
        label: 'Explain Code'
    };
    
    export const REFACTOR_CODE = {
        id: 'codevibeai.ui.refactorCode',
        label: 'Refactor Code'
    };
    
    export const OPTIMIZE_CODE = {
        id: 'codevibeai.ui.optimizeCode',
        label: 'Optimize Code'
    };
    
    export const GENERATE_COMMENTS = {
        id: 'codevibeai.ui.generateComments',
        label: 'Generate Comments'
    };
    
    export const GENERATE_TESTS = {
        id: 'codevibeai.ui.generateTests',
        label: 'Generate Tests'
    };
    
    // Inline completion commands
    export const ACCEPT_COMPLETION = {
        id: 'codevibeai.ui.acceptCompletion',
        label: 'Accept AI Completion'
    };
    
    export const REJECT_COMPLETION = {
        id: 'codevibeai.ui.rejectCompletion',
        label: 'Reject AI Completion'
    };
    
    export const TRIGGER_COMPLETION = {
        id: 'codevibeai.ui.triggerCompletion',
        label: 'Trigger AI Completion'
    };
    
    // Vibe coding commands
    export const TOGGLE_VIBE_CODING = {
        id: 'codevibeai.ui.toggleVibeCoding',
        label: 'Toggle Vibe Coding'
    };
    
    export const SET_VIBE_LEVEL_0 = {
        id: 'codevibeai.ui.setVibeLevel0',
        label: 'Set Vibe Level: Off'
    };
    
    export const SET_VIBE_LEVEL_1 = {
        id: 'codevibeai.ui.setVibeLevel1',
        label: 'Set Vibe Level: Basic'
    };
    
    export const SET_VIBE_LEVEL_2 = {
        id: 'codevibeai.ui.setVibeLevel2',
        label: 'Set Vibe Level: Enhanced'
    };
    
    export const SET_VIBE_LEVEL_3 = {
        id: 'codevibeai.ui.setVibeLevel3',
        label: 'Set Vibe Level: Proactive'
    };
    
    // Insights commands
    export const OPEN_INSIGHTS = {
        id: 'codevibeai.ui.openInsights',
        label: 'Open AI Insights'
    };
    
    export const ANALYZE_CODE = {
        id: 'codevibeai.ui.analyzeCode',
        label: 'Analyze Code with AI'
    };
    
    // Context commands
    export const OPEN_CONTEXT = {
        id: 'codevibeai.ui.openContext',
        label: 'Open Code Context'
    };
    
    export const SHOW_SEMANTIC_LINKS = {
        id: 'codevibeai.ui.showSemanticLinks',
        label: 'Show Semantic Links'
    };
    
    // Settings commands
    export const OPEN_SETTINGS = {
        id: 'codevibeai.ui.openSettings',
        label: 'Open AI Settings'
    };
}
```

### src/browser/observers/code-observer.ts

```typescript
import { injectable, inject } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';
import { Disposable, DisposableCollection } from '@theia/core/lib/common/disposable';
import { Emitter } from '@theia/core/lib/common/event';
import { EditorManager } from '@theia/editor/lib/browser';
import { MonacoEditor } from '@theia/monaco/lib/browser/monaco-editor';
import { AIService } from '@codevibeai/core';
import { VibeCodingService } from '../../common/vibe-coding-service';
import { SuggestionService } from '../services/suggestion-service';
import { debounce } from '../utils/dom-utils';

/**
 * Observer for code changes and editor interactions
 */
@injectable()
export class CodeObserver implements Disposable {
    @inject(ILogger)
    protected readonly logger: ILogger;
    
    @inject(EditorManager)
    protected readonly editorManager: EditorManager;
    
    @inject(AIService)
    protected readonly aiService: AIService;
    
    @inject(VibeCodingService)
    protected readonly vibeCodingService: VibeCodingService;
    
    @inject(SuggestionService)
    protected readonly suggestionService: SuggestionService;
    
    protected readonly toDispose = new DisposableCollection();
    protected active = false;
    protected level = 0;
    protected lastChangeTime = 0;
    protected changeTimeout: any = null;
    
    protected readonly onCodeInsightEmitter = new Emitter<any>();
    readonly onCodeInsight = this.onCodeInsightEmitter.event;
    
    protected readonly onCodePausedEmitter = new Emitter<{ editor: MonacoEditor, position: any }>();
    readonly onCodePaused = this.onCodePausedEmitter.event;
    
    protected readonly debouncedHandleCodeChange = debounce(this.handleCodeChange.bind(this), 500);
    protected readonly debouncedHandleCodePause = debounce(this.handleCodePause.bind(this), 2000);
    
    constructor() {
        this.toDispose.push(this.onCodeInsightEmitter);
        this.toDispose.push(this.onCodePausedEmitter);
    }
    
    /**
     * Start observing code changes
     */
    start(): void {
        if (this.active) {
            return;
        }
        
        this.active = true;
        this.level = this.vibeCodingService.getLevel();
        
        this.subscribeToEvents();
        
        this.vibeCodingService.onLevelChanged(level => {
            this.level = level;
        });
    }
    
    /**
     * Stop observing code changes
     */
    stop(): void {
        if (!this.active) {
            return;
        }
        
        this.active = false;
        this.unsubscribeFromEvents();
    }
    
    /**
     * Set the observation level
     */
    setLevel(level: number): void {
        this.level = level;
    }
    
    /**
     * Dispose of resources
     */
    dispose(): void {
        this.stop();
        this.toDispose.dispose();
    }
    
    protected subscribeToEvents(): void {
        // Subscribe to editor manager events
        this.toDispose.push(
            this.editorManager.onCurrentEditorChanged(editor => {
                this.handleEditorChanged(editor);
            })
        );
        
        // Handle current editor if it exists
        const currentEditor = this.editorManager.currentEditor;
        if (currentEditor) {
            this.handleEditorChanged(currentEditor);
        }
    }
    
    protected unsubscribeFromEvents(): void {
        this.toDispose.dispose();
    }
    
    protected handleEditorChanged(editor: any): void {
        if (!editor || !this.active) {
            return;
        }
        
        const monacoEditor = editor.editor as MonacoEditor;
        if (!monacoEditor) {
            return;
        }
        
        // Subscribe to editor model changes
        const model = monacoEditor.getControl().getModel();
        if (model) {
            this.toDispose.push(
                model.onDidChangeContent(e => {
                    this.debouncedHandleCodeChange(monacoEditor, e);
                })
            );
            
            // Subscribe to cursor position changes
            this.toDispose.push(
                monacoEditor.getControl().onDidChangeCursorPosition(e => {
                    this.debouncedHandleCodePause(monacoEditor, e);
                })
            );
        }
    }
    
    protected handleCodeChange(editor: MonacoEditor, event: any): void {
        if (!this.active || this.level === 0) {
            return;
        }
        
        this.lastChangeTime = Date.now();
        
        // Clear any pending timeout
        if (this.changeTimeout) {
            clearTimeout(this.changeTimeout);
        }
        
        // Different behavior based on level
        if (this.level >= 2) {
            // For levels 2 and 3, trigger suggestions after a change
            this.triggerSuggestion(editor);
        }
    }
    
    protected handleCodePause(editor: MonacoEditor, event: any): void {
        if (!this.active || this.level === 0) {
            return;
        }
        
        const timeSinceChange = Date.now() - this.lastChangeTime;
        if (timeSinceChange < 2000) {
            // Too recent after a change, don't trigger
            return;
        }
        
        const position = editor.getControl().getPosition();
        
        // Emit code paused event
        this.onCodePausedEmitter.fire({ editor, position });
        
        // For level 3 (proactive), offer more suggestions when paused
        if (this.level === 3) {
            this.triggerCodeInsights(editor);
        }
    }
    
    protected triggerSuggestion(editor: MonacoEditor): void {
        if (!editor || !this.active) {
            return;
        }
        
        const model = editor.getControl().getModel();
        const position = editor.getControl().getPosition();
        
        if (!model || !position) {
            return;
        }
        
        // Get the current line of code
        const lineContent = model.getLineContent(position.lineNumber);
        
        // Only trigger for substantial content
        if (lineContent.trim().length < 10) {
            return;
        }
        
        // Get context around the cursor
        const startLine = Math.max(1, position.lineNumber - 10);
        const endLine = Math.min(model.getLineCount(), position.lineNumber + 5);
        const context = model.getValueInRange({
            startLineNumber: startLine,
            startColumn: 1,
            endLineNumber: endLine,
            endColumn: model.getLineMaxColumn(endLine)
        });
        
        this.suggestionService.suggestCompletion(editor, position, context);
    }
    
    protected triggerCodeInsights(editor: MonacoEditor): void {
        if (!editor || !this.active || this.level < 3) {
            return;
        }
        
        // Implementation for code insights
    }
}
```

## Activation and Loading

- **Startup Optimization**:
  - Minimal initial loading for UI components
  - Main view components loaded on first activation
  - Cached widget instances for fast switching
  - Deferred styling application

- **Lazy Loading Strategy**:
  - Components initialize on first rendering
  - Heavy services (e.g., insights, context) loaded on demand
  - View contributions initialize only when views are opened
  - Observers start only when vibe coding is active

- **Internationalization**:
  - i18n messages stored externally in JSON files
  - Dynamic message loading based on user locale
  - String externalization in UI components
  - Right-to-left support in styling

## UI Components

The extension provides specialized UI components for different aspects of the AI experience:

1. **Chat Panel**: Interactive AI chat interface for code discussions
2. **Inline Completions**: Contextual code completions while typing
3. **Code Insights**: AI-driven code analysis and suggestions
4. **Context Panel**: Visualization of code context and relationships
5. **Inline Actions**: Quick AI actions for selected code
6. **Status Indicators**: AI status and activity in the status bar
7. **Settings Panel**: Configuration interface for AI features

## Service Interfaces

- **VibeCodingService**: Manages the "vibe coding" experience and activation levels
- **PromptService**: Handles prompt engineering and context-enriched prompts
- **SuggestionService**: Manages code suggestions and completions
- **UIIntegrationService**: Coordinates UI updates and interactions
- **ObserverManager**: Manages code and activity observers
- **ComponentRegistry**: Registry for UI components and extensions

## Keyboard Shortcuts

- **Alt+Space**: Trigger inline code completion
- **Alt+C**: Open AI chat panel
- **Alt+I**: Open code insights panel
- **Alt+V**: Toggle vibe coding mode
- **Alt+1/2/3**: Set vibe coding level
- **Alt+E**: Explain selected code
- **Alt+R**: Refactor selected code
- **Alt+T**: Generate tests for selected code
- **Ctrl+Enter**: Send message in chat panel

## Theme and Styling

- **Custom Theming**: Light and dark theme support
- **CSS Variables**: Theme-aware styling
- **Responsive Design**: Adaptable UI for different sizes
- **Animation**: Subtle animations for feedback and transitions
- **Icon Set**: Dedicated icon set for AI features

## Performance Considerations

- **Efficient Rendering**: React component memoization
- **Throttling**: Debounced event handling for editor events
- **Virtualization**: Virtual scrolling for large chat histories
- **Partial Updates**: Update only changed components
- **Background Processing**: Heavy operations run in the background

## Dependencies

- **Required Dependencies**:
  - @codevibeai/core: Core service interfaces
  - @codevibeai/claude-integration: Claude AI integration
  - @codevibeai/context7-integration: Code context integration
  - @theia/core: Theia core functionality
  - @theia/editor: Editor integration
  - @theia/monaco: Monaco editor integration
  - React: UI component library

- **Cross-extension Dependencies**:
  - Consumes services from @codevibeai/core
  - Integrates with @codevibeai/claude-integration for AI responses
  - Uses @codevibeai/context7-integration for code context