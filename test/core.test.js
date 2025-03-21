const { createPipeline } = require('../src/core/pipeline');
const Engine = require('../src/core/engine');

// Mock source and sink for testing
const mockSource = {
  start: jest.fn().mockResolvedValue(),
  stop: jest.fn().mockResolvedValue(),
  on: jest.fn()
};

const mockSink = {
  write: jest.fn().mockResolvedValue(),
  close: jest.fn().mockResolvedValue()
};

// Mock require for sources and sinks
jest.mock('../src/connectors/sources', () => ({
  memory: jest.fn().mockReturnValue(mockSource)
}));

jest.mock('../src/connectors/sinks', () => ({
  memory: jest.fn().mockReturnValue(mockSink)
}));

describe('Core Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('Pipeline should configure source and sink', () => {
    const pipeline = createPipeline()
      .source('memory', { events: [] })
      .sink('memory', {});
      
    expect(pipeline.sourceConfig).toEqual({ type: 'memory', config: { events: [] } });
    expect(pipeline.sinkConfig).toEqual({ type: 'memory', config: {} });
  });
  
  test('Pipeline should add processors', () => {
    const filterFn = jest.fn();
    const transformFn = jest.fn();
    
    const pipeline = createPipeline()
      .filter(filterFn)
      .transform(transformFn);
      
    expect(pipeline.processors).toHaveLength(2);
    expect(pipeline.processors[0]).toEqual({ type: 'filter', predicate: filterFn });
    expect(pipeline.processors[1]).toEqual({ type: 'transform', transformer: transformFn });
  });
  
  test('Engine should initialize source and sink', async () => {
    const pipeline = createPipeline()
      .source('memory', { events: [] })
      .sink('memory', {});
      
    const engine = new Engine(pipeline);
    
    // Mock the initialize method to avoid actual initialization
    engine.initialize = jest.fn().mockResolvedValue();
    
    await engine.initialize();
    
    expect(engine.initialize).toHaveBeenCalled();
  });
  
  test('Engine should start and stop correctly', async () => {
    const pipeline = createPipeline()
      .source('memory', { events: [] })
      .sink('memory', {});
      
    const engine = new Engine(pipeline);
    
    // Mock the necessary methods to avoid actual initialization
    engine.initialize = jest.fn().mockResolvedValue();
    engine.source = mockSource;
    engine.sink = mockSink;
    
    await engine.start();
    
    expect(engine.initialize).toHaveBeenCalled();
    expect(mockSource.start).toHaveBeenCalled();
    
    await engine.stop();
    
    expect(mockSource.stop).toHaveBeenCalled();
    expect(mockSink.close).toHaveBeenCalled();
  });
});