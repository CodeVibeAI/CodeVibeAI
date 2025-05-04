import { injectable, inject } from 'inversify';
import { ILogger } from '@theia/core';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

/**
 * Template variant type
 */
export type TemplateVariant = 'A' | 'B' | 'C' | 'D' | string;

/**
 * Experiment status
 */
export enum ExperimentStatus {
    ACTIVE = 'active',
    COMPLETED = 'completed',
    PAUSED = 'paused'
}

/**
 * Template experiment definition
 */
export interface TemplateExperiment {
    /** Unique experiment ID */
    id: string;
    
    /** Descriptive name */
    name: string;
    
    /** Template type being tested */
    templateType: string;
    
    /** Experiment status */
    status: ExperimentStatus;
    
    /** Start date */
    startDate: string;
    
    /** End date (if completed) */
    endDate?: string;
    
    /** Available variants */
    variants: TemplateVariant[];
    
    /** Variant distribution (percentage) */
    distribution?: Record<TemplateVariant, number>;
    
    /** Description of what's being tested */
    description?: string;
    
    /** Creator of the experiment */
    createdBy?: string;
}

/**
 * Template usage metrics
 */
export interface TemplateUsageMetrics {
    /** Template name */
    templateName: string;
    
    /** Experiment ID if part of an experiment */
    experimentId?: string;
    
    /** Variant used */
    variant?: TemplateVariant;
    
    /** User ID or session ID */
    userId?: string;
    
    /** Response quality rating (1-5) */
    responseQuality?: number;
    
    /** Time to generate response (ms) */
    responseTime?: number;
    
    /** Tokens used */
    tokenCount?: number;
    
    /** User acceptance (true if accepted/used) */
    accepted?: boolean;
    
    /** Timestamp */
    timestamp: string;
    
    /** Additional custom metrics */
    [key: string]: any;
}

/**
 * Variant selection strategy
 */
export enum VariantSelectionStrategy {
    RANDOM = 'random',
    WEIGHTED = 'weighted',
    DETERMINISTIC = 'deterministic',
    USER_CONSISTENT = 'user_consistent'
}

/**
 * Template A/B testing service
 * 
 * Manages template experiments, collects metrics, and assists in optimizing
 * prompt templates through controlled testing.
 */
@injectable()
export class TemplateABTesting {
    /** Active experiments */
    private activeExperiments = new Map<string, TemplateExperiment>();
    
    /** Recently collected metrics (in-memory cache) */
    private recentMetrics: TemplateUsageMetrics[] = [];
    
    /** Path to experiments data file */
    private experimentsPath: string;
    
    /** Path to metrics data directory */
    private metricsDir: string;
    
    constructor(
        @inject(ILogger) protected readonly logger: ILogger
    ) {
        // Determine data paths - in a real implementation, these would be configurable
        const dataDir = path.join(__dirname, '..', '..', 'data');
        this.experimentsPath = path.join(dataDir, 'template-experiments.json');
        this.metricsDir = path.join(dataDir, 'template-metrics');
    }
    
    /**
     * Initialize the A/B testing service
     */
    async initialize(): Promise<void> {
        try {
            // Ensure data directories exist
            await this.ensureDirectoryExists(path.dirname(this.experimentsPath));
            await this.ensureDirectoryExists(this.metricsDir);
            
            // Load existing experiments
            await this.loadExperiments();
            
            this.logger.info('Template A/B testing service initialized');
        } catch (error) {
            this.logger.error('Failed to initialize template A/B testing service:', error);
        }
    }
    
    /**
     * Create a new template experiment
     * 
     * @param experiment Experiment definition
     * @returns Created experiment
     */
    async createExperiment(experiment: Omit<TemplateExperiment, 'id' | 'startDate' | 'status'>): Promise<TemplateExperiment> {
        const id = experiment.id || uuidv4();
        const newExperiment: TemplateExperiment = {
            ...experiment,
            id,
            status: ExperimentStatus.ACTIVE,
            startDate: new Date().toISOString(),
        };
        
        this.activeExperiments.set(id, newExperiment);
        await this.saveExperiments();
        
        this.logger.info(`Created template experiment: ${id} (${experiment.name})`);
        return newExperiment;
    }
    
    /**
     * Get an experiment by ID
     * 
     * @param experimentId Experiment ID
     * @returns Experiment if found, undefined otherwise
     */
    getExperiment(experimentId: string): TemplateExperiment | undefined {
        return this.activeExperiments.get(experimentId);
    }
    
    /**
     * Get all active experiments
     * 
     * @returns All active experiments
     */
    getActiveExperiments(): TemplateExperiment[] {
        return Array.from(this.activeExperiments.values())
            .filter(exp => exp.status === ExperimentStatus.ACTIVE);
    }
    
