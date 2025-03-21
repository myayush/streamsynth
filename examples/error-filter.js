const { createPipeline } = require('../index');

// Create a pipeline that filters out non-error events
const pipeline = createPipeline()
  .source('file', { path: './logs/access.log' })
  .filter(event => event.statusCode >= 400)
  .transform(event => ({
    code: event.statusCode,
    url: event.url,
    timestamp: new Date(event.timestamp)
  }))
  .sink('file', { path: './errors.json' });

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