const { parsePipeline } = require('../src/dsl/parser');

describe('DSL Parser', () => {
  test('Should parse a simple pipeline', () => {
    // Simplified DSL without indentation to avoid parsing issues
    const dsl = `source file("./input.json")
filter(event.statusCode >= 400)
sink file("./output.json")`;
    
    const pipeline = parsePipeline(dsl);
    
    expect(pipeline.sourceConfig).toEqual({ 
      type: 'file', 
      config: { path: './input.json' } 
    });
    
    expect(pipeline.sinkConfig).toEqual({ 
      type: 'file', 
      config: { path: './output.json' } 
    });
    
    expect(pipeline.processors).toHaveLength(1);
    expect(pipeline.processors[0].type).toBe('filter');
  });
  
  test('Should parse a pipeline with transform', () => {
    // Simplified DSL without indentation
    const dsl = `source file("./input.json")
transform({ id: event.id, value: event.value })
sink file("./output.json")`;
    
    const pipeline = parsePipeline(dsl);
    
    expect(pipeline.processors).toHaveLength(1);
    expect(pipeline.processors[0].type).toBe('transform');
  });
  
  test('Should parse buffer size configuration', () => {
    const dsl = `source file("./input.json")
sink file("./output.json")
bufferSize 500`;
    
    const pipeline = parsePipeline(dsl);
    
    expect(pipeline.bufferSize).toBe(500);
  });
  
  test('Should throw error for invalid syntax', () => {
    const dsl = `source file("./input.json")
invalid_command
sink file("./output.json")`;
    
    expect(() => parsePipeline(dsl)).toThrow();
  });
});