    /**
     * Update an experiment
     * 
     * @param experimentId Experiment ID
     * @param updates Updates to apply
     * @returns Updated experiment
     */
    async updateExperiment(
        experimentId: string, 
        updates: Partial<Omit<TemplateExperiment, 'id'>>
    ): Promise<TemplateExperiment | undefined> {
        const experiment = this.activeExperiments.get(experimentId);
        if (!experiment) {
            return undefined;
        }
        
        const updatedExperiment = {
            ...experiment,
            ...updates
        };
        
        this.activeExperiments.set(experimentId, updatedExperiment);
        await this.saveExperiments();
        
        return updatedExperiment;
    }
    
    /**
     * Complete an experiment
     * 
     * @param experimentId Experiment ID
     * @returns Updated experiment
     */
    async completeExperiment(experimentId: string): Promise<TemplateExperiment | undefined> {
        return this.updateExperiment(experimentId, {
            status: ExperimentStatus.COMPLETED,
            endDate: new Date().toISOString()
        });
    }
    
    /**
     * Select a variant for an experiment
     * 
     * @param experimentId Experiment ID
     * @param userId Optional user ID for consistent selection
     * @param strategy Selection strategy
     * @returns Selected variant
     */
    selectVariant(
        experimentId: string,
        userId?: string,
        strategy: VariantSelectionStrategy = VariantSelectionStrategy.WEIGHTED
    ): TemplateVariant | undefined {
        const experiment = this.activeExperiments.get(experimentId);
        if (!experiment || experiment.status !== ExperimentStatus.ACTIVE) {
            return undefined;
        }
        
        // Default to first variant if only one exists
        if (experiment.variants.length === 1) {
            return experiment.variants[0];
        }
        
        switch (strategy) {
            case VariantSelectionStrategy.RANDOM:
                return this.randomSelection(experiment.variants);
                
            case VariantSelectionStrategy.WEIGHTED:
                return this.weightedSelection(experiment);
                
            case VariantSelectionStrategy.DETERMINISTIC:
                return this.deterministicSelection(experimentId, experiment.variants);
                
            case VariantSelectionStrategy.USER_CONSISTENT:
                return this.userConsistentSelection(experimentId, userId || 'anonymous', experiment.variants);
                
            default:
                return this.randomSelection(experiment.variants);
        }
    }
    
    /**
     * Log template usage metrics
     * 
     * @param metrics Usage metrics
     */
    async logTemplateUsage(metrics: Omit<TemplateUsageMetrics, 'timestamp'>): Promise<void> {
        try {
            const fullMetrics: TemplateUsageMetrics = {
                ...metrics,
                timestamp: new Date().toISOString()
            };
            
            // Add to memory cache
            this.recentMetrics.push(fullMetrics);
            // Keep cache size reasonable
            if (this.recentMetrics.length > 1000) {
                this.recentMetrics.shift();
            }
            
            // Persist to disk (batched for performance in a real implementation)
            await this.saveMetrics(fullMetrics);
            
            this.logger.debug(`Logged template usage: ${metrics.templateName} (${metrics.experimentId || 'no experiment'})`);
        } catch (error) {
            this.logger.error('Failed to log template usage:', error);
        }
    }
    
    /**
     * Get metrics for an experiment
     * 
     * @param experimentId Experiment ID
     * @returns Metrics for the experiment
     */
    async getExperimentMetrics(experimentId: string): Promise<TemplateUsageMetrics[]> {
        try {
            // In a real implementation, this would query a database or analytics service
            // For simplicity, we're just filtering the in-memory cache
            const inMemoryMetrics = this.recentMetrics.filter(m => m.experimentId === experimentId);
            
            // Also look for persisted metrics files
            const fileMetrics = await this.loadMetricsForExperiment(experimentId);
            
            // Combine and deduplicate
            const allMetrics = [...inMemoryMetrics, ...fileMetrics];
            const uniqueMetrics = this.deduplicateMetrics(allMetrics);
            
            return uniqueMetrics;
        } catch (error) {
            this.logger.error(`Failed to get metrics for experiment ${experimentId}:`, error);
            return [];
        }
    }
    
