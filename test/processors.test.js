const createFilter = require('../src/processors/filter');
const createTransformer = require('../src/processors/transform');
const createAggregator = require('../src/processors/aggregate');

describe('Processors', () => {
  describe('Filter', () => {
    test('Should pass through events that match predicate', () => {
      const filter = createFilter(event => event.value > 10);
      
      const event = { value: 15 };
      expect(filter.process(event)).toBe(event);
    });
    
    test('Should filter out events that do not match predicate', () => {
      const filter = createFilter(event => event.value > 10);
      
      const event = { value: 5 };
      expect(filter.process(event)).toBeNull();
    });
  });
  
  describe('Transformer', () => {
    test('Should transform events', () => {
      const transformer = createTransformer(event => ({
        id: event.id,
        doubled: event.value * 2
      }));
      
      const event = { id: 1, value: 5 };
      expect(transformer.process(event)).toEqual({
        id: 1,
        doubled: 10
      });
    });
  });
  
  describe('Aggregator', () => {
    test('Should aggregate by count', () => {
      const aggregator = createAggregator(
        { count: 3 },
        events => ({ sum: events.reduce((sum, e) => sum + e.value, 0) })
      );
      
      // First two events should not trigger aggregation
      expect(aggregator.process({ value: 1 })).toBeNull();
      expect(aggregator.process({ value: 2 })).toBeNull();
      
      // Third event should trigger aggregation
      expect(aggregator.process({ value: 3 })).toEqual({ sum: 6 });
    });
    
    test('Should flush remaining events', () => {
      const aggregator = createAggregator(
        { count: 3 },
        events => ({ sum: events.reduce((sum, e) => sum + e.value, 0) })
      );
      
      // Add two events
      aggregator.process({ value: 1 });
      aggregator.process({ value: 2 });
      
      // Flush should aggregate the two events
      expect(aggregator.flush()).toEqual({ sum: 3 });
    });
  });
});