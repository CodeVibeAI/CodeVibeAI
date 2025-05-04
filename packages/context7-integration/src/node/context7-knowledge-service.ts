import { injectable, inject } from 'inversify';
import { ILogger } from '@theia/core';
import { Context7Client } from './context7-client';
import {
    LibraryInfo,
    Documentation,
    ApiDocumentation,
    CodeExample,
    SearchOptions
} from '../common/context7-protocol';

/**
 * Types for Context7KnowledgeService
 */
export interface CodeContext {
    language: string;
    imports: string[];
    dependencies?: Record<string, string>;
    surroundingCode?: string;
    codeSnippet?: string;
    filePath?: string;
    projectType?: string;
}

export interface SymbolContext {
    symbolName: string;
    language: string;
    imports: string[];
    sourceFile?: string;
    lineNumber?: number;
    charPosition?: number;
    surroundingSymbols?: string[];
}

export interface DocumentationResult {
    id: string;
    library: LibraryInfo;
    symbolName: string;
    documentation: ApiDocumentation;
    score: number;
    matchDetails?: {
        contextScore: number;
        popularityScore: number;
        versionScore: number;
        languageScore: number;
    };
}

export interface LibrarySuggestion {
    library: LibraryInfo;
    reason: string;
    score: number;
    description: string;
    installCommand?: string;
    importExample?: string;
    usageExample?: string;
}

export interface CodeExampleResult {
    examples: CodeExample[];
    library: LibraryInfo;
    score: number;
}

export interface DocumentationSearchResult {
    library: LibraryInfo;
    documentation: ApiDocumentation | Documentation;
    context: string;
    score: number;
    matchContext?: string;
}

/**
 * Service for retrieving and ranking knowledge from Context7
 */
@injectable()
export class Context7KnowledgeService {
    // Constants for scoring algorithm
    private static readonly CONTEXT_MATCH_WEIGHT = 0.5;
    private static readonly POPULARITY_WEIGHT = 0.3;
    private static readonly VERSION_WEIGHT = 0.1;
    private static readonly LANGUAGE_WEIGHT = 0.1;
    private static readonly MAX_POPULARITY_STARS = 100000;
    private static readonly MAX_RESULTS = 5;
    
    @inject(ILogger)
    protected readonly logger: ILogger;
    
    @inject(Context7Client)
    protected readonly context7Client: Context7Client;
    
    /**
     * Find documentation for a specific symbol with context awareness
     * 
     * @param symbolName Name of the symbol to find documentation for
     * @param context Context information for better matching
     * @returns Array of documentation results ranked by relevance
     */
    async findDocumentationForSymbol(
        symbolName: string, 
        context: SymbolContext
    ): Promise<DocumentationResult[]> {
        this.logger.debug(`Finding documentation for symbol: ${symbolName}`);
        
        try {
            // First, check if symbol is from known libraries in imports
            const docsFromImports = await this.findDocsFromImports(symbolName, context);
            if (docsFromImports.length > 0) {
                return docsFromImports;
            }
            
            // Search in knowledge base
            const searchResults = await this.context7Client.searchLibrariesExtended(symbolName, {
                limit: 10,
                filters: {
                    language: [context.language]
                }
            });
            
            if (!searchResults.success || searchResults.libraries.length === 0) {
                return [];
            }
            
            // Collect and score documentation from libraries
            const documentationResults: DocumentationResult[] = [];
            
            for (const library of searchResults.libraries) {
                try {
                    const docResponse = await this.context7Client.getLibraryDocumentationExtended(library.name);
                    
                    if (!docResponse.success || !docResponse.documentation) {
                        continue;
                    }
                    
                    // Find API documentation for the symbol
                    const apiDocs = docResponse.documentation.api.filter(api => 
                        api.name === symbolName || 
                        api.name.endsWith(`.${symbolName}`) || 
                        api.name.endsWith(`/${symbolName}`)
                    );
                    
                    for (const apiDoc of apiDocs) {
                        const matchDetails = {
                            contextScore: this.calculateContextScore(context, library, apiDoc),
                            popularityScore: this.calculatePopularityScore(library),
                            versionScore: this.calculateVersionScore(library),
                            languageScore: this.calculateLanguageScore(context.language, library.language)
                        };
                        
                        const totalScore = this.calculateTotalScore(matchDetails);
                        
                        documentationResults.push({
                            id: `${library.name}-${apiDoc.name}`,
                            library,
                            symbolName: apiDoc.name,
                            documentation: apiDoc,
                            score: totalScore,
                            matchDetails
                        });
                    }
                } catch (error) {
                    this.logger.error(`Error fetching documentation for ${library.name}: ${error}`);
                    continue;
                }
            }
            
            // Sort by score and return top results
            return documentationResults
                .sort((a, b) => b.score - a.score)
                .slice(0, Context7KnowledgeService.MAX_RESULTS);
        } catch (error) {
            this.logger.error(`Error finding documentation for symbol ${symbolName}: ${error}`);
            return [];
        }
    }
    
