import { injectable, inject } from 'inversify';
import { ILogger } from '@theia/core';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

// Language support
export type SupportedLanguage = 
    'typescript' | 'javascript' | 'python' | 'java' | 'csharp' | 'cpp' | 
    'php' | 'ruby' | 'go' | 'rust' | 'swift' | 'kotlin' | 'scala' | 
    'html' | 'css' | 'sql' | 'bash' | 'powershell' | 'markdown' | 'plaintext';

// Template variable context
export interface TemplateContext {
    // Core variables
    language: SupportedLanguage;
    codeContext?: string;
    filePath?: string;
    projectContext?: string;
    userRequest?: string;
    
    // Custom variables
    [key: string]: any;
}

// Template options
export interface TemplateOptions {
    modelPreferences?: {
        maxTokens?: number;
        temperature?: number;
        topP?: number;
    };
    useSystemPrompt?: boolean;
    experimentId?: string; // For A/B testing
    variant?: string; // For A/B testing
}

// Result of template rendering
export interface RenderedTemplate {
    prompt: string;
    systemPrompt?: string;
    options?: {
        maxTokens?: number;
        temperature?: number;
        topP?: number;
    };
    metadata: {
        templateName: string;
        experimentId?: string;
        variant?: string;
        renderTime: number;
    };
}

// Template validation error
export class TemplateError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TemplateError';
    }
}

/**
 * Conditional section helper
 */
export interface ConditionalSection {
    condition: boolean;
    content: string;
    elseContent?: string;
}

/**
 * Template helper functions
 */
export interface TemplateHelpers {
    // String manipulation helpers
    trim: (text: string) => string;
    upperCase: (text: string) => string;
    lowerCase: (text: string) => string;
    capitalize: (text: string) => string;
    
    // Code formatting helpers
    formatIndentation: (code: string, indentSize?: number) => string;
    stripComments: (code: string, language: SupportedLanguage) => string;
    
    // Conditional helpers
    ifThen: (condition: ConditionalSection) => string;
    switch: (value: any, cases: Record<string, string>, defaultCase?: string) => string;
    
    // Language-specific helpers
    getLanguageCommentStyle: (language: SupportedLanguage) => { 
        line: string, 
        blockStart?: string, 
        blockEnd?: string 
    };
    getPrimaryFileExtension: (language: SupportedLanguage) => string;
    
    // A/B testing helper
    selectVariant: (variants: Record<string, string>, experimentId: string, defaultVariant?: string) => string;
}

/**
 * Template Engine for prompt templates
 * 
 * Responsible for loading, rendering, and managing optimized prompt templates
 * for different use cases and coding tasks.
 */
@injectable()
export class TemplateEngine {
    // Cache of loaded templates
    private templateCache = new Map<string, string>();
    
