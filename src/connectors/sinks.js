const fs = require('fs-extra');
const path = require('path');
const kafkaSink = require('./kafka/kafka-sink');

class Sink {
  constructor(config) {
    this.config = config;
  }
  
  async write(event) {
    throw new Error('Not implemented');
  }
  
  async close() {
    throw new Error('Not implemented');
  }
}

class FileSink extends Sink {
  constructor(config) {
    super(config);
    if (!config.path) {
      throw new Error('File sink requires a path');
    }
    this.filePath = path.resolve(config.path);
    this.writeStream = null;
  }
  
  async initialize() {
    // Create directory if it doesn't exist
    await fs.ensureDir(path.dirname(this.filePath));
    
    // Create or open file for writing
    this.writeStream = fs.createWriteStream(this.filePath, { flags: 'a' });
  }
  
  async write(event) {
    if (!this.writeStream) {
      await this.initialize();
    }
    
    return new Promise((resolve, reject) => {
      this.writeStream.write(JSON.stringify(event) + '\n', (error) => {
        if (error) return reject(error);
        resolve();
      });
    });
  }
  
  async close() {
    return new Promise((resolve) => {
      if (!this.writeStream) return resolve();
      
      this.writeStream.end(() => {
        this.writeStream = null;
        resolve();
      });
    });
  }
}

class ConsoleSink extends Sink {
  constructor(config) {
    super(config);
    this.format = config.format || 'json';
  }
  
  async write(event) {
    if (this.format === 'json') {
      console.log(JSON.stringify(event, null, 2));
    } else {
      console.log(event);
    }
  }
  
  async close() {
    // Nothing to close
  }
}

class MemorySink extends Sink {
  constructor(config) {
    super(config);
    this.events = [];
    this.maxEvents = config.maxEvents || Number.MAX_SAFE_INTEGER;
  }
  
  async write(event) {
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }
  
  async close() {
    // Nothing to close
  }
  
  getEvents() {
    return [...this.events];
  }
}

module.exports = {
  file: (config) => new FileSink(config),
  console: (config) => new ConsoleSink(config),
  memory: (config) => new MemorySink(config),
  kafka: kafkaSink
};