    /**
     * Suggest libraries based on code context
     * 
     * @param codeContext Context information about current code
     * @returns Array of library suggestions ranked by relevance
     */
    async suggestLibraries(codeContext: CodeContext): Promise<LibrarySuggestion[]> {
        this.logger.debug(`Suggesting libraries for code context in ${codeContext.language}`);
        
        try {
            // Extract keywords from code context
            const keywords = this.extractKeywords(codeContext);
            
            if (keywords.length === 0) {
                return [];
            }
            
            // Search for each keyword
            const searchPromises = keywords.map(keyword => 
                this.context7Client.searchLibrariesExtended(keyword, {
                    limit: 5,
                    filters: {
                        language: [codeContext.language]
                    }
                })
            );
            
            const searchResults = await Promise.all(searchPromises);
            
            // Collect and score libraries
            const libraryScores = new Map<string, { 
                library: LibraryInfo, 
                score: number,
                keywords: string[] 
            }>();
            
            searchResults.forEach((result, index) => {
                if (!result.success) return;
                
                const keyword = keywords[index];
                
                result.libraries.forEach(library => {
                    // Skip already imported libraries
                    if (codeContext.imports.some(imp => imp.includes(library.name))) {
                        return;
                    }
                    
                    const existingEntry = libraryScores.get(library.name);
                    
                    if (existingEntry) {
                        existingEntry.score += 1;
                        existingEntry.keywords.push(keyword);
                    } else {
                        libraryScores.set(library.name, { 
                            library, 
                            score: 1,
                            keywords: [keyword]
                        });
                    }
                });
            });
            
            // Convert to suggestions with reasons
            const suggestions: LibrarySuggestion[] = [];
            
            for (const [_, entry] of libraryScores) {
                const { library, score, keywords } = entry;
                
                // Apply scoring weights
                const weightedScore = 
                    (score / keywords.length) * 0.5 + 
                    this.calculatePopularityScore(library) * 0.3 +
                    this.calculateLanguageScore(codeContext.language, library.language) * 0.2;
                
                // Generate reason based on keywords
                const keywordPhrase = keywords.slice(0, 3).join(', ');
                const reason = `Suggested for: ${keywordPhrase}${keywords.length > 3 ? '...' : ''}`;
                
                // Generate install command based on language/project type
                const installCommand = this.generateInstallCommand(library, codeContext);
                
                // Generate import example
                const importExample = this.generateImportExample(library, codeContext.language);
                
                suggestions.push({
                    library,
                    reason,
                    score: weightedScore,
                    description: library.description,
                    installCommand,
                    importExample,
                });
            }
            
            // Sort by score and return top results
            return suggestions
                .sort((a, b) => b.score - a.score)
                .slice(0, Context7KnowledgeService.MAX_RESULTS);
        } catch (error) {
            this.logger.error(`Error suggesting libraries: ${error}`);
            return [];
        }
    }
    
