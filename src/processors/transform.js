/**
 * Creates a transform processor
 * @param {Function} transformer - Function that transforms input events
 * @returns {Object} Transform processor object
 */
function createTransformer(transformer) {
    return {
      type: 'transform',
      process: (event) => {
        return transformer(event);
      }
    };
  }
  
  module.exports = createTransformer;