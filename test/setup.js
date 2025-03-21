// Setup file for Jest tests
const fs = require('fs-extra');
const path = require('path');

// Create test data directory if it doesn't exist
const testDataDir = path.join(__dirname, 'data');
fs.ensureDirSync(testDataDir);

// Create test output directory
const testOutputDir = path.join(testDataDir, 'output');
fs.ensureDirSync(testOutputDir);

// Create test input file
const testInputPath = path.join(testDataDir, 'test-input.json');
const testData = [
  {"timestamp": "2023-01-01T12:00:00Z", "url": "/home", "statusCode": 200},
  {"timestamp": "2023-01-01T12:01:00Z", "url": "/api/data", "statusCode": 404},
  {"timestamp": "2023-01-01T12:02:00Z", "url": "/login", "statusCode": 500},
  {"timestamp": "2023-01-01T12:03:00Z", "url": "/profile", "statusCode": 200},
  {"timestamp": "2023-01-01T12:04:00Z", "url": "/settings", "statusCode": 403}
];

// Write test data to file (one JSON object per line)
fs.writeFileSync(
  testInputPath, 
  testData.map(item => JSON.stringify(item)).join('\n')
);

// Ensure spillover directory exists
const spilloverPath = path.join(process.cwd(), '.streamsynth-spillover');
fs.ensureDirSync(spilloverPath);

// Clean up after tests
afterAll(async () => {
  try {
    // Remove spillover directory if it exists
    if (fs.existsSync(spilloverPath)) {
      await fs.remove(spilloverPath);
    }
    
    // Optionally clear output directory
    // await fs.emptyDir(testOutputDir);
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
});

module.exports = {
  testDataDir,
  testOutputDir,
  testInputPath,
  testData,
  spilloverPath
};