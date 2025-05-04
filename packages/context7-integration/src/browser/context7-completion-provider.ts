import { injectable, inject } from 'inversify';
import { Position, CompletionList, CompletionItem, CompletionItemKind, Range } from '@theia/core/shared/vscode-languageserver-protocol';
import { Languages, ILanguageService } from '@theia/languages/lib/browser';
import { ILogger } from '@theia/core';
import { Context7Service } from '../common/context7-protocol';
import { CodeContext } from '../node/context7-knowledge-service';

/**
 * Provides code completions from Context7 knowledge base
 */
@injectable()
export class Context7CompletionProvider {
    @inject(Languages)
    protected readonly languages: Languages;
    
    @inject(ILanguageService)
    protected readonly languageService: ILanguageService;
    
    @inject(Context7Service)
    protected readonly context7Service: Context7Service;
    
    @inject(ILogger)
    protected readonly logger: ILogger;
    
    /**
     * Register the completion provider for all supported languages
     */
    registerCompletionProvider(): void {
        const supportedLanguages = [
            'javascript', 'javascriptreact',
            'typescript', 'typescriptreact',
            'python', 'java', 'ruby', 'go',
            'php', 'c', 'cpp', 'csharp',
            'rust', 'swift'
        ];
        
        for (const language of supportedLanguages) {
            this.languages.registerCompletionProvider({
                documentSelector: [{ language }],
                triggerCharacters: ['.', ' ', '(', '{', '[', '<', ',', ':', '"', "'"],
                provideCompletionItems: async (document, position, context, token) => {
                    return this.provideCompletionItems(document, position, language);
                }
            });
        }
        
        this.logger.info('Context7 completion provider registered for all supported languages');
    }
    
    /**
     * Provide completion items for the given position
     */
    protected async provideCompletionItems(document: any, position: Position, language: string): Promise<CompletionList | undefined> {
        try {
            // Get the current line text up to the cursor
            const lineText = document.getText({
                start: { line: position.line, character: 0 },
                end: position
            });
            
            // Check if we're in an import statement
            if (this.isInImportStatement(lineText, language)) {
                return this.provideImportCompletions(document, position, lineText, language);
            }
            
            // Check if we're after a dot (property access)
            if (this.isPropertyAccess(lineText)) {
                return this.providePropertyCompletions(document, position, lineText, language);
            }
            
            // Check if we're at the beginning of a line or after a space
            if (this.isNewItemContext(lineText)) {
                return this.provideContextualCompletions(document, position, language);
            }
            
            return undefined;
        } catch (error) {
            this.logger.error(`Error providing completion items: ${error}`);
            return undefined;
        }
    }
    
