const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: true,
      onProxyReq: (proxyReq, req) => {
        console.log(`Proxying request: ${req.method} ${req.url} at ${new Date().toISOString()}`);
      },
    })
  );
};