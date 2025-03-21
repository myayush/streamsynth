const fs = require('fs-extra');
const path = require('path');
const { createPipeline } = require('../core/pipeline');
const { parsePipeline } = require('../dsl/parser');
const Engine = require('../core/engine');

/**
 * Runs a pipeline from a DSL file
 * @param {string} filePath - Path to DSL file
 */
async function runFile(filePath) {
  try {
    const dslPath = path.resolve(filePath);
    const dslContent = await fs.readFile(dslPath, 'utf8');
    
    const pipeline = parsePipeline(dslContent);
    const engine = new Engine(pipeline);
    
    // Handle events
    engine.on('error', (error) => {
      console.error('Pipeline error:', error);
    });
    
    engine.on('started', () => {
      console.log('Pipeline started');
    });
    
    engine.on('stopped', () => {
      console.log('Pipeline stopped');
    });
    
    engine.on('spillover', (file, count) => {
      console.log(`Spillover: ${count} events written to ${file}`);
    });
    
    // Start the pipeline
    await engine.start();
    
    // Handle shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down...');
      await engine.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to run pipeline:', error);
    process.exit(1);
  }
}

/**
 * Creates a new DSL file template
 * @param {string} filePath - Path for the new DSL file
 */
async function createTemplate(filePath) {
  const template = `# StreamSynth Pipeline
source file("./input.json")
filter(event.statusCode >= 400)
transform({ code: event.statusCode, url: event.url, timestamp: event.timestamp })
sink file("./output.json")
bufferSize 1000
`;

  try {
    await fs.writeFile(filePath, template);
    console.log(`Template created at ${filePath}`);
  } catch (error) {
    console.error('Failed to create template:', error);
    process.exit(1);
  }
}

module.exports = {
  runFile,
  createTemplate
};