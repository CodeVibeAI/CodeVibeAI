import { injectable, inject } from 'inversify';
import { TextEditor, DecorationOptions, ThemeService, ColorRegistry } from '@theia/editor/lib/browser';
import { ILogger } from '@theia/core';
import { Context7Service } from '../common/context7-protocol';
import { SymbolContext } from '../node/context7-knowledge-service';

/**
 * Decoration types
 */
export interface Context7Decoration {
    readonly symbolName: string;
    readonly popularity: number;
    readonly tooltip: string;
    readonly type: 'popular' | 'documented' | 'example' | 'unknown';
}

/**
 * Provides decorations for code based on Context7 knowledge
 */
@injectable()
export class Context7DecorationProvider {
    private static readonly DECORATION_TYPES = {
        POPULAR: 'context7-symbol-popular',
        DOCUMENTED: 'context7-symbol-documented',
        EXAMPLE: 'context7-symbol-example',
        UNKNOWN: 'context7-symbol-unknown'
    };
    
    @inject(ThemeService)
    protected readonly themeService: ThemeService;
    
    @inject(ColorRegistry)
    protected readonly colorRegistry: ColorRegistry;
    
    @inject(Context7Service)
    protected readonly context7Service: Context7Service;
    
    @inject(ILogger)
    protected readonly logger: ILogger;
    
    private decorations: Map<string, Context7Decoration[]> = new Map();
    
    /**
     * Initialize the decoration provider with styles
     */
    initialize(): void {
        this.registerDecorationTypes();
    }
    
