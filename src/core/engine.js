const EventEmitter = require('events');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class Engine extends EventEmitter {
  constructor(pipeline) {
    super();
    this.pipeline = pipeline;
    this.buffer = [];
    this.spilloverPath = path.join(process.cwd(), '.streamsynth-spillover');
    this.spilloverFiles = [];
    this.source = null;
    this.sink = null;
  }

  async initialize() {
    // Create spillover directory if it doesn't exist
    await fs.ensureDir(this.spilloverPath);
    
    // Initialize source
    try {
      const sourceModule = require(`../connectors/sources`)[this.pipeline.sourceConfig.type];
      if (!sourceModule) {
        throw new Error(`Unknown source type: ${this.pipeline.sourceConfig.type}`);
      }
      
      this.source = sourceModule(this.pipeline.sourceConfig.config);
    } catch (error) {
      throw new Error(`Failed to initialize source: ${error.message}`);
    }
    
    // Initialize sink
    try {
      const sinkModule = require(`../connectors/sinks`)[this.pipeline.sinkConfig.type];
      if (!sinkModule) {
        throw new Error(`Unknown sink type: ${this.pipeline.sinkConfig.type}`);
      }
      
      this.sink = sinkModule(this.pipeline.sinkConfig.config);
    } catch (error) {
      throw new Error(`Failed to initialize sink: ${error.message}`);
    }
    
    // Setup source event listeners
    this.source.on('data', this.processEvent.bind(this));
    this.source.on('end', this.onSourceEnd.bind(this));
    this.source.on('error', this.onSourceError.bind(this));
  }

  async processEvent(event) {
    let result = event;
    let wasFiltered = false;
    
    // Apply each processor in the pipeline
    for (const processor of this.pipeline.processors) {
      if (!result) break;
      
      try {
        switch (processor.type) {
          case 'filter':
            if (!processor.predicate(result)) {
              result = null;
              wasFiltered = true;
            }
            break;
          case 'transform':
            result = processor.transformer(result);
            break;
          case 'aggregate':
            // Aggregation is more complex and handled separately
            this.buffer.push(result);
            if (this.shouldAggregate(processor.options)) {
              result = processor.aggregator(this.buffer);
              this.buffer = [];
            } else {
              result = null; // Skip sending to sink until aggregation is complete
            }
            break;
        }
      } catch (error) {
        this.emit('error', new Error(`Processor error: ${error.message}`));
        // Continue processing if one processor fails
      }
    }
    
    // If we have a result after processing, send to sink
    if (result) {
      await this.sendToSink(result);
    } else if (wasFiltered) {
      this.emit('filtered', event);
    }
    
    // Check if we need to spill buffer to disk
    try {
      await this.checkAndSpillBuffer();
    } catch (error) {
      this.emit('error', new Error(`Spillover error: ${error.message}`));
    }
  }
  
  shouldAggregate(options) {
    if (options.count && this.buffer.length >= options.count) return true;
    if (options.timeWindow) {
      const oldestEvent = this.buffer[0];
      const now = Date.now();
      if (now - oldestEvent.timestamp >= options.timeWindow) return true;
    }
    return false;
  }
  
  async sendToSink(event) {
    try {
      await this.sink.write(event);
      this.emit('processed', event);
    } catch (error) {
      this.emit('error', new Error(`Sink error: ${error.message}`));
    }
  }
  
  async checkAndSpillBuffer() {
    if (this.buffer.length > this.pipeline.bufferSize) {
      await fs.ensureDir(this.spilloverPath);
      
      const spilloverFile = path.join(this.spilloverPath, `spillover-${uuidv4()}.json`);
      const spillData = this.buffer.splice(0, this.buffer.length - this.pipeline.bufferSize);
      
      await fs.writeJson(spilloverFile, spillData);
      this.spilloverFiles.push(spilloverFile);
      this.emit('spillover', spilloverFile, spillData.length);
    }
  }
  
  async loadFromSpillover() {
    if (this.spilloverFiles.length === 0) return false;
    
    const file = this.spilloverFiles.shift();
    try {
      const data = await fs.readJson(file);
      this.buffer = [...data, ...this.buffer];
      await fs.remove(file);
      return true;
    } catch (error) {
      this.emit('error', new Error(`Spillover read error: ${error.message}`));
      return false;
    }
  }
  
  onSourceEnd() {
    // Process any remaining aggregations
    for (const processor of this.pipeline.processors) {
      if (processor.type === 'aggregate' && this.buffer.length > 0) {
        const result = processor.aggregator(this.buffer);
        this.buffer = [];
        if (result) {
          this.sendToSink(result).catch(err => this.emit('error', err));
        }
      }
    }
    
    this.emit('end');
  }
  
  onSourceError(error) {
    this.emit('error', error);
  }
  
  async start() {
    try {
      await this.initialize();
      if (this.source) {
        await this.source.start();
      }
      this.emit('started');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
  
  async stop() {
    try {
      if (this.source) {
        await this.source.stop();
      }
      
      if (this.sink) {
        await this.sink.close();
      }
      
      // Clean up spillover files
      for (const file of this.spilloverFiles) {
        try {
          if (fs.existsSync(file)) {
            await fs.remove(file);
          }
        } catch (error) {
          this.emit('error', error);
        }
      }
      
      // Clean up spillover directory if empty
      try {
        if (fs.existsSync(this.spilloverPath)) {
          const files = await fs.readdir(this.spilloverPath);
          if (files.length === 0) {
            await fs.remove(this.spilloverPath);
          }
        }
      } catch (error) {
        this.emit('error', error);
      }
      
      this.emit('stopped');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
}

module.exports = Engine;