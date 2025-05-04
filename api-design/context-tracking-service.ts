import { Event } from '@theia/core/lib/common/event';
import { Disposable } from '@theia/core/lib/common/disposable';
import { URI } from '@theia/core/lib/common/uri';
import { EditorWidget } from '@theia/editor/lib/browser/editor-widget';
import { TextDocumentContentChangeEvent } from 'vscode-languageserver-protocol';

/**
 * Editor context event type
 */
export enum EditorContextEventType {
    /** File opened */
    FILE_OPENED = 'file_opened',
    /** File closed */
    FILE_CLOSED = 'file_closed',
    /** File changed */
    FILE_CHANGED = 'file_changed',
    /** File saved */
    FILE_SAVED = 'file_saved',
    /** Selection changed */
    SELECTION_CHANGED = 'selection_changed',
    /** Cursor moved */
    CURSOR_MOVED = 'cursor_moved',
    /** Viewport changed */
    VIEWPORT_CHANGED = 'viewport_changed'
}

/**
 * Editor context event
 */
export interface EditorContextEvent {
    /** Event type */
    type: EditorContextEventType;
    /** File URI */
    uri: URI;
    /** Editor widget */
    editor?: EditorWidget;
    /** Event timestamp */
    timestamp: number;
    /** Event data */
    data?: {
        /** Text content (for file events) */
        content?: string;
        /** Selection (for selection events) */
        selection?: {
            /** Start line (0-based) */
            startLineNumber: number;
            /** Start column (0-based) */
            startColumn: number;
            /** End line (0-based) */
            endLineNumber: number;
            /** End column (0-based) */
            endColumn: number;
        };
        /** Content changes (for change events) */
        contentChanges?: TextDocumentContentChangeEvent[];
        /** Cursor position (for cursor events) */
        cursor?: {
            /** Line number (0-based) */
            lineNumber: number;
            /** Column (0-based) */
            column: number;
        };
        /** Viewport (for viewport events) */
        viewport?: {
            /** Start line (0-based) */
            startLineNumber: number;
            /** End line (0-based) */
            endLineNumber: number;
        };
    };
    /** Additional metadata */
    metadata?: {[key: string]: any};
}

/**
 * Project context event type
 */
export enum ProjectContextEventType {
    /** File created */
    FILE_CREATED = 'file_created',
    /** File deleted */
    FILE_DELETED = 'file_deleted',
    /** File renamed */
    FILE_RENAMED = 'file_renamed',
    /** Directory created */
    DIRECTORY_CREATED = 'directory_created',
    /** Directory deleted */
    DIRECTORY_DELETED = 'directory_deleted',
    /** Project structure changed */
    STRUCTURE_CHANGED = 'structure_changed',
    /** Dependencies changed */
    DEPENDENCIES_CHANGED = 'dependencies_changed'
}

/**
 * Project context event
 */
export interface ProjectContextEvent {
    /** Event type */
    type: ProjectContextEventType;
    /** Project root URI */
    projectRoot: URI;
    /** Event timestamp */
    timestamp: number;
    /** Event data */
    data?: {
        /** File URI (for file events) */
        uri?: URI;
        /** Old URI (for rename events) */
        oldUri?: URI;
        /** New URI (for rename events) */
        newUri?: URI;
        /** Changed files (for structure events) */
        changedFiles?: URI[];
        /** Changes in dependencies */
        dependencyChanges?: {
            /** Added dependencies */
            added?: string[];
            /** Removed dependencies */
            removed?: string[];
            /** Updated dependencies */
            updated?: string[];
        };
    };
    /** Additional metadata */
    metadata?: {[key: string]: any};
}

/**
 * IDE context event type
 */
export enum IDEContextEventType {
    /** IDE started */
    IDE_STARTED = 'ide_started',
    /** IDE shutting down */
    IDE_SHUTTING_DOWN = 'ide_shutting_down',
    /** Project opened */
    PROJECT_OPENED = 'project_opened',
    /** Project closed */
    PROJECT_CLOSED = 'project_closed',
    /** View changed */
    VIEW_CHANGED = 'view_changed',
    /** Extension activated */
    EXTENSION_ACTIVATED = 'extension_activated',
    /** Extension deactivated */
    EXTENSION_DEACTIVATED = 'extension_deactivated',
    /** Command executed */
    COMMAND_EXECUTED = 'command_executed',
    /** Terminal command executed */
    TERMINAL_COMMAND = 'terminal_command'
}

/**
 * IDE context event
 */
