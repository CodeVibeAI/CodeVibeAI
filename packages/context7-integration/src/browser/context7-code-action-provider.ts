import { injectable, inject } from 'inversify';
import { Range, CodeAction, CodeActionKind } from '@theia/core/shared/vscode-languageserver-protocol';
import { Languages, CodeActionProvider } from '@theia/languages/lib/browser';
import { ILogger } from '@theia/core';
import { Context7Service } from '../common/context7-protocol';
import { CodeContext } from '../node/context7-knowledge-service';

/**
 * Provides code actions based on Context7 knowledge
 */
@injectable()
export class Context7CodeActionProvider implements CodeActionProvider {
    @inject(Languages)
    protected readonly languages: Languages;
    
    @inject(Context7Service)
    protected readonly context7Service: Context7Service;
    
    @inject(ILogger)
    protected readonly logger: ILogger;
    
    /**
     * Register the code action provider for all supported languages
     */
    registerCodeActionProvider(): void {
        const supportedLanguages = [
            'javascript', 'javascriptreact',
            'typescript', 'typescriptreact',
            'python', 'java', 'ruby', 'go',
            'php', 'c', 'cpp', 'csharp',
            'rust', 'swift'
        ];
        
        for (const language of supportedLanguages) {
            this.languages.registerCodeActionProvider({
                documentSelector: [{ language }],
                codeActionKinds: [
                    CodeActionKind.QuickFix, 
                    CodeActionKind.Refactor
                ],
                provideCodeActions: async (document, range, context) => {
                    return this.provideCodeActions(document, range, context, language);
                }
            });
        }
        
        this.logger.info('Context7 code action provider registered for all supported languages');
    }
    
    /**
     * Provide code actions for the given range
     */
    async provideCodeActions(document: any, range: Range, context: any, language: string): Promise<CodeAction[]> {
        try {
            const documentText = document.getText();
            const codeAtRange = document.getText(range);
            
            // Skip if range is empty or too large
            if (!codeAtRange || codeAtRange.length > 500) {
                return [];
            }
            
            const imports = this.extractImports(documentText, language);
            
            // Create code context
            const codeContext: CodeContext = {
                language,
                imports,
                codeSnippet: codeAtRange,
                surroundingCode: this.getSurroundingCode(document, range)
            };
            
            // Get library suggestions
            const suggestions = await this.context7Service.suggestLibraries(codeContext);
            
            // Create actions
            const actions: CodeAction[] = [];
            
            // Library import suggestions
            for (const suggestion of suggestions) {
                if (suggestion.importExample && suggestion.score > 0.6) {
                    actions.push({
                        title: `Import ${suggestion.library.name}`,
                        kind: CodeActionKind.QuickFix,
                        edit: {
                            changes: {
                                [document.uri.toString()]: [{
                                    range: {
                                        start: { line: 0, character: 0 },
                                        end: { line: 0, character: 0 }
                                    },
                                    newText: suggestion.importExample + '\n'
                                }]
                            }
                        },
                        isPreferred: suggestion.score > 0.8
                    });
                }
            }
            
            // Find code examples if selection looks like a function call
            if (this.looksLikeFunctionCall(codeAtRange)) {
                const functionName = this.extractFunctionName(codeAtRange);
                
                if (functionName) {
                    const examples = await this.context7Service.getExamples(functionName, {
                        symbolName: functionName,
                        language,
                        imports
                    });
                    
                    if (examples.length > 0) {
                        // Get the top example
                        const topExample = examples[0].examples[0];
                        
                        actions.push({
                            title: `Show example: ${functionName} (${examples[0].library.name})`,
                            kind: CodeActionKind.RefactorPreview,
                            edit: {
                                changes: {
                                    [document.uri.toString()]: [{
                                        range: range,
                                        newText: topExample.code
                                    }]
                                }
                            }
                        });
                    }
                }
            }
            
            return actions;
        } catch (error) {
            this.logger.error(`Error providing code actions: ${error}`);
            return [];
        }
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
     * Get code surrounding the selection range
     */
    protected getSurroundingCode(document: any, range: Range): string {
        const startLine = Math.max(0, range.start.line - 10);
        const endLine = Math.min(document.lineCount - 1, range.end.line + 10);
        
        return document.getText({
            start: { line: startLine, character: 0 },
            end: { line: endLine, character: Number.MAX_SAFE_INTEGER }
        });
    }
    
    /**
     * Check if the text looks like a function call
     */
    protected looksLikeFunctionCall(text: string): boolean {
        return /\w+\s*\([^)]*\)/.test(text);
    }
    
    /**
     * Extract function name from a function call
     */
    protected extractFunctionName(text: string): string | undefined {
        const match = text.match(/(\w+)\s*\(/);
        return match ? match[1] : undefined;
    }
}