    /**
     * Register decoration types with the editor
     */
    registerDecorationTypes(): void {
        // Popular symbol decoration (green underline)
        monaco.editor.createDecorationsCollection(Context7DecorationProvider.DECORATION_TYPES.POPULAR, {
            isWholeLine: false,
            className: '',
            inlineClassName: 'context7-popular-symbol',
            beforeContentClassName: '',
            afterContentClassName: '',
            glyphMarginClassName: '',
            overviewRulerLane: monaco.editor.OverviewRulerLane.Right,
            overviewRulerColor: 'rgba(47, 199, 47, 0.7)',
            after: {
                contentText: '✓',
                color: 'darkgreen',
                fontStyle: 'normal',
                fontWeight: 'normal',
                margin: '0 0 0 3px',
                width: '0.5em',
                height: '0.5em'
            }
        });
        
        // Documented symbol decoration (blue underline)
        monaco.editor.createDecorationsCollection(Context7DecorationProvider.DECORATION_TYPES.DOCUMENTED, {
            isWholeLine: false,
            className: '',
            inlineClassName: 'context7-documented-symbol',
            beforeContentClassName: '',
            afterContentClassName: '',
            glyphMarginClassName: '',
            overviewRulerLane: monaco.editor.OverviewRulerLane.Right,
            overviewRulerColor: 'rgba(47, 147, 199, 0.7)'
        });
        
        // Example available decoration (orange dot)
        monaco.editor.createDecorationsCollection(Context7DecorationProvider.DECORATION_TYPES.EXAMPLE, {
            isWholeLine: false,
            className: '',
            inlineClassName: 'context7-example-symbol',
            beforeContentClassName: '',
            afterContentClassName: '',
            glyphMarginClassName: '',
            overviewRulerLane: monaco.editor.OverviewRulerLane.Right,
            overviewRulerColor: 'rgba(255, 147, 0, 0.7)',
            after: {
                contentText: '•',
                color: 'darkorange',
                fontStyle: 'normal',
                fontWeight: 'normal',
                margin: '0 0 0 3px'
            }
        });
        
        // Unknown symbol decoration (no decoration)
        monaco.editor.createDecorationsCollection(Context7DecorationProvider.DECORATION_TYPES.UNKNOWN, {
            isWholeLine: false,
            className: '',
            inlineClassName: 'context7-unknown-symbol',
            beforeContentClassName: '',
            afterContentClassName: ''
        });
        
        // Add CSS styles
        const style = document.createElement('style');
        style.textContent = `
            .context7-popular-symbol {
                border-bottom: 1px solid rgba(47, 199, 47, 0.7);
            }
            
            .context7-documented-symbol {
                border-bottom: 1px dashed rgba(47, 147, 199, 0.7);
            }
            
            .context7-example-symbol {
                border-bottom: 1px dotted rgba(255, 147, 0, 0.7);
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Update decorations for a specific editor
     */
    async updateDecorations(editor: TextEditor): Promise<void> {
        try {
            const document = editor.document;
            
            // Skip if already processed recently (debounce)
            if (this.decorations.has(document.uri.toString())) {
                this.applyDecorations(editor);
                return;
            }
            
            // Extract language and document content
            const language = document.languageId;
            const documentText = document.getText();
            
            // Extract imports
            const imports = this.extractImports(documentText, language);
            
            // Extract symbols from document
            const symbols = this.extractSymbols(documentText, language);
            
            if (symbols.length === 0) {
                return;
            }
            
            // Limit to 20 most important symbols to avoid too many API calls
            const limitedSymbols = symbols.slice(0, 20);
            
            // Create decoration results
            const decorationResults: Context7Decoration[] = [];
            
            // Process each symbol
            for (const symbol of limitedSymbols) {
                try {
                    // Create symbol context
                    const symbolContext: SymbolContext = {
                        symbolName: symbol,
                        language,
                        imports,
                        sourceFile: document.uri.toString()
                    };
                    
                    // Find documentation for symbol
                    const docs = await this.context7Service.findDocumentationForSymbol(
                        symbol, 
                        symbolContext
                    );
                    
                    if (docs.length > 0) {
                        // Get examples
                        const examples = await this.context7Service.getExamples(
                            symbol,
                            symbolContext
                        );
                        
                        // Create decoration type based on results
                        const topDoc = docs[0];
                        let type: 'popular' | 'documented' | 'example' | 'unknown' = 'documented';
                        
                        // Popular and well-documented libraries
                        if (topDoc.library.stars > 10000) {
                            type = 'popular';
                        }
                        
                        // Has examples
                        if (examples.length > 0 && examples[0].examples.length > 0) {
                            type = 'example';
                        }
                        
                        // Create tooltip
                        const tooltip = `${symbol} - ${topDoc.library.name} (${topDoc.library.stars.toLocaleString()} stars)
                            \n${topDoc.documentation.description}`;
                        
                        decorationResults.push({
                            symbolName: symbol,
                            popularity: topDoc.library.stars,
                            tooltip,
                            type
                        });
                    }
                } catch (error) {
                    this.logger.debug(`Error getting decoration data for ${symbol}: ${error}`);
                    continue;
                }
            }
            
            // Store decorations
            this.decorations.set(document.uri.toString(), decorationResults);
            
            // Apply decorations
            this.applyDecorations(editor);
        } catch (error) {
            this.logger.error(`Error updating decorations: ${error}`);
        }
    }
    
    /**
     * Apply stored decorations to an editor
     */
    protected applyDecorations(editor: TextEditor): void {
        const document = editor.document;
        const documentUri = document.uri.toString();
        
        // Skip if no decorations
        if (!this.decorations.has(documentUri)) {
            return;
        }
        
        const decorations = this.decorations.get(documentUri)!;
        const documentText = document.getText();
        
        // Create decoration options for each decoration type
        const popularDecorations: DecorationOptions[] = [];
        const documentedDecorations: DecorationOptions[] = [];
        const exampleDecorations: DecorationOptions[] = [];
        
        // Find all occurrences of each symbol
        for (const decoration of decorations) {
            // Use regex to find occurrences that are complete words
            const regex = new RegExp(`\\b${this.escapeRegExp(decoration.symbolName)}\\b`, 'g');
            let match;
            
            while ((match = regex.exec(documentText)) !== null) {
                const startPosition = document.positionAt(match.index);
                const endPosition = document.positionAt(match.index + match[0].length);
                
                const decorationOption: DecorationOptions = {
                    range: {
                        startLineNumber: startPosition.line + 1,
                        startColumn: startPosition.character + 1,
                        endLineNumber: endPosition.line + 1,
                        endColumn: endPosition.character + 1
                    },
                    hoverMessage: {
                        value: decoration.tooltip
                    }
                };
                
                // Add to appropriate decoration array
                switch (decoration.type) {
                    case 'popular':
                        popularDecorations.push(decorationOption);
                        break;
                    case 'documented':
                        documentedDecorations.push(decorationOption);
                        break;
                    case 'example':
                        exampleDecorations.push(decorationOption);
                        break;
                }
            }
        }
        
        // Apply decorations to editor
        const monacoEditor = editor.getControl() as monaco.editor.IStandaloneCodeEditor;
        
        // Apply each decoration type
        monacoEditor.createDecorationsCollection({
            id: Context7DecorationProvider.DECORATION_TYPES.POPULAR,
            decorations: popularDecorations
        });
        
        monacoEditor.createDecorationsCollection({
            id: Context7DecorationProvider.DECORATION_TYPES.DOCUMENTED,
            decorations: documentedDecorations
        });
        
        monacoEditor.createDecorationsCollection({
            id: Context7DecorationProvider.DECORATION_TYPES.EXAMPLE,
            decorations: exampleDecorations
        });
    }
    
    /**
     * Extract symbols from document text
     */
    protected extractSymbols(text: string, language: string): string[] {
        // Set to avoid duplicates
        const symbolSet = new Set<string>();
        
        // Extract symbols based on language
        if (language === 'javascript' || language === 'javascriptreact' ||
            language === 'typescript' || language === 'typescriptreact') {
            // Function calls
            const functionCallRegex = /\b([a-zA-Z_$][\w$]*)\s*\(/g;
            let match;
            
            while ((match = functionCallRegex.exec(text)) !== null) {
                const functionName = match[1];
                
                // Skip common functions and short names
                if (!this.isCommonSymbol(functionName) && functionName.length >= 3) {
                    symbolSet.add(functionName);
                }
            }
            
            // Property access
            const propertyAccessRegex = /\.([a-zA-Z_$][\w$]*)\b/g;
            while ((match = propertyAccessRegex.exec(text)) !== null) {
                const propertyName = match[1];
                
                if (!this.isCommonSymbol(propertyName) && propertyName.length >= 3) {
                    symbolSet.add(propertyName);
                }
            }
        } else if (language === 'python') {
            // Function calls
            const functionCallRegex = /\b([a-zA-Z_][\w]*)\s*\(/g;
            let match;
            
            while ((match = functionCallRegex.exec(text)) !== null) {
                const functionName = match[1];
                
                if (!this.isCommonSymbol(functionName) && functionName.length >= 3) {
                    symbolSet.add(functionName);
                }
            }
            
            // Property access
            const propertyAccessRegex = /\.([a-zA-Z_][\w]*)\b/g;
            while ((match = propertyAccessRegex.exec(text)) !== null) {
                const propertyName = match[1];
                
                if (!this.isCommonSymbol(propertyName) && propertyName.length >= 3) {
                    symbolSet.add(propertyName);
                }
            }
        }
        
        // Convert set to array and return
        return Array.from(symbolSet);
    }
    
    /**
     * Extract imports from document text
     */
    protected extractImports(text: string, language: string): string[] {
        const imports: string[] = [];
        
        if (language === 'javascript' || language === 'javascriptreact' ||
            language === 'typescript' || language === 'typescriptreact') {
            // Match ES6 imports
            const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
            let match;
            
            while ((match = importRegex.exec(text)) !== null) {
                imports.push(match[0]);
            }
            
            // Match CommonJS requires
            const requireRegex = /(?:const|let|var)\s+(?:{[^}]*}|\w+)\s+=\s+require\s*\(['"]([^'"]+)['"]\)/g;
            
            while ((match = requireRegex.exec(text)) !== null) {
                imports.push(match[0]);
            }
        } else if (language === 'python') {
            // Match Python imports
            const importRegex = /(?:import\s+\w+(?:\s*,\s*\w+)*|from\s+[^\s]+\s+import\s+[^#\r\n]+)/g;
            let match;
            
            while ((match = importRegex.exec(text)) !== null) {
                imports.push(match[0]);
            }
        } else if (language === 'java') {
            // Match Java imports
            const importRegex = /import\s+(?:static\s+)?[^;]+;/g;
            let match;
            
            while ((match = importRegex.exec(text)) !== null) {
                imports.push(match[0]);
            }
        }
        
        return imports;
    }
    
    /**
     * Check if a symbol is common (not interesting for decoration)
     */
    protected isCommonSymbol(symbol: string): boolean {
        const commonSymbols = [
            // JavaScript/TypeScript
            'log', 'error', 'warn', 'info', 'debug',
            'forEach', 'map', 'filter', 'reduce', 'find',
            'push', 'pop', 'shift', 'unshift', 'splice',
            'join', 'split', 'slice', 'substring', 'substr',
            'toString', 'valueOf', 'hasOwnProperty',
            'parseInt', 'parseFloat',
            'addEventListener', 'removeEventListener',
            
            // Python
            'len', 'str', 'int', 'float', 'list', 'dict', 'tuple',
            'print', 'input', 'open', 'close', 'read', 'write',
            'append', 'extend', 'insert', 'remove', 'sort'
        ];
        
        return commonSymbols.includes(symbol);
    }
    
    /**
     * Escape special characters for use in regex
     */
    protected escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}