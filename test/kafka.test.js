// Mock the kafkajs module
jest.mock('kafkajs', () => {
    const mockConsumer = {
      connect: jest.fn().mockResolvedValue(),
      subscribe: jest.fn().mockResolvedValue(),
      run: jest.fn().mockImplementation(({ eachMessage }) => {
        // Store the message handler for later use
        mockConsumer.messageHandler = eachMessage;
        return Promise.resolve();
      }),
      disconnect: jest.fn().mockResolvedValue()
    };
    
    const mockProducer = {
      connect: jest.fn().mockResolvedValue(),
      send: jest.fn().mockResolvedValue({ 
        successful: true,
        topics: [{ 
          name: 'test-topic',
          partitions: [{ partition: 0, baseOffset: '0' }]
        }]
      }),
      disconnect: jest.fn().mockResolvedValue()
    };
    
    return {
      Kafka: jest.fn().mockImplementation(() => ({
        consumer: jest.fn().mockReturnValue(mockConsumer),
        producer: jest.fn().mockReturnValue(mockProducer)
      })),
      CompressionTypes: {
        GZIP: 2
      },
      mockConsumer,
      mockProducer
    };
  });
  
  const KafkaSource = require('../src/connectors/kafka/kafka-source');
  const KafkaSink = require('../src/connectors/kafka/kafka-sink');
  
  // Import the mocked kafkajs for direct access to mocks
  const { mockConsumer, mockProducer } = require('kafkajs');
  
  describe('Kafka Connectors', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    
    describe('KafkaSource', () => {
      test('Should initialize and connect to Kafka', async () => {
        const source = KafkaSource({
          brokers: ['localhost:9092'],
          topic: 'test-topic',
          groupId: 'test-group'
        });
        
        await source.initialize();
        
        expect(mockConsumer.connect).toHaveBeenCalled();
        expect(mockConsumer.subscribe).toHaveBeenCalledWith({
          topic: 'test-topic',
          fromBeginning: false
        });
      });
      
      test('Should start consuming messages', async () => {
        const source = KafkaSource({
          brokers: ['localhost:9092'],
          topic: 'test-topic'
        });
        
        const messageCallback = jest.fn();
        source.on('data', messageCallback);
        
        await source.start();
        
        // Simulate receiving a message
        await mockConsumer.messageHandler({
          topic: 'test-topic',
          partition: 0,
          message: {
            value: Buffer.from(JSON.stringify({ value: 123 })),
            offset: '0',
            timestamp: '1617304725123'
          }
        });
        
        expect(messageCallback).toHaveBeenCalledWith(expect.objectContaining({
          value: 123,
          _kafka: expect.any(Object)
        }));
      });
      
      test('Should handle non-JSON messages', async () => {
        const source = KafkaSource({
          brokers: ['localhost:9092'],
          topic: 'test-topic'
        });
        
        const messageCallback = jest.fn();
        const metadataCallback = jest.fn();
        source.on('data', messageCallback);
        source.on('metadata', metadataCallback);
        
        await source.start();
        
        // Simulate receiving a non-JSON message
        await mockConsumer.messageHandler({
          topic: 'test-topic',
          partition: 0,
          message: {
            value: Buffer.from('not json'),
            offset: '0',
            timestamp: '1617304725123'
          }
        });
        
        expect(messageCallback).toHaveBeenCalledWith('not json');
        expect(metadataCallback).toHaveBeenCalledWith(expect.objectContaining({
          topic: 'test-topic',
          partition: 0
        }));
      });
      
      test('Should stop consuming messages', async () => {
        const source = KafkaSource({
          brokers: ['localhost:9092'],
          topic: 'test-topic'
        });
        
        await source.start();
        await source.stop();
        
        expect(mockConsumer.disconnect).toHaveBeenCalled();
      });
    });
    
    describe('KafkaSink', () => {
      test('Should initialize and connect to Kafka', async () => {
        const sink = KafkaSink({
          brokers: ['localhost:9092'],
          topic: 'test-topic'
        });
        
        await sink.initialize();
        
        expect(mockProducer.connect).toHaveBeenCalled();
      });
      
      test('Should send messages to Kafka', async () => {
        const sink = KafkaSink({
          brokers: ['localhost:9092'],
          topic: 'test-topic'
        });
        
        await sink.initialize();
        await sink.write({ value: 123 });
        
        expect(mockProducer.send).toHaveBeenCalledWith(expect.objectContaining({
          topic: 'test-topic',
          messages: [{ value: JSON.stringify({ value: 123 }) }]
        }));
      });
      
      test('Should handle string messages', async () => {
        const sink = KafkaSink({
          brokers: ['localhost:9092'],
          topic: 'test-topic'
        });
        
        await sink.initialize();
        await sink.write('string message');
        
        // Check that the message was sent correctly
        const callArg = mockProducer.send.mock.calls[0][0];
        expect(callArg.topic).toBe('test-topic');
        expect(callArg.messages[0].value).toBe('string message');
      });
      
      test('Should close the connection', async () => {
        const sink = KafkaSink({
          brokers: ['localhost:9092'],
          topic: 'test-topic'
        });
        
        await sink.initialize();
        await sink.close();
        
        expect(mockProducer.disconnect).toHaveBeenCalled();
      });
    });
  });