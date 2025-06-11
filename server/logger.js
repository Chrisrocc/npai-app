const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, 'npai.log');

const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  console.log(logMessage.trim());
  fs.appendFileSync(logFilePath, logMessage);
};

const logRequest = (req, res, next) => {
  try {
    const method = req?.method || 'UNKNOWN_METHOD';
    const url = req?.url || 'UNKNOWN_URL';
    const body = JSON.stringify(req?.body || {});
    log(`Incoming request: ${method} ${url} - Body: ${body}`);
  } catch (err) {
    log(`Error logging request: ${err.message}`);
  }
  next();
};

module.exports = { log, logRequest };
