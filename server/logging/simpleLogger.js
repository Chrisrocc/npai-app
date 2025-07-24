const { log } = require('./logger'); // Import logger.js

// Handy “typed” loggers
const stamp = (tag) =>
  `[${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })}] [${tag}]`;

module.exports = {
  api: (...m) => log('info', `${stamp('API')} ${m.join(' ')}`),
  python: (...m) => log('info', `${stamp('PYTHON')} ${m.join(' ')}`),
  db: (...m) => log('info', `${stamp('DB')} ${m.join(' ')}`),
  message: (...m) => log('info', `${stamp('MSG')} ${m.join(' ')}`),
  error: (...m) => log('error', `${stamp('ERROR')} ${m.join(' ')}`),
  raw: (tag, line) => log('info', `${stamp(tag)} ${line}`),
};