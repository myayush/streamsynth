const { createPipeline } = require('../index');

// Create a pipeline that polls an HTTP API
const pipeline = createPipeline()
  .source('http', { 
    url: 'https://api.example.com/data',
    interval: 5000 // Poll every 5 seconds
  })
  .filter(event => event.important === true)
  .transform(event => ({
    id: event.id,
    value: event.value,
    timestamp: new Date()
  }))
  .sink('console', { format: 'json' });

// Start the pipeline
pipeline.start()
  .then(() => console.log('Pipeline started'))
  .catch(error => console.error('Pipeline failed to start:', error));

// Handle shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await pipeline.stop();
  process.exit(0);
});