    // Standard helpers accessible to all templates
    private helpers: TemplateHelpers = {
        // String manipulation helpers
        trim: (text: string) => text.trim(),
        upperCase: (text: string) => text.toUpperCase(),
        lowerCase: (text: string) => text.toLowerCase(),
        capitalize: (text: string) => text.charAt(0).toUpperCase() + text.slice(1),
        
        // Code formatting helpers
        formatIndentation: (code: string, indentSize = 2) => {
            // Simple indentation normalization
            const lines = code.split('\n');
            const minIndent = lines
                .filter(line => line.trim().length > 0)
                .reduce((min, line) => {
                    const indent = line.search(/\S/);
                    return indent >= 0 && indent < min ? indent : min;
                }, Infinity);
            
            if (minIndent === Infinity) return code;
            
            return lines
                .map(line => {
                    if (line.trim().length === 0) return line;
                    return ' '.repeat(indentSize) + line.substring(minIndent);
                })
                .join('\n');
        },
        stripComments: (code: string, language: SupportedLanguage) => {
            // This is a simplified version - a real implementation would need language-specific parsing
            const commentStyle = this.helpers.getLanguageCommentStyle(language);
            
            let result = code;
            
            // Strip line comments
            if (commentStyle.line) {
                const lineRegex = new RegExp(`${this.escapeRegExp(commentStyle.line)}.*$`, 'gm');
                result = result.replace(lineRegex, '');
            }
            
            // Strip block comments if supported
            if (commentStyle.blockStart && commentStyle.blockEnd) {
                const blockRegex = new RegExp(
                    `${this.escapeRegExp(commentStyle.blockStart)}[\\s\\S]*?${this.escapeRegExp(commentStyle.blockEnd)}`,
                    'g'
                );
                result = result.replace(blockRegex, '');
            }
            
            return result;
        },
        
        // Conditional helpers
        ifThen: (condition: ConditionalSection) => {
            return condition.condition ? condition.content : (condition.elseContent || '');
        },
        switch: (value: any, cases: Record<string, string>, defaultCase = '') => {
            return cases[value] !== undefined ? cases[value] : defaultCase;
        },
        
        // Language-specific helpers
        getLanguageCommentStyle: (language: SupportedLanguage) => {
            const styles: Record<SupportedLanguage, { 
                line: string, 
                blockStart?: string, 
                blockEnd?: string 
            }> = {
                typescript: { line: '//', blockStart: '/*', blockEnd: '*/' },
                javascript: { line: '//', blockStart: '/*', blockEnd: '*/' },
                python: { line: '#', blockStart: '"""', blockEnd: '"""' },
                java: { line: '//', blockStart: '/*', blockEnd: '*/' },
                csharp: { line: '//', blockStart: '/*', blockEnd: '*/' },
                cpp: { line: '//', blockStart: '/*', blockEnd: '*/' },
                php: { line: '//', blockStart: '/*', blockEnd: '*/' },
                ruby: { line: '#', blockStart: '=begin', blockEnd: '=end' },
                go: { line: '//', blockStart: '/*', blockEnd: '*/' },
                rust: { line: '//', blockStart: '/*', blockEnd: '*/' },
                swift: { line: '//', blockStart: '/*', blockEnd: '*/' },
                kotlin: { line: '//', blockStart: '/*', blockEnd: '*/' },
                scala: { line: '//', blockStart: '/*', blockEnd: '*/' },
                html: { line: '<!--', blockStart: '<!--', blockEnd: '-->' },
                css: { line: '//', blockStart: '/*', blockEnd: '*/' },
                sql: { line: '--', blockStart: '/*', blockEnd: '*/' },
                bash: { line: '#' },
                powershell: { line: '#', blockStart: '<#', blockEnd: '#>' },
                markdown: { line: '' }, // Markdown doesn't have standard comments
                plaintext: { line: '' }, // Plain text doesn't have comments
            };
            
            return styles[language] || { line: '//' };
        },
        getPrimaryFileExtension: (language: SupportedLanguage) => {
            const extensions: Record<SupportedLanguage, string> = {
                typescript: '.ts',
                javascript: '.js',
                python: '.py',
                java: '.java',
                csharp: '.cs',
                cpp: '.cpp',
                php: '.php',
                ruby: '.rb',
                go: '.go',
                rust: '.rs',
                swift: '.swift',
                kotlin: '.kt',
                scala: '.scala',
                html: '.html',
                css: '.css',
                sql: '.sql',
                bash: '.sh',
                powershell: '.ps1',
                markdown: '.md',
                plaintext: '.txt',
            };
            
            return extensions[language] || '';
        },
        
        // A/B testing helper
        selectVariant: (variants: Record<string, string>, experimentId: string, defaultVariant = 'A') => {
            // Simple deterministic variant selection based on experiment ID
            // In a real implementation, this might use a more sophisticated algorithm or external service
            if (!experimentId) return variants[defaultVariant] || Object.values(variants)[0] || '';
            
            // Hash the experiment ID to create deterministic but seemingly random selection
            let hash = 0;
            for (let i = 0; i < experimentId.length; i++) {
                hash = ((hash << 5) - hash) + experimentId.charCodeAt(i);
                hash |= 0; // Convert to 32bit integer
            }
            
            const variantKeys = Object.keys(variants);
            const index = Math.abs(hash) % variantKeys.length;
            return variants[variantKeys[index]] || variants[defaultVariant] || '';
        }
    };
    
    constructor(
        @inject(ILogger) protected readonly logger: ILogger
    ) {}
    
