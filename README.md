# StreamSynth

A lightweight, high-performance framework for real-time data stream processing.

## Overview

StreamSynth enables seamless processing of data streams with minimal latency. It provides memory-safe operations, versatile connectors, and flexible configuration options for modern data pipelines.

## Installation

```bash
npm install streamsynth  
```

## Usage

### JavaScript API

```javascript
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

```javascript
const { parsePipeline } = require('streamsynth');  

const pipeline = parsePipeline(  
  source file("./logs/access.log")  
  filter(event.statusCode >= 400)  
  transform({code: event.statusCode, url: event.url})  
  sink file("./errors.json")  
);  

pipeline.start();  
```

## Usage Scenario: E-commerce Website Monitoring

For an e-commerce platform processing thousands of transactions hourly, StreamSynth can be used to:

* Monitor purchase events from website logs in real-time
* Filter for failed transactions (payment declined, timeout, etc.)
* Transform data into actionable insights (failure rate by payment provider)
* Send alerts when failure rates exceed thresholds
* Store processed data for trend analysis

```javascript
// E-commerce transaction monitoring  
const pipeline = createPipeline()  
  .source('file', { path: './logs/transactions.log' })  
  .filter(event => event.status === 'failed')  
  .transform(event => ({  
    orderId: event.id,  
    amount: event.amount,  
    paymentProvider: event.provider,  
    errorCode: event.errorCode,  
    timestamp: new Date(event.timestamp)  
  }))  
  .aggregate(  
    { timeWindow: 300000 }, // 5-minute window  
    events => {  
      const providers = {};  
      events.forEach(e => {  
        providers[e.paymentProvider] = (providers[e.paymentProvider] || 0) + 1;  
      });  
      return {  
        period: new Date().toISOString(),  
        totalFailures: events.length,  
        byProvider: providers  
      };  
    }  
  )  
  .sink('console', { format: 'json' });  

pipeline.start();  
```

## Key Features

* High-volume processing with minimal latency
* Memory-safe operation with disk spillover for handling large datasets
* Multiple connectors: File, HTTP, Memory, Console
* Streamlined data processing: Filter, Transform, Aggregate
* Command-line interface for running DSL pipelines directly

## License

MIT
