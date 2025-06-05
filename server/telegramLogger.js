const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const logFilePath = path.join(__dirname, 'telegramMessages.log');

const telegramLogger = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  let logMessage;

  // Handle different log types with the new format
  switch (type.toLowerCase()) {
    case 'new_message':
      logMessage = `\nNew Message\n${message}\n`;
      break;
    case 'category':
    case 'identification':
    case 'action':
      logMessage = `${message}\n`;
      break;
    case 'spacer':
      logMessage = '\n';
      break;
    default:
      logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}\n`;
  }

  // Write to file
  fs.appendFileSync(logFilePath, logMessage);

  // Output to console with color based on type
  switch (type.toLowerCase()) {
    case 'new_message':
      console.log(chalk.cyan(logMessage));
      break;
    case 'category':
      console.log(chalk.yellow(logMessage));
      break;
    case 'identification':
      console.log(chalk.magenta(logMessage));
      break;
    case 'action':
      console.log(chalk.green(logMessage));
      break;
    case 'spacer':
      console.log(logMessage);
      break;
    case 'error':
      console.log(chalk.red(logMessage));
      break;
    default:
      console.log(logMessage);
  }
};

module.exports = telegramLogger;