    /**
     * Get code examples for a specific API
     * 
     * @param apiName Name of the API to find examples for
     * @param context Optional context information for better matching
     * @returns Array of code examples ranked by relevance
     */
    async getExamples(
        apiName: string, 
        context?: SymbolContext
    ): Promise<CodeExampleResult[]> {
        this.logger.debug(`Getting examples for API: ${apiName}`);
        
        try {
            let libraries: LibraryInfo[] = [];
            
            // If context is provided, try to find the library from imports first
            if (context && context.imports.length > 0) {
                // Extract library names from imports
                const importLibraries = context.imports.map(imp => {
                    // Extract library name from import statement
                    // e.g. "import { useState } from 'react'" -> "react"
                    const match = imp.match(/from\s+['"]([^'"]+)['"]/);
                    return match ? match[1].split('/')[0] : null;
                }).filter(Boolean) as string[];
                
                // Search for each library
                const libraryPromises = importLibraries.map(lib => 
                    this.context7Client.searchLibrariesExtended(lib, {
                        limit: 1,
                        filters: {
                            language: [context.language]
                        }
                    })
                );
                
                const libraryResults = await Promise.all(libraryPromises);
                
                // Collect libraries
                libraries = libraryResults
                    .filter(result => result.success && result.libraries.length > 0)
                    .map(result => result.libraries[0]);
            }
            
            // If no libraries from imports, search for the API name
            if (libraries.length === 0) {
                const searchResult = await this.context7Client.searchLibrariesExtended(apiName, {
                    limit: 5,
                    filters: context ? { language: [context.language] } : undefined
                });
                
                if (searchResult.success) {
                    libraries = searchResult.libraries;
                }
            }
            
            // Get examples for each library
            const exampleResults: CodeExampleResult[] = [];
            
            for (const library of libraries) {
                try {
                    const examplesResponse = await this.context7Client.findCodeExamples(
                        library.name, 
                        apiName
                    );
                    
                    if (!examplesResponse.success || examplesResponse.examples.length === 0) {
                        continue;
                    }
                    
                    // Calculate score based on library properties and context
                    const baseScore = this.calculatePopularityScore(library);
                    
                    // Adjust score based on language match if context provided
                    const languageScore = context ? 
                        this.calculateLanguageScore(context.language, library.language) : 
                        1.0;
                    
                    const totalScore = baseScore * 0.7 + languageScore * 0.3;
                    
                    exampleResults.push({
                        examples: examplesResponse.examples,
                        library,
                        score: totalScore
                    });
                } catch (error) {
                    this.logger.error(`Error fetching examples for ${library.name}.${apiName}: ${error}`);
                    continue;
                }
            }
            
            // Sort by score and return
            return exampleResults
                .sort((a, b) => b.score - a.score)
                .slice(0, Context7KnowledgeService.MAX_RESULTS);
        } catch (error) {
            this.logger.error(`Error getting examples for ${apiName}: ${error}`);
            return [];
        }
    }
    
