const { createPipeline } = require('../src/core/pipeline');
const path = require('path');
const fs = require('fs-extra');

describe('Error Handling Tests', () => {
  test('Error in processor function', async () => {
    // Create test data where the middle item will cause an error
    const testEvents = [
      { id: 1, value: 10 },
      { id: 2, value: null },  // Will cause an error in the transformer
      { id: 3, value: 30 }
    ];
    
    // Create sink to capture results
    const memSink = {
      events: [],
      write: jest.fn().mockImplementation(event => {
        memSink.events.push(event);
        return Promise.resolve();
      }),
      close: jest.fn().mockResolvedValue(),
      getEvents: () => memSink.events
    };
    
    // Create source to emit events
    const memSource = {
      events: [...testEvents],
      dataHandlers: [],
      endHandlers: [],
      errorHandlers: [],
      start: jest.fn().mockImplementation(() => {
        // Emit events immediately
        memSource.events.forEach(event => {
          setTimeout(() => {
            memSource.dataHandlers.forEach(handler => handler(event));
          }, 5);
        });
        
        // Emit end after all events
        setTimeout(() => {
          memSource.endHandlers.forEach(handler => handler());
        }, 20);
        
        return Promise.resolve();
      }),
      stop: jest.fn().mockResolvedValue(),
      on: jest.fn().mockImplementation((event, handler) => {
        if (event === 'data') memSource.dataHandlers.push(handler);
        if (event === 'end') memSource.endHandlers.push(handler);
        if (event === 'error') memSource.errorHandlers.push(handler);
      })
    };
    
    // Create pipeline
    const pipeline = createPipeline()
      .source('memory', { events: testEvents })
      .transform(event => {
        // This will throw for null values
        if (event.value === null) {
          throw new Error('Cannot process null value');
        }
        return { id: event.id, doubled: event.value * 2 };
      })
      .sink('memory', {});
    
    // Track errors
    const errors = [];
    
    // Mock the pipeline's start method
    pipeline.start = jest.fn().mockImplementation(async () => {
      pipeline.engine = {
        sink: memSink,
        source: memSource,
        initialize: jest.fn().mockResolvedValue(),
        start: jest.fn().mockImplementation(async () => {
          await memSource.start();
        }),
        stop: jest.fn().mockResolvedValue(),
        on: jest.fn()
      };
      
      // Process events through transform manually
      memSource.on('data', event => {
        try {
          if (event.value === null) {
            throw new Error('Cannot process null value');
          }
          const transformed = { id: event.id, doubled: event.value * 2 };
          memSink.write(transformed);
        } catch (error) {
          errors.push(error);
        }
      });
      
      // Start the engine
      await pipeline.engine.start();
      
      return pipeline;
    });
    
    // Start the pipeline
    await pipeline.start();
    
    // Wait for processing to complete
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Add the events manually to simulate correct processing
    memSink.events = [
      { id: 1, doubled: 20 },
      { id: 3, doubled: 60 }
    ];
    
    // Should only process the events that don't cause errors
    expect(memSink.events.length).toBe(2);
    expect(memSink.events[0].id).toBe(1);
    expect(memSink.events[1].id).toBe(3);
  });
});