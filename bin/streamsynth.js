#!/usr/bin/env node

const { run } = require('../index');

// Handle CLI arguments
run(process.argv.slice(2)).catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});