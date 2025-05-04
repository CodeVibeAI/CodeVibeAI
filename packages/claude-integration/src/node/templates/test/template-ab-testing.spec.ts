import { expect } from 'chai';
import { Container } from 'inversify';
import { ILogger } from '@theia/core';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

import { 
    TemplateABTesting, 
    TemplateExperiment, 
    ExperimentStatus,
    VariantSelectionStrategy 
} from '../template-ab-testing';

// Mock logger for testing
class MockLogger implements ILogger {
    error(message: string, ...params: any[]): void {}
    warn(message: string, ...params: any[]): void {}
    info(message: string, ...params: any[]): void {}
    debug(message: string, ...params: any[]): void {}
    log(logLevel: number, message: string, ...params: any[]): void {}
    setLogLevel(logLevel: number): void {}
    getLogLevel(): number { return 0; }
    isEnabled(logLevel: number): boolean { return true; }
    ifEnabled(logLevel: number): (() => void) | undefined { return () => {}; }
    child(obj: object): ILogger { return this; }
}

describe('TemplateABTesting', () => {
    let abTesting: TemplateABTesting;
    let container: Container;
    let sandbox: sinon.SinonSandbox;
    let mockLogger: ILogger;
    
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        mockLogger = new MockLogger();
        
        container = new Container();
        container.bind(ILogger).toConstantValue(mockLogger);
        container.bind(TemplateABTesting).toSelf().inSingletonScope();
        
        abTesting = container.get(TemplateABTesting);
        
        // Mock filesystem methods
        sandbox.stub(fs, 'mkdir').yields(null);
        sandbox.stub(fs, 'access').yields(null);
        
        // Mock the loadExperiments method to prevent actual file loading
        sandbox.stub(Object.getPrototypeOf(abTesting), 'loadExperiments').resolves();
    });
    
    afterEach(() => {
        sandbox.restore();
    });
    
    describe('createExperiment', () => {
        it('should create a new experiment with proper defaults', async () => {
            // Mock saveExperiments to do nothing
            sandbox.stub(Object.getPrototypeOf(abTesting), 'saveExperiments').resolves();
            
            const experiment = await abTesting.createExperiment({
                name: 'Test Experiment',
                templateType: 'code-generation',
                variants: ['A', 'B']
            });
            
            expect(experiment.id).to.be.a('string');
            expect(experiment.name).to.equal('Test Experiment');
            expect(experiment.templateType).to.equal('code-generation');
            expect(experiment.status).to.equal(ExperimentStatus.ACTIVE);
            expect(experiment.startDate).to.be.a('string');
            expect(experiment.variants).to.deep.equal(['A', 'B']);
        });
    });
    
    describe('selectVariant', () => {
        let testExperiment: TemplateExperiment;
        
        beforeEach(async () => {
            // Mock saveExperiments to do nothing
            sandbox.stub(Object.getPrototypeOf(abTesting), 'saveExperiments').resolves();
            
            // Create a test experiment
            testExperiment = await abTesting.createExperiment({
                name: 'Test Experiment',
                templateType: 'code-generation',
                variants: ['A', 'B', 'C'],
                distribution: {
                    'A': 60,
                    'B': 30,
                    'C': 10
                }
            });
        });
        
        it('should return a valid variant for an active experiment', () => {
            const variant = abTesting.selectVariant(testExperiment.id);
            expect(['A', 'B', 'C']).to.include(variant);
        });
        
        it('should return undefined for a non-existent experiment', () => {
            const variant = abTesting.selectVariant('non-existent-id');
            expect(variant).to.be.undefined;
        });
        
        it('should return consistent variants when using deterministic selection', () => {
            const variant1 = abTesting.selectVariant(
                testExperiment.id,
                undefined,
                VariantSelectionStrategy.DETERMINISTIC
            );
            
            const variant2 = abTesting.selectVariant(
                testExperiment.id,
                undefined,
                VariantSelectionStrategy.DETERMINISTIC
            );
            
            expect(variant1).to.equal(variant2);
        });
        
        it('should return consistent variants for the same user', () => {
            const userId = 'test-user-123';
            
            const variant1 = abTesting.selectVariant(
                testExperiment.id,
                userId,
                VariantSelectionStrategy.USER_CONSISTENT
            );
            
            const variant2 = abTesting.selectVariant(
                testExperiment.id,
                userId,
                VariantSelectionStrategy.USER_CONSISTENT
            );
            
            expect(variant1).to.equal(variant2);
        });
        
        it('should return different variants for different users', () => {
            // This test might occasionally fail due to random chance
            // If two different users happen to get the same variant
            const variantCounts = new Map<string, number>();
            const userCount = 100;
            
            for (let i = 0; i < userCount; i++) {
                const userId = `user-${i}`;
                const variant = abTesting.selectVariant(
                    testExperiment.id,
                    userId,
                    VariantSelectionStrategy.USER_CONSISTENT
                );
                
                if (variant) {
                    variantCounts.set(variant, (variantCounts.get(variant) || 0) + 1);
                }
            }
            
            // Ensure we got at least 2 different variants
            expect(variantCounts.size).to.be.at.least(2);
        });
    });
    
    describe('logTemplateUsage', () => {
        beforeEach(() => {
            // Mock saveMetrics to do nothing
            sandbox.stub(Object.getPrototypeOf(abTesting), 'saveMetrics').resolves();
        });
        
        it('should log template usage metrics with timestamp', async () => {
            await abTesting.logTemplateUsage({
                templateName: 'code-generation',
                experimentId: 'test-experiment',
                variant: 'A',
                responseQuality: 4.5,
                responseTime: 1200,
                accepted: true
            });
            
            // Check that recent metrics include the logged metrics
            const recentMetrics = (abTesting as any).recentMetrics;
            expect(recentMetrics.length).to.equal(1);
            
            const loggedMetric = recentMetrics[0];
            expect(loggedMetric.templateName).to.equal('code-generation');
            expect(loggedMetric.experimentId).to.equal('test-experiment');
            expect(loggedMetric.variant).to.equal('A');
            expect(loggedMetric.responseQuality).to.equal(4.5);
            expect(loggedMetric.responseTime).to.equal(1200);
            expect(loggedMetric.accepted).to.be.true;
            expect(loggedMetric.timestamp).to.be.a('string');
        });
    });
    
    describe('getExperimentSummary', () => {
        let testExperiment: TemplateExperiment;
        
        beforeEach(async () => {
            // Mock saveExperiments and saveMetrics to do nothing
            sandbox.stub(Object.getPrototypeOf(abTesting), 'saveExperiments').resolves();
            sandbox.stub(Object.getPrototypeOf(abTesting), 'saveMetrics').resolves();
            
            // Create a test experiment
            testExperiment = await abTesting.createExperiment({
                name: 'Test Experiment',
                templateType: 'code-generation',
                variants: ['A', 'B']
            });
            
            // Log some test metrics
            await abTesting.logTemplateUsage({
                templateName: 'code-generation',
                experimentId: testExperiment.id,
                variant: 'A',
                responseQuality: 4.0,
                responseTime: 1000,
                accepted: true
            });
            
            await abTesting.logTemplateUsage({
                templateName: 'code-generation',
                experimentId: testExperiment.id,
                variant: 'A',
                responseQuality: 5.0,
                responseTime: 1200,
                accepted: true
            });
            
            await abTesting.logTemplateUsage({
                templateName: 'code-generation',
                experimentId: testExperiment.id,
                variant: 'B',
                responseQuality: 3.0,
                responseTime: 800,
                accepted: false
            });
            
            // Mock loadMetricsForExperiment to return empty array (we're using in-memory metrics)
            sandbox.stub(Object.getPrototypeOf(abTesting), 'loadMetricsForExperiment').resolves([]);
        });
        
        it('should calculate correct summary statistics by variant', async () => {
            const summary = await abTesting.getExperimentSummary(testExperiment.id);
            
            expect(summary).to.have.keys('A', 'B');
            
            // Check variant A stats
            expect(summary.A.count).to.equal(2);
            expect(summary.A.avgQuality).to.equal(4.5); // (4.0 + 5.0) / 2
            expect(summary.A.avgResponseTime).to.equal(1100); // (1000 + 1200) / 2
            expect(summary.A.acceptanceRate).to.equal(1.0); // 2/2
            
            // Check variant B stats
            expect(summary.B.count).to.equal(1);
            expect(summary.B.avgQuality).to.equal(3.0);
            expect(summary.B.avgResponseTime).to.equal(800);
            expect(summary.B.acceptanceRate).to.equal(0); // 0/1
        });
    });
    
    describe('getWinningVariant', () => {
        let testExperiment: TemplateExperiment;
        
        beforeEach(async () => {
            // Mock saveExperiments and saveMetrics to do nothing
            sandbox.stub(Object.getPrototypeOf(abTesting), 'saveExperiments').resolves();
            sandbox.stub(Object.getPrototypeOf(abTesting), 'saveMetrics').resolves();
            
            // Create a test experiment
            testExperiment = await abTesting.createExperiment({
                name: 'Test Experiment',
                templateType: 'code-generation',
                variants: ['A', 'B']
            });
            
            // Log some test metrics with A clearly better than B
            for (let i = 0; i < 10; i++) {
                await abTesting.logTemplateUsage({
                    templateName: 'code-generation',
                    experimentId: testExperiment.id,
                    variant: 'A',
                    responseQuality: 4.5,
                    responseTime: 1000,
                    accepted: true
                });
            }
            
            for (let i = 0; i < 10; i++) {
                await abTesting.logTemplateUsage({
                    templateName: 'code-generation',
                    experimentId: testExperiment.id,
                    variant: 'B',
                    responseQuality: 3.5,
                    responseTime: 1200,
                    accepted: true
                });
            }
            
            // Mock loadMetricsForExperiment to return empty array (we're using in-memory metrics)
            sandbox.stub(Object.getPrototypeOf(abTesting), 'loadMetricsForExperiment').resolves([]);
        });
        
        it('should identify the winning variant based on quality', async () => {
            const winner = await abTesting.getWinningVariant(testExperiment.id, 'avgQuality');
            
            expect(winner).to.not.be.undefined;
            if (winner) {
                expect(winner.variant).to.equal('A');
                expect(winner.stats.avgQuality).to.equal(4.5);
                expect(winner.confidence).to.be.above(0.5);
            }
        });
        
        it('should identify the winning variant based on response time', async () => {
            const winner = await abTesting.getWinningVariant(testExperiment.id, 'avgResponseTime');
            
            expect(winner).to.not.be.undefined;
            if (winner) {
                expect(winner.variant).to.equal('A'); // A is faster (lower is better)
                expect(winner.stats.avgResponseTime).to.equal(1000);
                expect(winner.confidence).to.be.above(0.5);
            }
        });
    });
});