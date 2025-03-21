const { Kafka, CompressionTypes } = require('kafkajs');

class KafkaSink {
  constructor(config) {
    if (!config.brokers) {
      throw new Error('Kafka sink requires brokers configuration');
    }
    
    if (!config.topic) {
      throw new Error('Kafka sink requires a topic configuration');
    }
    
    this.config = {
      clientId: 'streamsynth-producer',
      compression: CompressionTypes.GZIP,
      acks: 1, // 1 = leader acknowledgment
      ...config
    };
    
    this.producer = null;
  }
  
  async initialize() {
    try {
      const kafka = new Kafka({
        clientId: this.config.clientId,
        brokers: this.config.brokers,
        ssl: this.config.ssl,
        sasl: this.config.sasl
      });
  
      this.producer = kafka.producer({
        allowAutoTopicCreation: true,
        transactionTimeout: 30000
      });
      
      await this.producer.connect();
      return true;
    } catch (error) {
      console.error('Failed to initialize Kafka producer', error);
      return false;
    }
  }
  
  async write(event) {
    if (!this.producer) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize Kafka producer');
      }
    }
    
    try {
      let value;
      
      // Handle string messages directly
      if (typeof event === 'string') {
        value = event;
      } else {
        // Remove internal Kafka metadata if present
        const eventCopy = { ...event };
        delete eventCopy._kafka;
        value = JSON.stringify(eventCopy);
      }
      
      await this.producer.send({
        topic: this.config.topic,
        compression: this.config.compression,
        acks: this.config.acks,
        messages: [{ value }]
      });
      
      return true;
    } catch (error) {
      console.error('Failed to send message to Kafka', error);
      throw error;
    }
  }
  
  async close() {
    if (this.producer) {
      try {
        await this.producer.disconnect();
        this.producer = null;
      } catch (error) {
        console.error('Error disconnecting from Kafka', error);
      }
    }
  }
}

module.exports = (config) => new KafkaSink(config);