export interface IDEContextEvent {
    /** Event type */
    type: IDEContextEventType;
    /** Event timestamp */
    timestamp: number;
    /** Event data */
    data?: {
        /** View ID (for view events) */
        viewId?: string;
        /** Extension ID (for extension events) */
        extensionId?: string;
        /** Command ID (for command events) */
        commandId?: string;
        /** Command arguments (for command events) */
        commandArgs?: any[];
        /** Terminal command (for terminal events) */
        terminalCommand?: string;
        /** Project root (for project events) */
        projectRoot?: URI;
    };
    /** Additional metadata */
    metadata?: {[key: string]: any};
}

/**
 * Active context state
 */
export interface ActiveContextState {
    /** Active file URI */
    activeFile?: URI;
    /** Active editor */
    activeEditor?: EditorWidget;
    /** Current selection */
    selection?: {
        /** Start line (0-based) */
        startLineNumber: number;
        /** Start column (0-based) */
        startColumn: number;
        /** End line (0-based) */
        endLineNumber: number;
        /** End column (0-based) */
        endColumn: number;
        /** Selected text */
        text: string;
    };
    /** Current cursor position */
    cursor?: {
        /** Line number (0-based) */
        lineNumber: number;
        /** Column (0-based) */
        column: number;
    };
    /** Current viewport */
    viewport?: {
        /** Start line (0-based) */
        startLineNumber: number;
        /** End line (0-based) */
        endLineNumber: number;
    };
    /** Active project */
    activeProject?: URI;
    /** Active view */
    activeView?: string;
    /** Recent files */
    recentFiles: URI[];
    /** Recent commands */
    recentCommands: string[];
    /** Timestamp when state was last updated */
    timestamp: number;
}

/**
 * Context relevance score
 */
export interface ContextRelevanceScore {
    /** File URI */
    uri: URI;
    /** Relevance score (0-1) */
    score: number;
    /** Relevance factors */
    factors: {
        /** Recent activity score */
        recentActivity?: number;
        /** Edit frequency score */
        editFrequency?: number;
        /** Time spent score */
        timeSpent?: number;
        /** Semantic relevance score */
        semanticRelevance?: number;
        /** Additional factors */
        [key: string]: number | undefined;
    };
}

/**
 * Context tracking configuration
 */
export interface ContextTrackingConfig {
    /** Enable/disable editor context tracking */
    trackEditorContext: boolean;
    /** Enable/disable project context tracking */
    trackProjectContext: boolean;
    /** Enable/disable IDE context tracking */
    trackIDEContext: boolean;
    /** Maximum events to keep in history */
    maxHistoryEvents: number;
    /** Maximum files to track */
    maxTrackedFiles: number;
    /** Events to ignore */
    ignoreEvents: string[];
    /** Files patterns to ignore */
    ignoreFiles: string[];
    /** Enable/disable sensitive data filtering */
    filterSensitiveData: boolean;
    /** Additional configuration */
    [key: string]: any;
}

/**
 * Context filtering options
 */
export interface ContextFilterOptions {
    /** Maximum files to include */
    maxFiles?: number;
    /** Maximum events to include */
    maxEvents?: number;
    /** Include recent files */
    includeRecentFiles?: boolean;
    /** Include current file */
    includeCurrentFile?: boolean;
    /** Include related files */
    includeRelatedFiles?: boolean;
    /** Include project structure */
    includeProjectStructure?: boolean;
    /** Related files relevance threshold (0-1) */
    relevanceThreshold?: number;
    /** Maximum context age in milliseconds */
    maxContextAge?: number;
    /** Additional filters */
    [key: string]: any;
}

/**
 * Context summary
 */
export interface ContextSummary {
    /** Active file information */
    activeFile?: {
        /** File URI */
        uri: URI;
        /** Programming language */
        language: string;
        /** File content */
        content?: string;
        /** Current selection */
        selection?: string;
    };
    /** Recent files */
    recentFiles: Array<{
        /** File URI */
        uri: URI;
        /** Programming language */
        language: string;
        /** Last accessed timestamp */
        lastAccessed: number;
    }>;
    /** Related files */
    relatedFiles?: Array<{
        /** File URI */
        uri: URI;
        /** Programming language */
        language: string;
        /** Relevance score */
        relevance: number;
        /** Relationship type */
        relationshipType?: string;
    }>;
    /** Project structure */
    projectStructure?: any;
    /** Recent commands */
    recentCommands?: string[];
    /** Summary timestamp */
    timestamp: number;
}