    /**
     * Search documentation based on a query
     * 
     * @param query Search query
     * @param options Search options
     * @returns Array of documentation search results
     */
    async searchDocumentation(
        query: string, 
        options?: SearchOptions & { language?: string }
    ): Promise<DocumentationSearchResult[]> {
        this.logger.debug(`Searching documentation for: ${query}`);
        
        try {
            // Prepare search options
            const searchOptions: SearchOptions = {
                ...options,
                limit: options?.limit || 10
            };
            
            // If language specified, add to filters
            if (options?.language) {
                searchOptions.filters = {
                    ...searchOptions.filters,
                    language: [options.language]
                };
            }
            
            // Search libraries
            const searchResult = await this.context7Client.searchLibrariesExtended(query, searchOptions);
            
            if (!searchResult.success || searchResult.libraries.length === 0) {
                return [];
            }
            
            // Collect documentation from libraries
            const documentationResults: DocumentationSearchResult[] = [];
            
            for (const library of searchResult.libraries) {
                try {
                    const docResponse = await this.context7Client.getLibraryDocumentationExtended(library.name);
                    
                    if (!docResponse.success || !docResponse.documentation) {
                        continue;
                    }
                    
                    // Score for overall library documentation
                    const overviewScore = this.calculateTextRelevance(
                        query, 
                        docResponse.documentation.overview
                    ) * 0.7 + this.calculatePopularityScore(library) * 0.3;
                    
                    // Add overview if it's relevant
                    if (overviewScore > 0.3) {
                        documentationResults.push({
                            library,
                            documentation: docResponse.documentation,
                            context: 'overview',
                            score: overviewScore,
                            matchContext: this.extractMatchContext(
                                query, 
                                docResponse.documentation.overview
                            )
                        });
                    }
                    
                    // Add relevant API docs
                    for (const apiDoc of docResponse.documentation.api) {
                        const descriptionScore = this.calculateTextRelevance(
                            query, 
                            apiDoc.description + (apiDoc.signature || '')
                        );
                        
                        const totalScore = 
                            descriptionScore * 0.6 + 
                            this.calculatePopularityScore(library) * 0.3 +
                            this.calculateLanguageScore(
                                options?.language || '', 
                                library.language
                            ) * 0.1;
                        
                        if (totalScore > 0.3) {
                            documentationResults.push({
                                library,
                                documentation: apiDoc,
                                context: 'api',
                                score: totalScore,
                                matchContext: this.extractMatchContext(
                                    query, 
                                    apiDoc.description
                                )
                            });
                        }
                    }
                    
                    // Add relevant sections
                    for (const section of docResponse.documentation.sections) {
                        const sectionScore = this.calculateTextRelevance(
                            query, 
                            section.title + ' ' + section.content
                        );
                        
                        const totalScore = 
                            sectionScore * 0.7 + 
                            this.calculatePopularityScore(library) * 0.3;
                        
                        if (totalScore > 0.3) {
                            documentationResults.push({
                                library,
                                documentation: {
                                    name: section.title,
                                    type: 'section' as any,
                                    description: section.content
                                },
                                context: 'section',
                                score: totalScore,
                                matchContext: this.extractMatchContext(
                                    query, 
                                    section.content
                                )
                            });
                        }
                    }
                } catch (error) {
                    this.logger.error(`Error fetching documentation for ${library.name}: ${error}`);
                    continue;
                }
            }
            
            // Sort by score and return top results
            return documentationResults
                .sort((a, b) => b.score - a.score)
                .slice(0, Context7KnowledgeService.MAX_RESULTS * 2);
        } catch (error) {
            this.logger.error(`Error searching documentation for ${query}: ${error}`);
            return [];
        }
    }
    
    // Helper methods for finding documentation
    
    /**
     * Try to find documentation for a symbol from imports
     */
    private async findDocsFromImports(
        symbolName: string, 
        context: SymbolContext
    ): Promise<DocumentationResult[]> {
        if (!context.imports || context.imports.length === 0) {
            return [];
        }
        
        // Extract libraries from imports
        const libraryNames: string[] = [];
        
        for (const importStatement of context.imports) {
            // Match import patterns
            const fromMatch = importStatement.match(/from\s+['"]([^'"]+)['"]/);
            
            if (fromMatch) {
                const importPath = fromMatch[1];
                const mainLibrary = importPath.split('/')[0];
                
                // Check if this is a scoped package (@org/package)
                const scopedMatch = mainLibrary.match(/^@[^/]+\/[^/]+/);
                if (scopedMatch) {
                    libraryNames.push(scopedMatch[0]);
                } else if (mainLibrary && !mainLibrary.startsWith('.')) {
                    libraryNames.push(mainLibrary);
                }
                
                // Check if symbol is explicitly imported
                const importSymbolsMatch = importStatement.match(/import\s+\{([^}]+)\}/);
                if (importSymbolsMatch) {
                    const importedSymbols = importSymbolsMatch[1].split(',').map(s => s.trim());
                    
                    // If symbol is directly imported, prioritize this library
                    if (importedSymbols.some(s => s === symbolName || s.endsWith(` as ${symbolName}`))) {
                        // Move this library to the front
                        if (libraryNames.length > 0 && libraryNames[libraryNames.length - 1] !== mainLibrary) {
                            const index = libraryNames.indexOf(mainLibrary);
                            if (index !== -1) {
                                libraryNames.splice(index, 1);
                            }
                            libraryNames.unshift(mainLibrary);
                        }
                    }
                }
            }
        }
        
