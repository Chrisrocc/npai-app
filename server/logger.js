const fs = require('fs');
const path = require('path');

// Define the log file path
const logFilePath = path.join(__dirname, 'npai.log');

// Function to log messages to CMD and npai.log
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  console.log(logMessage.trim()); // Log to CMD
  fs.appendFileSync(logFilePath, logMessage); // Write to npai.log
};

// Middleware to log all incoming requests
const logRequest = (req, res, next) => {
  log(`Incoming request: ${req.method} ${req.url} - Body: ${JSON.stringify(req.body)}`);
  next();
};

module.exports = { log, logRequest };