    /**
     * Get summary statistics for an experiment
     * 
     * @param experimentId Experiment ID
     * @returns Summary statistics by variant
     */
    async getExperimentSummary(experimentId: string): Promise<Record<TemplateVariant, {
        count: number;
        avgQuality?: number;
        avgResponseTime?: number;
        acceptanceRate?: number;
    }>> {
        const metrics = await this.getExperimentMetrics(experimentId);
        const experiment = this.getExperiment(experimentId);
        
        if (!experiment) {
            return {};
        }
        
        const summary: Record<string, {
            count: number;
            qualitySum: number;
            qualityCount: number;
            responseTimeSum: number;
            responseTimeCount: number;
            acceptedCount: number;
            acceptedTotal: number;
        }> = {};
        
        // Initialize summary for each variant
        for (const variant of experiment.variants) {
            summary[variant] = {
                count: 0,
                qualitySum: 0,
                qualityCount: 0,
                responseTimeSum: 0,
                responseTimeCount: 0,
                acceptedCount: 0,
                acceptedTotal: 0
            };
        }
        
        // Aggregate metrics
        for (const metric of metrics) {
            const variant = metric.variant || 'A';
            if (!summary[variant]) continue;
            
            summary[variant].count++;
            
            if (metric.responseQuality !== undefined) {
                summary[variant].qualitySum += metric.responseQuality;
                summary[variant].qualityCount++;
            }
            
            if (metric.responseTime !== undefined) {
                summary[variant].responseTimeSum += metric.responseTime;
                summary[variant].responseTimeCount++;
            }
            
            if (metric.accepted !== undefined) {
                summary[variant].acceptedTotal++;
                if (metric.accepted) {
                    summary[variant].acceptedCount++;
                }
            }
        }
        
        // Calculate averages
        const result: Record<TemplateVariant, {
            count: number;
            avgQuality?: number;
            avgResponseTime?: number;
            acceptanceRate?: number;
        }> = {};
        
        for (const variant of experiment.variants) {
            const stats = summary[variant];
            result[variant] = {
                count: stats.count,
                avgQuality: stats.qualityCount > 0 
                    ? stats.qualitySum / stats.qualityCount 
                    : undefined,
                avgResponseTime: stats.responseTimeCount > 0 
                    ? stats.responseTimeSum / stats.responseTimeCount 
                    : undefined,
                acceptanceRate: stats.acceptedTotal > 0 
                    ? stats.acceptedCount / stats.acceptedTotal 
                    : undefined
            };
        }
        
        return result;
    }
    
    /**
     * Identify the winning variant for an experiment based on metrics
     * 
     * @param experimentId Experiment ID
     * @param primaryMetric Metric to use for determining the winner
     * @returns Winning variant or undefined if no clear winner
     */
    async getWinningVariant(
        experimentId: string,
        primaryMetric: 'avgQuality' | 'avgResponseTime' | 'acceptanceRate' = 'avgQuality'
    ): Promise<{
        variant: TemplateVariant;
        stats: any;
        confidence: number;
    } | undefined> {
        const summary = await this.getExperimentSummary(experimentId);
        const variants = Object.keys(summary);
        
        if (variants.length < 2) {
            return undefined;
        }
        
        // Simple comparison for demonstration
        // A real implementation would use proper statistical analysis
        let bestVariant: TemplateVariant | undefined;
        let bestValue = 0;
        let confidence = 0;
        
        for (const variant of variants) {
            const stats = summary[variant];
            
            if (!stats[primaryMetric]) {
                continue;
            }
            
            const value = primaryMetric === 'avgResponseTime'
                ? -stats[primaryMetric]! // Lower is better for response time
                : stats[primaryMetric]!;
                
            if (bestVariant === undefined || value > bestValue) {
                bestVariant = variant;
                bestValue = value;
                
                // Simple confidence calculation based on sample size
                // A real implementation would use statistical tests
                confidence = Math.min(0.5 + (stats.count / 100) * 0.5, 0.95);
            }
        }
        
        if (!bestVariant) {
            return undefined;
        }
        
        return {
            variant: bestVariant,
            stats: summary[bestVariant],
            confidence
        };
    }
    
    /**
     * Random variant selection
     * 
     * @param variants Available variants
     * @returns Randomly selected variant
     */
    private randomSelection(variants: TemplateVariant[]): TemplateVariant {
        const index = Math.floor(Math.random() * variants.length);
        return variants[index];
    }
    
    /**
     * Weighted variant selection based on distribution
     * 
     * @param experiment Experiment with distribution
     * @returns Selected variant
     */
    private weightedSelection(experiment: TemplateExperiment): TemplateVariant {
        const { variants, distribution } = experiment;
        
        // If no distribution is defined, use random selection
        if (!distribution) {
            return this.randomSelection(variants);
        }
        
        const weights: number[] = [];
        let totalWeight = 0;
        
        // Calculate cumulative weights
        for (const variant of variants) {
            const weight = distribution[variant] || 100 / variants.length;
            totalWeight += weight;
            weights.push(totalWeight);
        }
        
        // Select based on random value against cumulative weights
        const random = Math.random() * totalWeight;
        
        for (let i = 0; i < weights.length; i++) {
            if (random < weights[i]) {
                return variants[i];
            }
        }
        
        // Fallback
        return variants[0];
    }
    
