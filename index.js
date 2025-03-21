const { createPipeline } = require('./src/core/pipeline');
const { parsePipeline } = require('./src/dsl/parser');
const Engine = require('./src/core/engine');
const { runFile, createTemplate } = require('./src/cli/commands');
const Dashboard = require('./src/cli/dashboard');

// Export public API
module.exports = {
  // Core API
  createPipeline,
  parsePipeline,
  Engine,
  
  // CLI commands
  runFile,
  createTemplate,
  Dashboard,
  
  // Run CLI if invoked directly
  run: async (args) => {
    const [command, ...cmdArgs] = args;
    
    switch (command) {
      case 'run':
        if (cmdArgs.length < 1) {
          console.error('Usage: streamsynth run <file.dsl>');
          process.exit(1);
        }
        await runFile(cmdArgs[0]);
        break;
        
      case 'create':
        if (cmdArgs.length < 1) {
          console.error('Usage: streamsynth create <file.dsl>');
          process.exit(1);
        }
        await createTemplate(cmdArgs[0]);
        break;
        
      default:
        console.log('StreamSynth - Real-time Data Stream Synthesizer');
        console.log('');
        console.log('Commands:');
        console.log('  run <file.dsl>    Run a pipeline from DSL file');
        console.log('  create <file.dsl> Create a new DSL template file');
        process.exit(0);
    }
  }
};

// Run CLI if this file is executed directly
if (require.main === module) {
  module.exports.run(process.argv.slice(2)).catch(console.error);
}