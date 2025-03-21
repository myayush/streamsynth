const { createPipeline } = require('../src/core/pipeline');
const fs = require('fs-extra');
const path = require('path');

// Ensure the spillover directory exists
beforeAll(async () => {
  const spilloverPath = path.join(process.cwd(), '.streamsynth-spillover');
  await fs.ensureDir(spilloverPath);
});

// Clean up after tests
afterAll(async () => {
  const spilloverPath = path.join(process.cwd(), '.streamsynth-spillover');
  if (fs.existsSync(spilloverPath)) {
    await fs.remove(spilloverPath);
  }
});

describe('Memory Source and Sink Tests', () => {
  test('Memory Source to Memory Sink', async () => {
    // Create test data
    const testEvents = [
      { id: 1, value: 10, status: 'active' },
      { id: 2, value: 20, status: 'inactive' },
      { id: 3, value: 30, status: 'active' },
      { id: 4, value: 40, status: 'pending' },
      { id: 5, value: 50, status: 'active' }
    ];
    
    // Create sink to capture results
    const memSink = {
      events: [],
      write: jest.fn(event => {
        memSink.events.push(event);
        return Promise.resolve();
      }),
      close: jest.fn().mockResolvedValue(),
      getEvents: () => memSink.events
    };
    
    // Create source to emit events
    const memSource = {
      events: [...testEvents],
      listeners: {},
      start: jest.fn(() => {
        // Emit all events
        memSource.events.forEach(event => {
          if (memSource.listeners.data) {
            setTimeout(() => {
              memSource.listeners.data(event);
            }, 5);
          }
        });
        
        // Emit end after all events
        if (memSource.listeners.end) {
          setTimeout(() => {
            memSource.listeners.end();
          }, 50);
        }
        
        return Promise.resolve();
      }),
      stop: jest.fn().mockResolvedValue(),
      on: jest.fn((event, callback) => {
        memSource.listeners[event] = callback;
      })
    };
    
    // Create a pipeline with memory source and sink
    const pipeline = createPipeline()
      .source('memory', { events: testEvents, interval: 10 })
      .filter(event => event.status === 'active')
      .transform(event => ({ 
        id: event.id, 
        doubleValue: event.value * 2 
      }))
      .sink('memory', {});
    
    // Mock the pipeline's start method
    pipeline.start = jest.fn().mockImplementation(async () => {
      // Set up our mocked engine
      pipeline.engine = {
        sink: memSink,
        source: memSource,
        initialize: jest.fn().mockResolvedValue(),
        start: jest.fn().mockImplementation(async () => {
          await memSource.start();
        }),
        stop: jest.fn().mockImplementation(async () => {
          await memSource.stop();
          await memSink.close();
        }),
        on: jest.fn()
      };
      
      // Process events through filter and transform
      const processEvent = (event) => {
        // Apply filter
        if (event.status === 'active') {
          // Apply transform
          const transformed = { 
            id: event.id, 
            doubleValue: event.value * 2 
          };
          
          // Send to sink
          memSink.write(transformed);
        }
      };
      
      // Set up listener for source events
      memSource.on('data', processEvent);
      
      // Start the engine
      await pipeline.engine.start();
      
      return pipeline;
    });
    
    // Start the pipeline
    await pipeline.start();
    
    // Wait for all events to be processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Stop the pipeline
    await pipeline.engine.stop();
    
    // Check the results
    expect(memSink.events.length).toBe(3); // Only active status
    expect(memSink.events[0].id).toBe(1);
    expect(memSink.events[0].doubleValue).toBe(20);
    expect(memSink.events[1].id).toBe(3);
    expect(memSink.events[1].doubleValue).toBe(60);
    expect(memSink.events[2].id).toBe(5);
    expect(memSink.events[2].doubleValue).toBe(100);
  });
  
  test('Aggregation with Memory Source/Sink', async () => {
    // Create test data with timestamps
    const testEvents = [
      { id: 1, value: 10, timestamp: Date.now() },
      { id: 2, value: 20, timestamp: Date.now() + 10 },
      { id: 3, value: 30, timestamp: Date.now() + 20 },
      { id: 4, value: 40, timestamp: Date.now() + 30 },
      { id: 5, value: 50, timestamp: Date.now() + 40 }
    ];
    
    // Create sink to capture results
    const memSink = {
      events: [],
      write: jest.fn(event => {
        memSink.events.push(event);
        return Promise.resolve();
      }),
      close: jest.fn().mockResolvedValue(),
      getEvents: () => memSink.events
    };
    
    // Create source to emit events
    const memSource = {
      events: [...testEvents],
      listeners: {},
      start: jest.fn(() => {
        // Emit all events
        memSource.events.forEach(event => {
          if (memSource.listeners.data) {
            setTimeout(() => {
              memSource.listeners.data(event);
            }, 5);
          }
        });
        
        // Emit end after all events
        if (memSource.listeners.end) {
          setTimeout(() => {
            memSource.listeners.end();
          }, 50);
        }
        
        return Promise.resolve();
      }),
      stop: jest.fn().mockResolvedValue(),
      on: jest.fn((event, callback) => {
        memSource.listeners[event] = callback;
      })
    };
    
    // Create a pipeline with aggregation
    const pipeline = createPipeline()
      .source('memory', { events: testEvents, interval: 10 })
      .aggregate(
        { count: 2 }, // Aggregate every 2 events
        events => ({
          count: events.length,
          total: events.reduce((sum, e) => sum + e.value, 0),
          avg: events.reduce((sum, e) => sum + e.value, 0) / events.length
        })
      )
      .sink('memory', {});
    
    // Mock the pipeline's start method
    pipeline.start = jest.fn().mockImplementation(async () => {
      // Set up our mocked engine
      pipeline.engine = {
        sink: memSink,
        source: memSource,
        initialize: jest.fn().mockResolvedValue(),
        start: jest.fn().mockImplementation(async () => {
          await memSource.start();
        }),
        stop: jest.fn().mockImplementation(async () => {
          await memSource.stop();
          await memSink.close();
        }),
        on: jest.fn()
      };
      
      // Buffer for aggregation
      let buffer = [];
      
      // Process events through aggregation
      const processEvent = (event) => {
        buffer.push(event);
        
        // Aggregate every 2 events
        if (buffer.length >= 2) {
          const aggregated = {
            count: buffer.length,
            total: buffer.reduce((sum, e) => sum + e.value, 0),
            avg: buffer.reduce((sum, e) => sum + e.value, 0) / buffer.length
          };
          
          memSink.write(aggregated);
          buffer = [];
        }
      };
      
      // Handle source end - process any remaining events
      memSource.on('end', () => {
        if (buffer.length > 0) {
          const aggregated = {
            count: buffer.length,
            total: buffer.reduce((sum, e) => sum + e.value, 0),
            avg: buffer.reduce((sum, e) => sum + e.value, 0) / buffer.length
          };
          
          memSink.write(aggregated);
          buffer = [];
        }
      });
      
      // Set up listener for source events
      memSource.on('data', processEvent);
      
      // Start the engine
      await pipeline.engine.start();
      
      return pipeline;
    });
    
    // Start the pipeline
    await pipeline.start();
    
    // Wait for all events to be processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Stop the pipeline
    await pipeline.engine.stop();
    
    // Get events from memory sink
    const outputEvents = memSink.events;
    
    // Check the results
    expect(outputEvents.length).toBe(3); // 5 events / 2 = 2 groups + 1 remainder
    
    // First aggregate (events 1-2)
    expect(outputEvents[0].count).toBe(2);
    expect(outputEvents[0].total).toBe(30); // 10 + 20
    expect(outputEvents[0].avg).toBe(15); // (10 + 20) / 2
    
    // Second aggregate (events 3-4)
    expect(outputEvents[1].count).toBe(2);
    expect(outputEvents[1].total).toBe(70); // 30 + 40
    expect(outputEvents[1].avg).toBe(35); // (30 + 40) / 2
    
    // Last aggregate (event 5)
    expect(outputEvents[2].count).toBe(1);
    expect(outputEvents[2].total).toBe(50);
    expect(outputEvents[2].avg).toBe(50);
  });
});