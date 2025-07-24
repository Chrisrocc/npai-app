const { log } = require('./logger'); // Import logger.js

const telegramLogger = (message, type = 'info') => {
  let logMessage;

  // Handle different log types with the new format
  switch (type.toLowerCase()) {
    case 'new_message':
      logMessage = `New Message\n${message}`;
      break;
    case 'category':
    case 'identification':
    case 'action':
      logMessage = message;
      break;
    case 'spacer':
      logMessage = '';
      break;
    default:
      logMessage = `[TELEGRAM] ${message}`;
  }

  // Use logger.js to log with 'telegram' level
  log('telegram', logMessage);
};

module.exports = telegramLogger;