/**
 * Service for tracking IDE context.
 * 
 * This service monitors and records user interactions with the IDE,
 * including editor activities, project changes, and IDE events.
 * It provides this context to AI services for more relevant and accurate assistance.
 * 
 * @example
 * ```typescript
 * // Get the context tracking service
 * const contextService = container.get<ContextTrackingService>(ContextTrackingService);
 * 
 * // Initialize with configuration
 * await contextService.initialize({
 *   trackEditorContext: true,
 *   trackProjectContext: true,
 *   trackIDEContext: true,
 *   maxHistoryEvents: 1000,
 *   maxTrackedFiles: 100,
 *   ignoreEvents: ['cursor_moved'],
 *   ignoreFiles: ['node_modules/**', '**/.git/**'],
 *   filterSensitiveData: true
 * });
 * 
 * // Get the current context summary
 * const context = await contextService.getContextSummary();
 * console.log(`Active file: ${context.activeFile?.uri.toString()}`);
 * ```
 */
export interface ContextTrackingService extends Disposable {
    /**
     * Event fired when editor context changes
     */
    readonly onEditorContextChanged: Event<EditorContextEvent>;
    
    /**
     * Event fired when project context changes
     */
    readonly onProjectContextChanged: Event<ProjectContextEvent>;
    
    /**
     * Event fired when IDE context changes
     */
    readonly onIDEContextChanged: Event<IDEContextEvent>;
    
    /**
     * Event fired when active context state changes
     */
    readonly onActiveContextChanged: Event<ActiveContextState>;
    
    /**
     * Initialize the context tracking service.
     * 
     * @param config - Optional configuration
     * @returns Promise that resolves when initialization is complete
     * 
     * @example
     * ```typescript
     * await contextService.initialize({
     *   trackEditorContext: true,
     *   trackProjectContext: true,
     *   maxHistoryEvents: 500
     * });
     * ```
     */
    initialize(config?: Partial<ContextTrackingConfig>): Promise<void>;
    
    /**
     * Start tracking context.
     * 
     * @returns Promise that resolves when tracking is started
     * 
     * @example
     * ```typescript
     * await contextService.startTracking();
     * console.log("Context tracking started");
     * ```
     */
    startTracking(): Promise<void>;
    
    /**
     * Stop tracking context.
     * 
     * @returns Promise that resolves when tracking is stopped
     * 
     * @example
     * ```typescript
     * await contextService.stopTracking();
     * console.log("Context tracking paused");
     * ```
     */
    stopTracking(): Promise<void>;
    
    /**
     * Check if context tracking is active.
     * 
     * @returns True if tracking is active, false otherwise
     * 
     * @example
     * ```typescript
     * if (contextService.isTracking()) {
     *   console.log("Context tracking is active");
     * } else {
     *   console.log("Context tracking is paused");
     * }
     * ```
     */
    isTracking(): boolean;
    
    /**
     * Get the current context configuration.
     * 
     * @returns Current context configuration
     * 
     * @example
     * ```typescript
     * const config = contextService.getConfiguration();
     * console.log(`Max history events: ${config.maxHistoryEvents}`);
     * ```
     */
    getConfiguration(): ContextTrackingConfig;
    
    /**
     * Update the context configuration.
     * 
     * @param config - Partial configuration to update
     * @returns Promise that resolves when configuration is updated
     * 
     * @example
     * ```typescript
     * await contextService.updateConfiguration({
     *   trackEditorContext: false,
     *   ignoreEvents: ['cursor_moved', 'viewport_changed']
     * });
     * ```
     */
    updateConfiguration(config: Partial<ContextTrackingConfig>): Promise<void>;
    
    /**
     * Get the current active context state.
     * 
     * @returns Current active context state
     * 
     * @example
     * ```typescript
     * const state = contextService.getActiveContextState();
     * if (state.activeFile) {
     *   console.log(`Active file: ${state.activeFile.toString()}`);
     * }
     * ```
     */
    getActiveContextState(): ActiveContextState;
    
    /**
     * Get a summary of the current context.
     * 
     * @param options - Optional filter options
     * @returns Promise that resolves to context summary
     * 
     * @example
     * ```typescript
     * const summary = await contextService.getContextSummary({
     *   maxFiles: 10,
     *   includeCurrentFile: true,
     *   includeRelatedFiles: true,
     *   relevanceThreshold: 0.5
     * });
     * ```
     */
    getContextSummary(options?: ContextFilterOptions): Promise<ContextSummary>;
    
    /**
     * Get context history events.
     * 
     * @param eventTypes - Optional event types to filter
     * @param limit - Optional maximum number of events to return
     * @param olderThan - Optional timestamp to get events older than
     * @returns Array of context events
     * 
     * @example
     * ```typescript
     * // Get last 20 editor events
     * const editorEvents = contextService.getContextHistory(
     *   [
     *     EditorContextEventType.FILE_OPENED,
     *     EditorContextEventType.FILE_CHANGED,
     *     EditorContextEventType.SELECTION_CHANGED
     *   ],
     *   20
     * );
     * ```
     */
    getContextHistory(
        eventTypes?: Array<EditorContextEventType | ProjectContextEventType | IDEContextEventType>,
        limit?: number,
        olderThan?: number
    ): Array<EditorContextEvent | ProjectContextEvent | IDEContextEvent>;
    
