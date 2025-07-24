const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const logFilePath = path.join(__dirname, 'npai.log');

// Simple log levels with chalk colors
const logLevels = {
  debug: chalk.gray,
  info: chalk.blue,
  warn: chalk.yellow,
  error: chalk.red,
  telegram: chalk.green,
};

const log = (level, message) => {
  // Filter logs: only allow [TELEGRAM] or specific [INFO] logs
  if (
    level === 'telegram' ||
    (level === 'info' &&
      (message.includes('Incoming request') || message.includes('Middleware called')))
  ) {
    const colorFn = logLevels[level] || chalk.white;
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - [${level.toUpperCase()}] ${message}\n`;
    console.log(colorFn(logMessage.trim()));
    fs.appendFileSync(logFilePath, logMessage);
  }
};

const logRequest = (req, res, next) => {
  // Skip logging for frequent endpoints to reduce clutter
  const skippedPaths = ['/api/cars', '/api/plans', '/api/manualverifications'];
  if (skippedPaths.includes(req.path)) {
    return next(); // Skip logging
  }

  try {
    const method = req?.method || 'UNKNOWN_METHOD';
    const url = req?.url || 'UNKNOWN_URL';
    const body = JSON.stringify(req?.body || {});
    log('info', `Incoming request: ${method} ${url} - Body: ${body}`);
  } catch (err) {
    log('error', `Error logging request: ${err.message}`);
  }
  next();
};

module.exports = { log, logRequest };