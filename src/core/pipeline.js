const EventEmitter = require('events');
const Engine = require('./engine');

class Pipeline extends EventEmitter {
  constructor() {
    super();
    this.sourceConfig = null;
    this.sinkConfig = null;
    this.processors = [];
    this.running = false;
    this.bufferSize = 1000; // Default max buffer size
    this.engine = null;
  }

  source(type, config = {}) {
    this.sourceConfig = { type, config };
    return this;
  }

  sink(type, config = {}) {
    this.sinkConfig = { type, config };
    return this;
  }

  filter(predicate) {
    this.processors.push({ type: 'filter', predicate });
    return this;
  }

  transform(transformer) {
    this.processors.push({ type: 'transform', transformer });
    return this;
  }

  aggregate(options, aggregator) {
    this.processors.push({ type: 'aggregate', options, aggregator });
    return this;
  }

  setBufferSize(size) {
    this.bufferSize = size;
    return this;
  }

  async start() {
    if (this.running) return;
    if (!this.sourceConfig) throw new Error('No source configured');
    if (!this.sinkConfig) throw new Error('No sink configured');

    this.running = true;
    this.emit('starting');

    // Create and start the engine
    this.engine = new Engine(this);
    
    // Forward engine events
    this.engine.on('error', (err) => this.emit('error', err));
    this.engine.on('processed', (event) => this.emit('processed', event));
    this.engine.on('spillover', (file, count) => this.emit('spillover', file, count));
    this.engine.on('end', () => this.emit('end'));
    
    // Start the engine
    await this.engine.start();
    this.emit('started');
    
    return this;
  }

  async stop() {
    if (!this.running) return;
    this.running = false;
    this.emit('stopping');
    
    if (this.engine) {
      await this.engine.stop();
    }
    
    this.emit('stopped');
    return this;
  }
}

function createPipeline() {
  return new Pipeline();
}

module.exports = {
  Pipeline,
  createPipeline
};