    /**
     * Deterministic variant selection based on experiment ID
     * 
     * @param experimentId Experiment ID
     * @param variants Available variants
     * @returns Selected variant
     */
    private deterministicSelection(experimentId: string, variants: TemplateVariant[]): TemplateVariant {
        // Create a deterministic but seemingly random selection
        let hash = 0;
        for (let i = 0; i < experimentId.length; i++) {
            hash = ((hash << 5) - hash) + experimentId.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        
        const index = Math.abs(hash) % variants.length;
        return variants[index];
    }
    
    /**
     * User-consistent variant selection
     * 
     * @param experimentId Experiment ID
     * @param userId User ID
     * @param variants Available variants
     * @returns Selected variant
     */
    private userConsistentSelection(
        experimentId: string,
        userId: string,
        variants: TemplateVariant[]
    ): TemplateVariant {
        // Combine experimentId and userId for consistent selection
        const combinedId = `${experimentId}-${userId}`;
        return this.deterministicSelection(combinedId, variants);
    }
    
    /**
     * Load experiments from storage
     */
    private async loadExperiments(): Promise<void> {
        try {
            const exists = await this.fileExists(this.experimentsPath);
            if (!exists) {
                this.activeExperiments = new Map();
                return;
            }
            
            const readFile = promisify(fs.readFile);
            const data = await readFile(this.experimentsPath, 'utf8');
            const experiments: TemplateExperiment[] = JSON.parse(data);
            
            this.activeExperiments = new Map(
                experiments.map(exp => [exp.id, exp])
            );
            
            this.logger.info(`Loaded ${this.activeExperiments.size} template experiments`);
        } catch (error) {
            this.logger.error('Failed to load template experiments:', error);
            this.activeExperiments = new Map();
        }
    }
    
    /**
     * Save experiments to storage
     */
    private async saveExperiments(): Promise<void> {
        try {
            const experiments = Array.from(this.activeExperiments.values());
            const writeFile = promisify(fs.writeFile);
            
            await this.ensureDirectoryExists(path.dirname(this.experimentsPath));
            await writeFile(
                this.experimentsPath,
                JSON.stringify(experiments, null, 2),
                'utf8'
            );
        } catch (error) {
            this.logger.error('Failed to save template experiments:', error);
        }
    }
    
    /**
     * Save metrics to storage
     * 
     * @param metrics Metrics to save
     */
    private async saveMetrics(metrics: TemplateUsageMetrics): Promise<void> {
        try {
            const writeFile = promisify(fs.writeFile);
            const fileName = `${metrics.templateName}-${new Date().toISOString()}.json`.replace(/:/g, '-');
            const filePath = path.join(this.metricsDir, fileName);
            
            await this.ensureDirectoryExists(this.metricsDir);
            await writeFile(filePath, JSON.stringify(metrics, null, 2), 'utf8');
        } catch (error) {
            this.logger.error('Failed to save template metrics:', error);
        }
    }
    
    /**
     * Load metrics for an experiment from storage
     * 
     * @param experimentId Experiment ID
     * @returns Metrics for the experiment
     */
    private async loadMetricsForExperiment(experimentId: string): Promise<TemplateUsageMetrics[]> {
        try {
            const readdir = promisify(fs.readdir);
            const readFile = promisify(fs.readFile);
            
            const files = await readdir(this.metricsDir);
            const metrics: TemplateUsageMetrics[] = [];
            
            for (const file of files) {
                if (!file.endsWith('.json')) continue;
                
                try {
                    const filePath = path.join(this.metricsDir, file);
                    const data = await readFile(filePath, 'utf8');
                    const metric: TemplateUsageMetrics = JSON.parse(data);
                    
                    if (metric.experimentId === experimentId) {
                        metrics.push(metric);
                    }
                } catch (e) {
                    // Skip invalid files
                    this.logger.warn(`Failed to parse metrics file ${file}:`, e);
                }
            }
            
            return metrics;
        } catch (error) {
            this.logger.error(`Failed to load metrics for experiment ${experimentId}:`, error);
            return [];
        }
    }
    
    /**
     * Deduplicate metrics by timestamp
     * 
     * @param metrics Metrics to deduplicate
     * @returns Deduplicated metrics
     */
    private deduplicateMetrics(metrics: TemplateUsageMetrics[]): TemplateUsageMetrics[] {
        const seen = new Set<string>();
        return metrics.filter(metric => {
            const key = `${metric.templateName}-${metric.timestamp}-${metric.variant || ''}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
    
    /**
     * Check if a file exists
     * 
     * @param filePath File path
     * @returns True if the file exists
     */
    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await promisify(fs.access)(filePath);
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * Ensure a directory exists
     * 
     * @param dirPath Directory path
     */
    private async ensureDirectoryExists(dirPath: string): Promise<void> {
        try {
            await promisify(fs.mkdir)(dirPath, { recursive: true });
        } catch (error) {
            // Directory might already exist
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
                throw error;
            }
        }
    }
}