import { injectable, inject } from 'inversify';
import { Position, Range } from '@theia/core/shared/vscode-languageserver-protocol';
import { Languages, Hover, ILanguageService } from '@theia/languages/lib/browser';
import { Context7Service } from '../common/context7-protocol';
import { ILogger } from '@theia/core';
import { DocumentationResult, SymbolContext } from '../node/context7-knowledge-service';

/**
 * Provides hover information from Context7 knowledge base
 */
@injectable()
export class Context7HoverProvider {
    @inject(Languages)
    protected readonly languages: Languages;
    
    @inject(ILanguageService)
    protected readonly languageService: ILanguageService;
    
    @inject(Context7Service)
    protected readonly context7Service: Context7Service;
    
    @inject(ILogger)
    protected readonly logger: ILogger;
    
    /**
     * Register the hover provider for all supported languages
     */
    registerHoverProvider(): void {
        const supportedLanguages = [
            'javascript', 'javascriptreact',
            'typescript', 'typescriptreact',
            'python', 'java', 'ruby', 'go',
            'php', 'c', 'cpp', 'csharp',
            'rust', 'swift'
        ];
        
        for (const language of supportedLanguages) {
            this.languages.registerHoverProvider({
                documentSelector: [{ language }],
                provideHover: async (document, position) => {
                    return this.provideHover(document, position, language);
                }
            });
        }
        
        this.logger.info('Context7 hover provider registered for all supported languages');
    }
    
    /**
     * Provide hover information for the symbol at the given position
     */
    protected async provideHover(document: any, position: Position, language: string): Promise<Hover | undefined> {
        try {
            // Get the word at position
            const wordRange = this.getWordRangeAtPosition(document, position);
            if (!wordRange) {
                return undefined;
            }
            
            const word = document.getText(wordRange);
            if (!word || word.length < 2) {
                return undefined;
            }
            
            // Get document text and imports
            const documentText = document.getText();
            const imports = this.extractImports(documentText, language);
            
            // Create symbol context
            const context: SymbolContext = {
                symbolName: word,
                language,
                imports,
                sourceFile: document.uri,
                lineNumber: position.line,
                charPosition: position.character,
                surroundingSymbols: this.getSurroundingSymbols(documentText, wordRange)
            };
            
            // Find documentation
            const documentationResults = await this.context7Service.findDocumentationForSymbol(word, context);
            
            if (!documentationResults || documentationResults.length === 0) {
                return undefined;
            }
            
            // Create hover content
            const content = this.createHoverContent(documentationResults);
            
            return {
                contents: {
                    kind: 'markdown',
                    value: content
                },
                range: wordRange
            };
        } catch (error) {
            this.logger.error(`Error providing hover for symbol: ${error}`);
            return undefined;
        }
    }
    
    /**
     * Get the word range at the given position
     */
    protected getWordRangeAtPosition(document: any, position: Position): Range | undefined {
        const line = document.getText({
            start: { line: position.line, character: 0 },
            end: { line: position.line, character: Number.MAX_SAFE_INTEGER }
        });
        
        // Find word boundaries
        const wordPattern = /[a-zA-Z0-9_$]+/g;
        let match;
        
        while ((match = wordPattern.exec(line)) !== null) {
            const start = match.index;
            const end = start + match[0].length;
            
            if (position.character >= start && position.character <= end) {
                return {
                    start: { line: position.line, character: start },
                    end: { line: position.line, character: end }
                };
            }
        }
        
        return undefined;
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
     * Get symbols in the surrounding context
     */
    protected getSurroundingSymbols(text: string, wordRange: Range): string[] {
        const surroundingSymbols: string[] = [];
        const lineStart = Math.max(0, wordRange.start.line - 5);
        const lineEnd = Math.min(text.split('\n').length, wordRange.end.line + 5);
        
        // Extract the context lines
        const lines = text.split('\n').slice(lineStart, lineEnd + 1);
        const contextText = lines.join('\n');
        
        // Find all symbols
        const symbolPattern = /\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g;
        let match;
        
        while ((match = symbolPattern.exec(contextText)) !== null) {
            const symbol = match[0];
            
            // Filter out common keywords
            if (!this.isCommonKeyword(symbol) && !surroundingSymbols.includes(symbol)) {
                surroundingSymbols.push(symbol);
            }
        }
        
        return surroundingSymbols;
    }
    
    /**
     * Check if the symbol is a common keyword
     */
    protected isCommonKeyword(symbol: string): boolean {
        const commonKeywords = [
            'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break',
            'continue', 'return', 'function', 'class', 'var', 'let', 'const',
            'import', 'export', 'from', 'require', 'module', 'this', 'super',
            'new', 'try', 'catch', 'finally', 'throw', 'true', 'false', 'null',
            'undefined', 'typeof', 'instanceof', 'in', 'of', 'as', 'async',
            'await', 'static', 'public', 'private', 'protected', 'extends',
            'implements', 'interface', 'package', 'default', 'yield', 'void',
            'delete', 'get', 'set', 'with'
        ];
        
        return commonKeywords.includes(symbol);
    }
    
    /**
     * Create hover content from documentation results
     */
    protected createHoverContent(results: DocumentationResult[]): string {
        // Take the top result
        const topResult = results[0];
        
        let content = '';
        
        // Add documentation
        content += `### ${topResult.documentation.name}\n\n`;
        
        if (topResult.documentation.signature) {
            content += `\`\`\`\n${topResult.documentation.signature}\n\`\`\`\n\n`;
        }
        
        content += `${topResult.documentation.description}\n\n`;
        
        // Add parameters if available
        if (topResult.documentation.parameters && topResult.documentation.parameters.length > 0) {
            content += '**Parameters:**\n\n';
            
            for (const param of topResult.documentation.parameters) {
                const optional = param.isOptional ? ' (optional)' : '';
                content += `- \`${param.name}: ${param.type}\`${optional} - ${param.description}\n`;
            }
            
            content += '\n';
        }
        
        // Add return type if available
        if (topResult.documentation.returnType) {
            content += `**Returns:** \`${topResult.documentation.returnType}\``;
            
            if (topResult.documentation.returnDescription) {
                content += ` - ${topResult.documentation.returnDescription}`;
            }
            
            content += '\n\n';
        }
        
        // Add library info
        content += `*From [${topResult.library.name}](${topResult.library.homepage || ''}) ${topResult.library.version}*\n`;
        
        // Add example if available
        if (topResult.documentation.examples && topResult.documentation.examples.length > 0) {
            content += '\n**Example:**\n\n';
            content += `\`\`\`\n${topResult.documentation.examples[0]}\n\`\`\`\n`;
        }
        
        // Add additional results if available
        if (results.length > 1) {
            content += '\n---\n\n';
            content += `*Also available in: `;
            
            const otherLibraries = results
                .slice(1, Math.min(results.length, 4))
                .map(result => result.library.name);
            
            content += otherLibraries.join(', ');
            
            if (results.length > 4) {
                content += ` and ${results.length - 4} more`;
            }
            
            content += '*';
        }
        
        return content;
    }
}