        if (libraryNames.length === 0) {
            return [];
        }
        
        // Get documentation for each library
        const documentationResults: DocumentationResult[] = [];
        
        for (const libraryName of libraryNames) {
            try {
                // First get the library info
                const searchResponse = await this.context7Client.searchLibrariesExtended(libraryName, {
                    limit: 1
                });
                
                if (!searchResponse.success || searchResponse.libraries.length === 0) {
                    continue;
                }
                
                const library = searchResponse.libraries[0];
                
                // Then get the documentation
                const docResponse = await this.context7Client.getLibraryDocumentationExtended(library.name);
                
                if (!docResponse.success || !docResponse.documentation) {
                    continue;
                }
                
                // Find API documentation for the symbol
                const apiDocs = docResponse.documentation.api.filter(api => 
                    api.name === symbolName || 
                    api.name.endsWith(`.${symbolName}`) || 
                    api.name.endsWith(`/${symbolName}`)
                );
                
                for (const apiDoc of apiDocs) {
                    const matchDetails = {
                        contextScore: this.calculateContextScore(context, library, apiDoc),
                        popularityScore: this.calculatePopularityScore(library),
                        versionScore: this.calculateVersionScore(library),
                        languageScore: this.calculateLanguageScore(context.language, library.language)
                    };
                    
                    const totalScore = this.calculateTotalScore(matchDetails);
                    
                    documentationResults.push({
                        id: `${library.name}-${apiDoc.name}`,
                        library,
                        symbolName: apiDoc.name,
                        documentation: apiDoc,
                        score: totalScore,
                        matchDetails
                    });
                }
            } catch (error) {
                this.logger.error(`Error fetching documentation for ${libraryName}: ${error}`);
                continue;
            }
        }
        