    /**
     * Provide completions for import statements
     */
    protected async provideImportCompletions(document: any, position: Position, lineText: string, language: string): Promise<CompletionList | undefined> {
        // Create code context to get library suggestions
        const documentText = document.getText();
        const imports = this.extractImports(documentText, language);
        
        // Extract query from import line
        let query = '';
        
        if (language === 'javascript' || language === 'typescript' || 
            language === 'javascriptreact' || language === 'typescriptreact') {
            // Handle ES6 imports
            const fromMatch = lineText.match(/from\s+['"]([^'"]*)$/);
            if (fromMatch) {
                query = fromMatch[1];
            } else if (lineText.match(/import\s+['"]([^'"]*)$/)) {
                const importMatch = lineText.match(/import\s+['"]([^'"]*)$/);
                if (importMatch) {
                    query = importMatch[1];
                }
            }
        } else if (language === 'python') {
            // Handle Python imports
            const importMatch = lineText.match(/import\s+(\w*)$/);
            if (importMatch) {
                query = importMatch[1];
            } else {
                const fromMatch = lineText.match(/from\s+(\S*)$/);
                if (fromMatch) {
                    query = fromMatch[1];
                }
            }
        }
        
        if (!query) {
            return undefined;
        }
        
        const context: CodeContext = {
            language,
            imports,
            codeSnippet: documentText
        };
        
        // Get suggestions from Context7
        const suggestions = await this.context7Service.suggestLibraries(context);
        
        // Convert to completion items
        const items: CompletionItem[] = [];
        
        // Add directly matching libraries
        const searchResults = await this.context7Service.searchDocumentation(query, {
            limit: 10,
            language
        });
        
        // Extract unique library names
        const libraryNames = new Set<string>();
        
        searchResults.forEach(result => {
            if (!libraryNames.has(result.library.name) && 
                result.library.name.toLowerCase().includes(query.toLowerCase())) {
                libraryNames.add(result.library.name);
                
                items.push({
                    label: result.library.name,
                    kind: CompletionItemKind.Module,
                    detail: result.library.description,
                    documentation: {
                        kind: 'markdown',
                        value: `${result.library.description}\n\n*${result.library.stars.toLocaleString()} stars*`
                    },
                    sortText: `0${result.library.name}`
                });
            }
        });
        
        // Add suggestions
        suggestions.forEach(suggestion => {
            if (!libraryNames.has(suggestion.library.name)) {
                libraryNames.add(suggestion.library.name);
                
                items.push({
                    label: suggestion.library.name,
                    kind: CompletionItemKind.Module,
                    detail: suggestion.description,
                    documentation: {
                        kind: 'markdown',
                        value: `${suggestion.description}\n\n*${suggestion.library.stars.toLocaleString()} stars*\n\n${suggestion.reason}`
                    },
                    sortText: `1${suggestion.library.name}`
                });
            }
        });
        
        return {
            isIncomplete: false,
            items
        };
    }
    
    /**
     * Provide completions for property access (after dot)
     */
    protected async providePropertyCompletions(document: any, position: Position, lineText: string, language: string): Promise<CompletionList | undefined> {
        // Extract the object before the dot
        const objectMatch = lineText.match(/(\w+)\.\w*$/);
        if (!objectMatch) {
            return undefined;
        }
        
        const objectName = objectMatch[1];
        
        // Get document text and imports
        const documentText = document.getText();
        const imports = this.extractImports(documentText, language);
        
        // Try to find documentation for the object
        const documentationResults = await this.context7Service.findDocumentationForSymbol(
            objectName,
            {
                symbolName: objectName,
                language,
                imports,
                sourceFile: document.uri,
                lineNumber: position.line,
                charPosition: position.character
            }
        );
        
        if (!documentationResults || documentationResults.length === 0) {
            return undefined;
        }
        
        // Get the library documentation for the top result
        const topResult = documentationResults[0];
        const libraryDoc = await this.context7Service.getLibraryDocumentation(
            topResult.library.name
        );
        
        if (!libraryDoc.success || !libraryDoc.documentation) {
            return undefined;
        }
        
        // Find all API members that might be properties of this object
        const items: CompletionItem[] = [];
        
        libraryDoc.documentation.api.forEach(api => {
            // Check if this API is related to the object
            if (api.name.startsWith(`${objectName}.`)) {
                const propertyName = api.name.substring(objectName.length + 1);
                
                // Skip if property name has dots (nested properties)
                if (propertyName.includes('.')) {
                    return;
                }
                
                items.push({
                    label: propertyName,
                    kind: this.getCompletionKindFromApiType(api.type),
                    detail: api.signature || api.description,
                    documentation: {
                        kind: 'markdown',
                        value: `${api.description}\n\n${api.signature ? '```\n' + api.signature + '\n```\n\n' : ''}*From ${topResult.library.name}*`
                    }
                });
            }
        });
        
        return {
            isIncomplete: false,
            items
        };
    }
    
    /**
     * Provide contextual completions based on code
     */
    protected async provideContextualCompletions(document: any, position: Position, language: string): Promise<CompletionList | undefined> {
        // Get document text and imports
        const documentText = document.getText();
        const imports = this.extractImports(documentText, language);
        
        // Get surrounding code context (20 lines)
        const startLine = Math.max(0, position.line - 10);
        const endLine = Math.min(documentText.split('\n').length - 1, position.line + 10);
        
        const surroundingCode = documentText.split('\n')
            .slice(startLine, endLine + 1)
            .join('\n');
        
        // Get the current line
        const lineText = document.getText({
            start: { line: position.line, character: 0 },
            end: { line: position.line, character: Number.MAX_SAFE_INTEGER }
        });
        
        // Create code context
        const context: CodeContext = {
            language,
            imports,
            surroundingCode,
            codeSnippet: surroundingCode
        };
        
        // Get suggestions
        const suggestions = await this.context7Service.suggestLibraries(context);
        
        // Convert to completion items
        const items: CompletionItem[] = [];
        
        suggestions.forEach(suggestion => {
            // Add library import suggestion
            if (suggestion.importExample) {
                items.push({
                    label: `import ${suggestion.library.name}`,
                    kind: CompletionItemKind.Snippet,
                    detail: `Import ${suggestion.library.name} module`,
                    documentation: {
                        kind: 'markdown',
                        value: `${suggestion.description}\n\n${suggestion.reason}\n\n*${suggestion.library.stars.toLocaleString()} stars*`
                    },
                    insertText: suggestion.importExample
                });
            }
        });
        
        // Check if we're in a comment - if so, add doc search suggestions
        if (this.isInComment(lineText, language)) {
            const commentText = this.extractCommentText(lineText, language);
            
            if (commentText && commentText.length > 2) {
                const searchResults = await this.context7Service.searchDocumentation(
                    commentText,
                    { language, limit: 5 }
                );
                
                searchResults.forEach(result => {
                    if ('name' in result.documentation && result.documentation.name) {
                        items.push({
                            label: `${result.documentation.name} (${result.library.name})`,
                            kind: CompletionItemKind.Reference,
                            detail: result.documentation.description?.substring(0, 100),
                            documentation: {
                                kind: 'markdown',
                                value: `${result.documentation.description}\n\n*From ${result.library.name}*\n\n${result.matchContext || ''}`
                            }
                        });
                    }
                });
            }
        }
        
        return items.length > 0 ? {
            isIncomplete: true,
            items
        } : undefined;
    }
    
    /**
     * Check if the cursor is in an import statement
     */
    protected isInImportStatement(lineText: string, language: string): boolean {
        if (language === 'javascript' || language === 'typescript' ||
            language === 'javascriptreact' || language === 'typescriptreact') {
            return /import\s+|from\s+['"]/.test(lineText);
        } else if (language === 'python') {
            return /^\s*(import|from)\s+/.test(lineText);
        } else if (language === 'java') {
            return /^\s*import\s+/.test(lineText);
        } else if (language === 'ruby') {
            return /^\s*require\s+['"]/.test(lineText);
        }
        
        return false;
    }
    
    /**
     * Check if the cursor is after a dot (property access)
     */
    protected isPropertyAccess(lineText: string): boolean {
        return /\w+\.\w*$/.test(lineText);
    }
    
    /**
     * Check if the cursor is in a context where a new item might be started
     */
    protected isNewItemContext(lineText: string): boolean {
        // At beginning of line or after space
        return lineText.trim() === '' || lineText.endsWith(' ');
    }
    
    /**
     * Check if the cursor is in a comment
     */
    protected isInComment(lineText: string, language: string): boolean {
        if (language === 'javascript' || language === 'typescript' ||
            language === 'javascriptreact' || language === 'typescriptreact' ||
            language === 'java' || language === 'c' || language === 'cpp' ||
            language === 'csharp') {
            // Check for // or /* comments
            return /\/\/|\/\*/.test(lineText);
        } else if (language === 'python' || language === 'ruby') {
            // Check for # comments
            return /#/.test(lineText);
        } else if (language === 'php') {
            // Check for // or # or /* comments
            return /\/\/|#|\/\*/.test(lineText);
        }
        
        return false;
    }
    
    /**
     * Extract comment text from the line
     */
    protected extractCommentText(lineText: string, language: string): string | undefined {
        if (language === 'javascript' || language === 'typescript' ||
            language === 'javascriptreact' || language === 'typescriptreact' ||
            language === 'java' || language === 'c' || language === 'cpp' ||
            language === 'csharp') {
            // Extract from // or /* comments
            const singleMatch = lineText.match(/\/\/\s*(.*)/);
            if (singleMatch) {
                return singleMatch[1];
            }
            
            const multiMatch = lineText.match(/\/\*\s*(.*?)(\*\/|$)/);
            if (multiMatch) {
                return multiMatch[1];
            }
        } else if (language === 'python' || language === 'ruby') {
            // Extract from # comments
            const match = lineText.match(/#\s*(.*)/);
            if (match) {
                return match[1];
            }
        } else if (language === 'php') {
            // Extract from // or # or /* comments
            const singleMatch = lineText.match(/(?:\/\/|#)\s*(.*)/);
            if (singleMatch) {
                return singleMatch[1];
            }
            
            const multiMatch = lineText.match(/\/\*\s*(.*?)(\*\/|$)/);
            if (multiMatch) {
                return multiMatch[1];
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
     * Map API type to completion item kind
     */
    protected getCompletionKindFromApiType(apiType: string): CompletionItemKind {
        switch (apiType) {
            case 'function':
                return CompletionItemKind.Function;
            case 'class':
                return CompletionItemKind.Class;
            case 'interface':
                return CompletionItemKind.Interface;
            case 'enum':
                return CompletionItemKind.Enum;
            case 'const':
                return CompletionItemKind.Constant;
            default:
                return CompletionItemKind.Property;
        }
    }
}