# StreamSynth

StreamSynth is a lightweight, high-performance framework for real-time data stream processing with built-in memory safety and native Kafka integration. It enables seamless data transformation using an intuitive API or declarative DSL.

## Features
- ⚡ **High Performance**: Processes over 10K events/sec with <100ms latency.
- 🛡 **Memory Safe**: Prevents OOM errors with automatic disk spillover.
- 🔄 **Versatile Connectors**: Supports file, HTTP, in-memory, console, and Kafka.
- 🧮 **Powerful Processing**: Filter, transform, and aggregate data streams.
- 📝 **Flexible Configuration**: Use either the programmatic API or DSL.
- 🔌 **CLI Support**: Run pipelines directly from DSL files.

## Installation
```sh
npm install streamsynth
```

## Quick Start
### JavaScript API
```js
const { createPipeline } = require('streamsynth');

const pipeline = createPipeline()
  .source('file', { path: './logs/access.log' })
  .filter(event => event.statusCode >= 400)
  .transform(event => ({
    code: event.statusCode,
    url: event.url,
    timestamp: new Date(event.timestamp)
  }))
  .sink('file', { path: './errors.json' });

pipeline.start();
```

### DSL Configuration
```js
const { parsePipeline } = require('streamsynth');

const pipeline = parsePipeline(`
source file("./logs/access.log")
filter(event.statusCode >= 400)
transform({code: event.statusCode, url: event.url, timestamp: new Date(event.timestamp)})
sink file("./errors.json")
`);

pipeline.start();
```

## Real-World Use Case: Log Monitoring & Alerting
Easily monitor server logs for errors and send alerts when critical issues arise.
```js
const pipeline = createPipeline()
  .source('kafka', { brokers: ['kafka:9092'], topic: 'server-logs' })
  .filter(event => event.level === 'ERROR')
  .transform(event => ({
    service: event.service,
    message: event.message,
    timestamp: new Date(event.timestamp)
  }))
  .sink('http', { url: 'https://alerting-system.com/api/alerts' });

pipeline.start();
```

## Kafka Integration
```js
const pipeline = createPipeline()
  .source('kafka', { brokers: ['kafka:9092'], topic: 'input-events', groupId: 'my-consumer-group' })
  .filter(event => event.value > 100)
  .transform(event => ({
    originalValue: event.value,
    doubled: event.value * 2,
    timestamp: new Date().toISOString()
  }))
  .sink('kafka', { brokers: ['kafka:9092'], topic: 'processed-events' });

pipeline.start();
```

## Command-Line Usage
```sh
# Run a pipeline from a DSL file
npx streamsynth run pipeline.dsl

# Generate a DSL template file
npx streamsynth create template.dsl
```

## Memory Safety
StreamSynth ensures memory efficiency by:
- 🔄 **Automatic Spillover**: Prevents OOM errors by offloading excess data to disk.
- 🚀 **Optimized Buffering**: Default buffer size of 1000 events, configurable as needed.
- 🔁 **Smart Reloading**: Dynamically loads data back into memory when space is available.

## Contributing
Contributions are welcome! Feel free to submit a Pull Request.

## License
MIT