    /**
     * Render a template with the given context and options
     * 
     * @param templateName Name of the template to render
     * @param context Context for variable interpolation
     * @param options Template rendering options
     * @returns Rendered template result
     */
    async render(
        templateName: string, 
        context: TemplateContext, 
        options: TemplateOptions = {}
    ): Promise<RenderedTemplate> {
        const startTime = Date.now();
        
        try {
            // Load template content
            const template = await this.loadTemplate(templateName);
            
            // Render system prompt if enabled
            let systemPrompt: string | undefined;
            if (options.useSystemPrompt) {
                try {
                    const systemTemplate = await this.loadTemplate(`${templateName}.system`);
                    systemPrompt = this.interpolate(systemTemplate, context);
                } catch (err) {
                    // System prompt template is optional, so we can ignore errors
                    this.logger.debug(`No system prompt template found for ${templateName}`);
                }
            }
            
            // Render the main prompt template
            const prompt = this.interpolate(template, context);
            
            return {
                prompt,
                systemPrompt,
                options: options.modelPreferences,
                metadata: {
                    templateName,
                    experimentId: options.experimentId,
                    variant: options.variant,
                    renderTime: Date.now() - startTime
                }
            };
        } catch (error) {
            this.logger.error(`Template rendering error for ${templateName}:`, error);
            throw new TemplateError(`Failed to render template ${templateName}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Load a template by name
     * 
     * @param templateName Name of the template to load
     * @returns Template content as string
     */
    private async loadTemplate(templateName: string): Promise<string> {
        // Check cache first
        if (this.templateCache.has(templateName)) {
            return this.templateCache.get(templateName)!;
        }
        
        // Determine template path
        const templatePath = path.resolve(
            __dirname, 
            `${templateName.replace(/\./g, '/')}.template.ts`
        );
        
        try {
            // Read template file
            const readFile = promisify(fs.readFile);
            const content = await readFile(templatePath, 'utf8');
            
            // Extract template string (between backticks)
            const templateMatch = content.match(/`([\s\S]*?)`\s*;?\s*$/);
            if (!templateMatch) {
                throw new TemplateError(`Invalid template format in ${templatePath}`);
            }
            
            const templateContent = templateMatch[1];
            
            // Cache and return
            this.templateCache.set(templateName, templateContent);
            return templateContent;
        } catch (err) {
            if (err instanceof TemplateError) {
                throw err;
            }
            
            throw new TemplateError(`Failed to load template ${templateName}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    
    /**
     * Interpolate variables and execute helper functions in a template
     * 
     * @param template Template string
     * @param context Context object with variables
     * @returns Interpolated template
     */
    private interpolate(template: string, context: TemplateContext): string {
        // Create execution context with helpers and context variables
        const execContext = {
            ...this.helpers,
            ...context
        };
        
        // Simple variable interpolation - ${varName}
        let result = template.replace(/\${([\w\.]+)}/g, (match, varName) => {
            // Support for nested properties (e.g. ${user.name})
            const value = varName.split('.').reduce((obj: any, prop: string) => {
                return obj && obj[prop] !== undefined ? obj[prop] : undefined;
            }, execContext);
            
            return value !== undefined ? String(value) : match;
        });
        
        // Function call interpolation - ${functionName(args)}
        // This is a simplified version and would need more sophisticated parsing in production
        result = result.replace(/\${([\w]+)\((.*?)\)}/g, (match, funcName, argsStr) => {
            try {
                if (typeof execContext[funcName] !== 'function') {
                    return match;
                }
                
                // IMPORTANT: This is a simplified approach for demonstration
                // A proper implementation would need a more secure evaluation strategy
                // For example, parsing the arguments properly or using a template engine library
                
                // Convert string arguments to actual JS values
                const args = argsStr.split(',').map(arg => {
                    arg = arg.trim();
                    
                    // String literal
                    if ((arg.startsWith('"') && arg.endsWith('"')) || 
                        (arg.startsWith("'") && arg.endsWith("'"))) {
                        return arg.slice(1, -1);
                    }
                    
                    // Boolean
                    if (arg === 'true') return true;
                    if (arg === 'false') return false;
                    
                    // Null
                    if (arg === 'null') return null;
                    
                    // Number
                    if (!isNaN(Number(arg))) return Number(arg);
                    
                    // Variable reference
                    return execContext[arg];
                });
                
                return String(execContext[funcName](...args));
            } catch (err) {
                this.logger.warn(`Error executing template function ${funcName}:`, err);
                return match;
            }
        });
        
        return result;
    }
    
    /**
     * Escape regular expression special characters
     * 
     * @param string String to escape
     * @returns Escaped string safe for RegExp
     */
    private escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    /**
     * Clear the template cache
     */
    clearCache(): void {
        this.templateCache.clear();
    }
    
    /**
     * Register a custom helper function
     * 
     * @param name Helper function name
     * @param helperFn Helper function implementation
     */
    registerHelper(name: string, helperFn: (...args: any[]) => string): void {
        if (this.helpers[name]) {
            this.logger.warn(`Overriding existing helper function: ${name}`);
        }
        
        this.helpers[name] = helperFn;
    }
}