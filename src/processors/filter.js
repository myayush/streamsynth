/**
 * Creates a filter processor
 * @param {Function} predicate - Function that returns true to keep events, false to filter them out
 * @returns {Object} Filter processor object
 */
function createFilter(predicate) {
    return {
      type: 'filter',
      process: (event) => {
        return predicate(event) ? event : null;
      }
    };
  }
  
  module.exports = createFilter;