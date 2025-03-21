const EventEmitter = require('events');
const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');
const kafkaSource = require('./kafka/kafka-source');

class Source extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
  }
  
  start() {
    throw new Error('Not implemented');
  }
  
  stop() {
    throw new Error('Not implemented');
  }
}

class FileSource extends Source {
  constructor(config) {
    super(config);
    if (!config.path) {
      throw new Error('File source requires a path');
    }
    this.filePath = path.resolve(config.path);
    this.streaming = false;
  }
  
  async start() {
    try {
      await fs.access(this.filePath);
      this.streaming = true;
      
      const fileStream = fs.createReadStream(this.filePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });
      
      rl.on('line', (line) => {
        try {
          const event = JSON.parse(line);
          this.emit('data', event);
        } catch (error) {
          this.emit('error', new Error(`Failed to parse line: ${line}`));
        }
      });
      
      rl.on('close', () => {
        this.streaming = false;
        this.emit('end');
      });
      
      fileStream.on('error', (error) => {
        this.streaming = false;
        this.emit('error', error);
      });
      
    } catch (error) {
      this.emit('error', error);
    }
  }
  
  async stop() {
    this.streaming = false;
  }
}

class HttpSource extends Source {
  constructor(config) {
    super(config);
    if (!config.url) {
      throw new Error('HTTP source requires a URL');
    }
    this.url = config.url;
    this.interval = config.interval || 1000;
    this.running = false;
    this.timer = null;
  }
  
  async start() {
    this.running = true;
    this.poll();
  }
  
  async poll() {
    if (!this.running) return;
    
    try {
      const response = await fetch(this.url);
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const data = await response.json();
      this.emit('data', data);
    } catch (error) {
      this.emit('error', error);
    }
    
    this.timer = setTimeout(() => this.poll(), this.interval);
  }
  
  async stop() {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

// Memory source for testing and programmatic use
class MemorySource extends Source {
  constructor(config) {
    super(config);
    this.events = config.events || [];
    this.index = 0;
    this.interval = config.interval || 10;
    this.running = false;
    this.timer = null;
  }
  
  async start() {
    this.running = true;
    this.sendNext();
  }
  
  sendNext() {
    if (!this.running || this.index >= this.events.length) {
      this.emit('end');
      return;
    }
    
    this.emit('data', this.events[this.index++]);
    this.timer = setTimeout(() => this.sendNext(), this.interval);
  }
  
  async stop() {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

module.exports = {
  file: (config) => new FileSource(config),
  http: (config) => new HttpSource(config),
  memory: (config) => new MemorySource(config),
  kafka: kafkaSource
};