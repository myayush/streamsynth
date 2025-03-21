const { Kafka } = require('kafkajs');
const EventEmitter = require('events');

class KafkaSource extends EventEmitter {
  constructor(config) {
    super();
    
    if (!config.brokers) {
      throw new Error('Kafka source requires brokers configuration');
    }
    
    if (!config.topic) {
      throw new Error('Kafka source requires a topic configuration');
    }
    
    this.config = {
      clientId: 'streamsynth-consumer',
      groupId: 'streamsynth-group',
      fromBeginning: false,
      ...config
    };
    
    this.running = false;
    this.consumer = null;
  }
  
  async initialize() {
    try {
      const kafka = new Kafka({
        clientId: this.config.clientId,
        brokers: this.config.brokers,
        ssl: this.config.ssl,
        sasl: this.config.sasl
      });
  
      this.consumer = kafka.consumer({ groupId: this.config.groupId });
      await this.consumer.connect();
      
      // Subscribe to topic
      await this.consumer.subscribe({ 
        topic: this.config.topic, 
        fromBeginning: this.config.fromBeginning 
      });
      
      return true;
    } catch (error) {
      this.emit('error', error);
      return false;
    }
  }
  
  async start() {
    if (this.running) return;
    
    if (!this.consumer) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize Kafka consumer');
      }
    }
    
    try {
      this.running = true;
      
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            if (!this.running) return;
            
            const value = message.value.toString();
            let event;
            
            try {
              event = JSON.parse(value);
              
              // Add Kafka metadata to event object
              event._kafka = {
                topic,
                partition,
                offset: message.offset,
                timestamp: message.timestamp
              };
            } catch (parseError) {
              // If not valid JSON, pass as string with metadata separately
              event = value;
              // We'll emit metadata separately for string messages
              this.emit('metadata', {
                topic,
                partition,
                offset: message.offset,
                timestamp: message.timestamp
              });
            }
            
            this.emit('data', event);
          } catch (processingError) {
            this.emit('error', processingError);
          }
        }
      });
      
    } catch (error) {
      this.running = false;
      this.emit('error', error);
    }
  }
  
  async stop() {
    if (!this.running || !this.consumer) return;
    
    try {
      this.running = false;
      await this.consumer.disconnect();
      this.emit('end');
    } catch (error) {
      this.emit('error', error);
    }
  }
}

module.exports = (config) => new KafkaSource(config);