    /**
     * Get related files for the active file.
     * 
     * @param uri - Optional file URI (uses active file if not provided)
     * @param limit - Optional maximum number of files to return
     * @returns Promise that resolves to array of relevance scores
     * 
     * @example
     * ```typescript
     * // Get top 5 files related to the active file
     * const relatedFiles = await contextService.getRelatedFiles(undefined, 5);
     * for (const file of relatedFiles) {
     *   console.log(`${file.uri.toString()}: ${file.score}`);
     * }
     * ```
     */
    getRelatedFiles(uri?: URI, limit?: number): Promise<ContextRelevanceScore[]>;
    
    /**
     * Get the content of a file from context.
     * 
     * @param uri - File URI
     * @returns Promise that resolves to file content if available
     * 
     * @example
     * ```typescript
     * const fileUri = new URI('/project/src/app.js');
     * const content = await contextService.getFileContent(fileUri);
     * if (content) {
     *   console.log(`File has ${content.length} characters`);
     * }
     * ```
     */
    getFileContent(uri: URI): Promise<string | undefined>;
    
    /**
     * Get the most recently active files.
     * 
     * @param limit - Optional maximum number of files to return
     * @returns Array of recently active files with timestamps
     * 
     * @example
     * ```typescript
     * // Get top 3 most recently active files
     * const recentFiles = contextService.getRecentFiles(3);
     * for (const file of recentFiles) {
     *   console.log(`${file.uri.toString()} (${new Date(file.timestamp).toLocaleTimeString()})`);
     * }
     * ```
     */
    getRecentFiles(limit?: number): Array<{uri: URI, timestamp: number}>;
    
    /**
     * Get the most recently executed commands.
     * 
     * @param limit - Optional maximum number of commands to return
     * @returns Array of recently executed commands with timestamps
     * 
     * @example
     * ```typescript
     * // Get top 5 most recently executed commands
     * const recentCommands = contextService.getRecentCommands(5);
     * for (const cmd of recentCommands) {
     *   console.log(`${cmd.commandId} (${new Date(cmd.timestamp).toLocaleTimeString()})`);
     * }
     * ```
     */
    getRecentCommands(limit?: number): Array<{commandId: string, timestamp: number}>;
    
    /**
     * Clear context history.
     * 
     * @param olderThan - Optional timestamp to clear events older than
     * @returns Promise that resolves when history is cleared
     * 
     * @example
     * ```typescript
     * // Clear all context history
     * await contextService.clearHistory();
     * 
     * // Or clear history older than 24 hours
     * const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
     * await contextService.clearHistory(oneDayAgo);
     * ```
     */
    clearHistory(olderThan?: number): Promise<void>;
    
    /**
     * Format context for AI prompts.
     * 
     * @param options - Optional context formatting options
     * @returns Promise that resolves to formatted context string
     * 
     * @example
     * ```typescript
     * const contextString = await contextService.formatContextForPrompt({
     *   includeCurrentFile: true,
     *   includeRelatedFiles: true,
     *   maxFiles: 3
     * });
     * 
     * // Use in AI prompt
     * const prompt = `Given this context:\n\n${contextString}\n\nHow do I implement...`;
     * ```
     */
    formatContextForPrompt(options?: ContextFilterOptions): Promise<string>;
    
    /**
     * Manually record a context event.
     * 
     * @param event - Context event to record
     * 
     * @example
     * ```typescript
     * // Record a custom IDE context event
     * contextService.recordEvent({
     *   type: IDEContextEventType.COMMAND_EXECUTED,
     *   timestamp: Date.now(),
     *   data: {
     *     commandId: 'my-custom-command',
     *     commandArgs: ['arg1', 'arg2']
     *   }
     * });
     * ```
     */
    recordEvent(
        event: EditorContextEvent | ProjectContextEvent | IDEContextEvent
    ): void;
    
    /**
     * Get time spent on a file.
     * 
     * @param uri - File URI
     * @param timeRange - Optional time range in milliseconds
     * @returns Time spent in milliseconds
     * 
     * @example
     * ```typescript
     * const fileUri = new URI('/project/src/app.js');
     * 
     * // Get time spent on file in the last hour
     * const oneHourMs = 60 * 60 * 1000;
     * const timeSpent = contextService.getTimeSpentOnFile(fileUri, oneHourMs);
     * 
     * console.log(`Time spent: ${timeSpent / 1000} seconds`);
     * ```
     */
    getTimeSpentOnFile(uri: URI, timeRange?: number): number;
}