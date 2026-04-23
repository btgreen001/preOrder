const target = process.env.API_PROXY_TARGET || 'https://localhost:5124';

module.exports = {
  '/api': {
    target,
    secure: false,
    changeOrigin: true,
    logLevel: 'warn'
  }
};
