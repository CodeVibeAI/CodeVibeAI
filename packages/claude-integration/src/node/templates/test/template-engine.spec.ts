import { expect } from 'chai';
import { Container } from 'inversify';
import { ILogger } from '@theia/core';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

import { TemplateEngine, TemplateContext } from '../template-engine';

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

describe('TemplateEngine', () => {
    let templateEngine: TemplateEngine;
    let container: Container;
    let sandbox: sinon.SinonSandbox;
    let mockLogger: ILogger;
    
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        mockLogger = new MockLogger();
        
        container = new Container();
        container.bind(ILogger).toConstantValue(mockLogger);
        container.bind(TemplateEngine).toSelf().inSingletonScope();
        
        templateEngine = container.get(TemplateEngine);
    });
    
    afterEach(() => {
        sandbox.restore();
    });
    
    describe('render', () => {
        it('should interpolate variables in templates', async () => {
            // Mock the loadTemplate method to return a test template
            sandbox.stub(Object.getPrototypeOf(templateEngine), 'loadTemplate').resolves(
                'Hello, ${name}! You are using ${language}.'
            );
            
            const context: TemplateContext = {
                language: 'typescript',
                name: 'User'
            };
            
            const result = await templateEngine.render('test-template', context);
            
            expect(result.prompt).to.equal('Hello, User! You are using typescript.');
            expect(result.metadata.templateName).to.equal('test-template');
        });
        
        it('should handle helper functions in templates', async () => {
            // Mock the loadTemplate method to return a test template with helper functions
            sandbox.stub(Object.getPrototypeOf(templateEngine), 'loadTemplate').resolves(
                'Language: ${upperCase(language)}. Welcome, ${capitalize(name)}!'
            );
            
            const context: TemplateContext = {
                language: 'typescript',
                name: 'user'
            };
            
            const result = await templateEngine.render('test-template', context);
            
            expect(result.prompt).to.equal('Language: TYPESCRIPT. Welcome, User!');
        });
        
        it('should load and render a system prompt if enabled', async () => {
            // Mock the loadTemplate methods to return test templates
            const loadTemplateStub = sandbox.stub(Object.getPrototypeOf(templateEngine), 'loadTemplate');
            loadTemplateStub.withArgs('test-template').resolves('Main prompt for ${language}');
            loadTemplateStub.withArgs('test-template.system').resolves('System: ${language} assistant');
            
            const context: TemplateContext = {
                language: 'typescript'
            };
            
            const result = await templateEngine.render('test-template', context, {
                useSystemPrompt: true
            });
            
            expect(result.prompt).to.equal('Main prompt for typescript');
            expect(result.systemPrompt).to.equal('System: typescript assistant');
        });
        
        it('should handle conditional sections with ifThen helper', async () => {
            // Mock the loadTemplate method to return a test template with conditional sections
            sandbox.stub(Object.getPrototypeOf(templateEngine), 'loadTemplate').resolves(
                'Basic ${ifThen({ condition: language === "typescript", content: "Use TypeScript", elseContent: "Use JavaScript" })}'
            );
            
            const tsContext: TemplateContext = {
                language: 'typescript'
            };
            
            const jsContext: TemplateContext = {
                language: 'javascript'
            };
            
            const tsResult = await templateEngine.render('test-template', tsContext);
            const jsResult = await templateEngine.render('test-template', jsContext);
            
            expect(tsResult.prompt).to.equal('Basic Use TypeScript');
            expect(jsResult.prompt).to.equal('Basic Use JavaScript');
        });
        
        it('should include model preferences in the rendered template', async () => {
            // Mock the loadTemplate method to return a test template
            sandbox.stub(Object.getPrototypeOf(templateEngine), 'loadTemplate').resolves(
                'Template for ${language}'
            );
            
            const context: TemplateContext = {
                language: 'python'
            };
            
            const options = {
                modelPreferences: {
                    temperature: 0.7,
                    maxTokens: 2000
                }
            };
            
            const result = await templateEngine.render('test-template', context, options);
            
            expect(result.options).to.deep.equal(options.modelPreferences);
        });
        
        it('should handle missing variables gracefully', async () => {
            // Mock the loadTemplate method to return a test template with an undefined variable
            sandbox.stub(Object.getPrototypeOf(templateEngine), 'loadTemplate').resolves(
                'Language: ${language}, Project: ${projectName}, File: ${filePath}'
            );
            
            const context: TemplateContext = {
                language: 'java'
                // projectName and filePath are undefined
            };
            
            const result = await templateEngine.render('test-template', context);
            
            expect(result.prompt).to.equal('Language: java, Project: ${projectName}, File: ${filePath}');
        });
    });
    
    describe('Custom helpers', () => {
        it('should allow registering custom helper functions', async () => {
            // Register a custom helper
            templateEngine.registerHelper('double', (value: number) => {
                return String(value * 2);
            });
            
            // Mock the loadTemplate method to return a test template using the custom helper
            sandbox.stub(Object.getPrototypeOf(templateEngine), 'loadTemplate').resolves(
                'Double of 5 is ${double(5)}'
            );
            
            const context: TemplateContext = {
                language: 'typescript'
            };
            
            const result = await templateEngine.render('test-template', context);
            
            expect(result.prompt).to.equal('Double of 5 is 10');
        });
    });
    
    describe('Error handling', () => {
        it('should throw a TemplateError when template loading fails', async () => {
            // Mock loadTemplate to throw an error
            sandbox.stub(Object.getPrototypeOf(templateEngine), 'loadTemplate').rejects(
                new Error('File not found')
            );
            
            const context: TemplateContext = {
                language: 'typescript'
            };
            
            try {
                await templateEngine.render('non-existent-template', context);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.name).to.equal('TemplateError');
                expect(error.message).to.include('Failed to render template');
            }
        });
    });
});