        return documentationResults
            .sort((a, b) => b.score - a.score)
            .slice(0, Context7KnowledgeService.MAX_RESULTS);
    }
    
    // Scoring algorithm methods
    
    /**
     * Calculate the context match score
     */
    private calculateContextScore(
        context: SymbolContext, 
        library: LibraryInfo, 
        apiDoc: ApiDocumentation
    ): number {
        let score = 0.5; // Base score
        
        // Check if library name is in imports
        if (context.imports && context.imports.some(imp => imp.includes(library.name))) {
            score += 0.3;
        }
        
        // Check if surrounding symbols match parameters or related functions
        if (context.surroundingSymbols && apiDoc.parameters) {
            const paramNames = apiDoc.parameters.map(p => p.name);
            
            for (const symbol of context.surroundingSymbols) {
                if (paramNames.includes(symbol)) {
                    score += 0.05;
                }
            }
        }
        
        return Math.min(score, 1.0);
    }
    
    /**
     * Calculate score based on library popularity
     */
    private calculatePopularityScore(library: LibraryInfo): number {
        // Normalize stars to a 0-1 scale
        return Math.min(
            library.stars / Context7KnowledgeService.MAX_POPULARITY_STARS, 
            1.0
        );
    }
    
    /**
     * Calculate score based on library version
     */
    private calculateVersionScore(library: LibraryInfo): number {
        // Newer versions are generally better
        // This is a simple heuristic based on last updated date
        if (!library.lastUpdated) {
            return 0.5;
        }
        
        const lastUpdated = new Date(library.lastUpdated);
        const now = new Date();
        const monthsAgo = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24 * 30);
        
        // Score decreases as time since last update increases
        // 1.0 for current month, 0.5 for one year ago, 0.0 for two years or older
        return Math.max(0, Math.min(1, 1 - (monthsAgo / 24)));
    }
    
    /**
     * Calculate language match score
     */
    private calculateLanguageScore(
        contextLanguage: string, 
        libraryLanguage: string
    ): number {
        if (!contextLanguage || !libraryLanguage) {
            return 0.5;
        }
        
        // Normalize languages
        const normalizedContextLang = this.normalizeLanguage(contextLanguage);
        const normalizedLibraryLang = this.normalizeLanguage(libraryLanguage);
        
        // Exact match
        if (normalizedContextLang === normalizedLibraryLang) {
            return 1.0;
        }
        
        // Compatible languages
        const compatibilityScore = this.getLanguageCompatibilityScore(
            normalizedContextLang, 
            normalizedLibraryLang
        );
        
        return compatibilityScore;
    }
    
    /**
     * Calculate total score from component scores
     */
    private calculateTotalScore(scores: {
        contextScore: number;
        popularityScore: number;
        versionScore: number;
        languageScore: number;
    }): number {
        return (
            scores.contextScore * Context7KnowledgeService.CONTEXT_MATCH_WEIGHT +
            scores.popularityScore * Context7KnowledgeService.POPULARITY_WEIGHT +
            scores.versionScore * Context7KnowledgeService.VERSION_WEIGHT +
            scores.languageScore * Context7KnowledgeService.LANGUAGE_WEIGHT
        );
    }
    
    /**
     * Calculate text relevance for a query
     */
    private calculateTextRelevance(query: string, text: string): number {
        if (!query || !text) {
            return 0;
        }
        
        // Convert to lowercase for matching
        const lowerQuery = query.toLowerCase();
        const lowerText = text.toLowerCase();
        
        // Split query into words
        const queryWords = lowerQuery.split(/\s+/).filter(word => word.length > 2);
        
        if (queryWords.length === 0) {
            return 0;
        }
        
        // Calculate word match ratio
        let matchCount = 0;
        for (const word of queryWords) {
            if (lowerText.includes(word)) {
                matchCount++;
            }
        }
        
        const wordMatchRatio = matchCount / queryWords.length;
        
        // Calculate exact phrase match bonus
        const exactMatchBonus = lowerText.includes(lowerQuery) ? 0.3 : 0;
        
        // Final relevance score
        return Math.min(wordMatchRatio + exactMatchBonus, 1.0);
    }
    
    /**
     * Extract a context snippet around matching text
     */
    private extractMatchContext(query: string, text: string, contextLength = 100): string {
        if (!query || !text) {
            return '';
        }
        
        const lowerQuery = query.toLowerCase();
        const lowerText = text.toLowerCase();
        
        // Find index of query in text
        const index = lowerText.indexOf(lowerQuery);
        
        if (index === -1) {
            // Try to find any query word
            const queryWords = lowerQuery.split(/\s+/).filter(word => word.length > 2);
            
            for (const word of queryWords) {
                const wordIndex = lowerText.indexOf(word);
                if (wordIndex !== -1) {
                    // Get context around this word
                    const start = Math.max(0, wordIndex - contextLength / 2);
                    const end = Math.min(text.length, wordIndex + word.length + contextLength / 2);
                    
                    let context = text.substring(start, end);
                    
                    // Add ellipsis if truncated
                    if (start > 0) {
                        context = '...' + context;
                    }
                    if (end < text.length) {
                        context = context + '...';
                    }
                    
                    return context;
                }
            }
            
            // No match found, return beginning of text
            return text.substring(0, Math.min(text.length, contextLength)) + 
                (text.length > contextLength ? '...' : '');
        }
        
        // Get context around the match
        const start = Math.max(0, index - contextLength / 2);
        const end = Math.min(text.length, index + lowerQuery.length + contextLength / 2);
        
        let context = text.substring(start, end);
        
        // Add ellipsis if truncated
        if (start > 0) {
            context = '...' + context;
        }
        if (end < text.length) {
            context = context + '...';
        }
        
        return context;
    }
    
    // Utility methods
    
    /**
     * Extract keywords from code context
     */
    private extractKeywords(context: CodeContext): string[] {
        const keywords: string[] = [];
        
        // Extract from code snippet if available
        if (context.codeSnippet) {
            // Extract identifiers and patterns based on language
            if (context.language === 'javascript' || context.language === 'typescript') {
                // Extract function calls
                const functionCalls = context.codeSnippet.match(/\b\w+\(/g);
                if (functionCalls) {
                    functionCalls.forEach(call => {
                        const funcName = call.slice(0, -1);
                        if (funcName.length > 2 && !keywords.includes(funcName)) {
                            keywords.push(funcName);
                        }
                    });
                }
                
                // Extract variable declarations with types
                const typeDeclarations = context.codeSnippet.match(/:\s*(\w+)/g);
                if (typeDeclarations) {
                    typeDeclarations.forEach(decl => {
                        const typeName = decl.slice(1).trim();
                        if (typeName.length > 2 && !keywords.includes(typeName)) {
                            keywords.push(typeName);
                        }
                    });
                }
                
                // Extract specific patterns like React hooks
                const reactHooks = context.codeSnippet.match(/use\w+\(/g);
                if (reactHooks) {
                    reactHooks.forEach(hook => {
                        const hookName = hook.slice(0, -1);
                        if (!keywords.includes(hookName)) {
                            keywords.push(hookName);
                        }
                    });
                    
                    // Add "react" as a keyword for React hooks
                    if (!keywords.includes('react')) {
                        keywords.push('react');
                    }
                }
            } else if (context.language === 'python') {
                // Extract import statements
                const importMatches = context.codeSnippet.match(/import\s+(\w+)/g);
                if (importMatches) {
                    importMatches.forEach(match => {
                        const moduleName = match.replace('import', '').trim();
                        if (moduleName.length > 2 && !keywords.includes(moduleName)) {
                            keywords.push(moduleName);
                        }
                    });
                }
                
                // Extract function calls
                const functionCalls = context.codeSnippet.match(/\b\w+\(/g);
                if (functionCalls) {
                    functionCalls.forEach(call => {
                        const funcName = call.slice(0, -1);
                        if (funcName.length > 2 && !keywords.includes(funcName)) {
                            keywords.push(funcName);
                        }
                    });
                }
            }
            
            // Add domain-specific keywords based on code snippet content
            const domainDetection = [
                { pattern: /html|css|dom|element|querySelector/i, keyword: 'dom' },
                { pattern: /database|sql|query|select|insert|update|delete/i, keyword: 'database' },
                { pattern: /http|fetch|request|response|api|endpoint/i, keyword: 'http' },
                { pattern: /component|render|state|props/i, keyword: 'ui-framework' },
                { pattern: /async|await|promise|then|catch/i, keyword: 'async' },
                { pattern: /math\.|sin|cos|tan|log|exp|sqrt/i, keyword: 'math' },
                { pattern: /file|path|read|write|stream/i, keyword: 'filesystem' },
                { pattern: /user|auth|login|password|credential/i, keyword: 'authentication' }
            ];
            
            for (const { pattern, keyword } of domainDetection) {
                if (pattern.test(context.codeSnippet) && !keywords.includes(keyword)) {
                    keywords.push(keyword);
                }
            }
        }
        
        // Add project type as a keyword if available
        if (context.projectType && !keywords.includes(context.projectType)) {
            keywords.push(context.projectType);
        }
        
        // Ensure we don't suggest already imported libraries
        return keywords.filter(keyword => 
            !context.imports.some(imp => imp.includes(keyword))
        );
    }
    
    /**
     * Normalize language name for comparison
     */
    private normalizeLanguage(language: string): string {
        const normalized = language.toLowerCase().trim();
        
        // Map common variations
        switch (normalized) {
            case 'js':
            case 'jsx':
                return 'javascript';
            case 'ts':
            case 'tsx':
                return 'typescript';
            case 'py':
                return 'python';
            default:
                return normalized;
        }
    }
    
    /**
     * Get compatibility score between two languages
     */
    private getLanguageCompatibilityScore(lang1: string, lang2: string): number {
        // Define language compatibility groups
        const compatibilityGroups = [
            ['javascript', 'typescript', 'jsx', 'tsx'],
            ['python', 'cython'],
            ['java', 'kotlin'],
            ['c', 'cpp', 'c++'],
            ['ruby', 'crystal'],
            ['php', 'hack'],
            ['swift', 'objective-c']
        ];
        
        // Check if languages are in the same group
        for (const group of compatibilityGroups) {
            if (group.includes(lang1) && group.includes(lang2)) {
                return 0.8; // Compatible but not exact match
            }
        }
        
        // Default score for unrelated languages
        return 0.2;
    }
    
    /**
     * Generate install command based on language and project type
     */
    private generateInstallCommand(library: LibraryInfo, context: CodeContext): string {
        const language = this.normalizeLanguage(context.language);
        
        switch (language) {
            case 'javascript':
            case 'typescript':
                // Check for specific project types
                if (context.projectType === 'react' || context.projectType === 'nextjs') {
                    return `npm install ${library.name}`;
                } else if (context.projectType === 'angular') {
                    return `npm install ${library.name}`;
                } else if (context.projectType === 'vue') {
                    return `npm install ${library.name}`;
                } else {
                    return `npm install ${library.name}`;
                }
            case 'python':
                return `pip install ${library.name}`;
            case 'java':
                // For Maven or Gradle
                return `implementation '${library.name}:${library.version}'`;
            case 'ruby':
                return `gem install ${library.name}`;
            case 'php':
                return `composer require ${library.name}`;
            case 'go':
                return `go get ${library.name}`;
            case 'rust':
                return `cargo add ${library.name}`;
            default:
                return `Install ${library.name} (version ${library.version})`;
        }
    }
    
    /**
     * Generate import example based on language
     */
    private generateImportExample(library: LibraryInfo, language: string): string {
        const normalizedLang = this.normalizeLanguage(language);
        
        switch (normalizedLang) {
            case 'javascript':
                return `import ${library.name} from '${library.name}';`;
            case 'typescript':
                return `import * as ${this.formatLibraryNameForImport(library.name)} from '${library.name}';`;
            case 'python':
                return `import ${library.name}`;
            case 'java':
                return `import ${library.name}.*;`;
            case 'ruby':
                return `require '${library.name}'`;
            case 'php':
                return `use ${this.capitalizeFirstLetter(library.name)}\\${this.capitalizeFirstLetter(library.name)};`;
            case 'go':
                return `import "${library.name}"`;
            case 'rust':
                return `use ${library.name}::*;`;
            default:
                return `Import ${library.name}`;
        }
    }
    
    /**
     * Format library name for import statements
     */
    private formatLibraryNameForImport(name: string): string {
        // Handle scoped packages (@org/package)
        if (name.startsWith('@')) {
            const parts = name.substring(1).split('/');
            if (parts.length === 2) {
                return this.camelCase(parts[1]);
            }
        }
        
        // Handle package names with hyphens
        return this.camelCase(name);
    }
    
    /**
     * Convert kebab-case to camelCase
     */
    private camelCase(str: string): string {
        return str
            .split('-')
            .map((word, index) => 
                index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
            )
            .join('');
    }
    
    /**
     * Capitalize first letter of a string
     */
    private capitalizeFirstLetter(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}