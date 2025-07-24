const jwt = require('jsonwebtoken');
const { log } = require('../logger'); // Import logger.js

const authenticateToken = (req, res, next) => {
  log('info', `Middleware called for: ${req.path}`); // Use logger.js
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1] || req.headers['proxy-authorization']?.split(' ')[1];
  if (!token) {
    log('warn', `No token provided for request: ${req.path}`); // Will be filtered out
    return res.status(401).json({ message: 'Authentication required' });
  }
  try {
    log('info', `Environment: ${process.env.NODE_ENV}, Token: ${token}`); // Will be filtered out
    if (process.env.NODE_ENV === 'development' && token === 'mock-token-123') {
      req.user = { id: 'test-id', email: 'test@example.com' };
      return next();
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    log('warn', `Invalid token for request: ${req.path}`); // Will be filtered out
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

module.exports = authenticateToken;