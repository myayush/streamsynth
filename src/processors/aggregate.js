/**
 * Creates an aggregator processor
 * @param {Object} options - Aggregation options
 * @param {number} [options.count] - Number of events to aggregate
 * @param {number} [options.timeWindow] - Time window in ms for aggregation
 * @param {Function} aggregator - Function that aggregates events
 * @returns {Object} Aggregator processor object
 */
function createAggregator(options, aggregator) {
    const buffer = [];
    let lastFlush = Date.now();
    
    return {
      type: 'aggregate',
      process: (event) => {
        buffer.push(event);
        
        // Check if we should aggregate
        const shouldAggregate = 
          (options.count && buffer.length >= options.count) ||
          (options.timeWindow && (Date.now() - lastFlush) >= options.timeWindow);
        
        if (shouldAggregate) {
          const result = aggregator([...buffer]);
          buffer.length = 0; // Clear buffer
          lastFlush = Date.now();
          return result;
        }
        
        return null; // Don't pass through until we aggregate
      },
      
      // Flush remaining events
      flush: () => {
        if (buffer.length === 0) return null;
        
        const result = aggregator([...buffer]);
        buffer.length = 0;
        return result;
      }
    };
  }
  
  module.exports = createAggregator;