const { createPipeline } = require('../core/pipeline');

/**
 * Parses a pipeline DSL string and returns a configured pipeline
 * @param {string} dslString - DSL configuration string
 * @returns {Pipeline} Configured pipeline
 */
function parsePipeline(dslString) {
  const pipeline = createPipeline();
  const lines = dslString.trim().split('\n');
  
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    
    // Special handling for filter and transform which might contain complex expressions
    if (line.startsWith('filter(') || line.startsWith('transform(')) {
      const command = line.startsWith('filter') ? 'filter' : 'transform';
      const expression = line.substring(command.length).trim();
      
      if (command === 'filter') {
        // Extract predicate from filter(predicate)
        const predicateExpr = expression.substring(1, expression.length - 1);
        const predicate = new Function('event', `return ${predicateExpr};`);
        pipeline.filter(predicate);
      } else {
        // Extract transformer from transform(transformer)
        const transformExpr = expression.substring(1, expression.length - 1);
        const transformer = new Function('event', `return ${transformExpr};`);
        pipeline.transform(transformer);
      }
      continue;
    }
    
    // Parse other commands with a simpler pattern
    const match = line.match(/^(\w+)\s+(.+)$/);
    if (!match) {
      throw new Error(`Invalid DSL line: ${line}`);
    }
    
    const [, command, args] = match;
    
    // Handle source command
    if (command === 'source') {
      // Handle Kafka source
      if (args.startsWith('kafka(')) {
        const kafkaMatch = args.match(/kafka\(\s*{([^}]+)}\s*\)/);
        if (!kafkaMatch) {
          throw new Error(`Invalid Kafka source specification: ${args}`);
        }
        
        // Parse the JSON object inside the kafka() call
        try {
          const kafkaConfig = JSON.parse(`{${kafkaMatch[1]}}`);
          pipeline.source('kafka', kafkaConfig);
        } catch (error) {
          throw new Error(`Invalid Kafka configuration: ${error.message}`);
        }
      } else {
        // Existing file source handling
        const sourceMatch = args.match(/(\w+)\(["']([^"']+)["']\)/);
        if (!sourceMatch) {
          throw new Error(`Invalid source specification: ${args}`);
        }
        
        const [, sourceType, sourcePath] = sourceMatch;
        pipeline.source(sourceType, { path: sourcePath });
      }
    }
    
    // Handle sink command
    else if (command === 'sink') {
      // Handle Kafka sink
      if (args.startsWith('kafka(')) {
        const kafkaMatch = args.match(/kafka\(\s*{([^}]+)}\s*\)/);
        if (!kafkaMatch) {
          throw new Error(`Invalid Kafka sink specification: ${args}`);
        }
        
        // Parse the JSON object inside the kafka() call
        try {
          const kafkaConfig = JSON.parse(`{${kafkaMatch[1]}}`);
          pipeline.sink('kafka', kafkaConfig);
        } catch (error) {
          throw new Error(`Invalid Kafka configuration: ${error.message}`);
        }
      } else {
        // Existing file sink handling
        const sinkMatch = args.match(/(\w+)\(["']([^"']+)["']\)/);
        if (!sinkMatch) {
          throw new Error(`Invalid sink specification: ${args}`);
        }
        
        const [, sinkType, sinkPath] = sinkMatch;
        pipeline.sink(sinkType, { path: sinkPath });
      }
    }
    
    // Handle buffer size command
    else if (command === 'bufferSize') {
      const sizeMatch = args.match(/(\d+)/);
      if (!sizeMatch) {
        throw new Error(`Invalid buffer size: ${args}`);
      }
      
      pipeline.setBufferSize(parseInt(sizeMatch[1], 10));
    }
    
    else {
      throw new Error(`Unknown command: ${command}`);
    }
  }
  
  return pipeline;
}

module.exports = {
  parsePipeline
};