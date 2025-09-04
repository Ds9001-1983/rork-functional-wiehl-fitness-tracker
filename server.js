// Load environment variables
require('dotenv').config();

require('ts-node/register');
const { serve } = require('@hono/node-server');
const { Hono } = require('hono');
const apiApp = require('./backend/hono.ts').default;

const port = process.env.PORT || 3000;

// Create main app and mount API at /api
const app = new Hono();

// Mount the API app at /api
app.route('/api', apiApp);

// Add a root health check
app.get('/', (c) => {
  return c.json({ 
    status: 'ok', 
    message: 'Fitness App Server',
    api: '/api',
    trpc: '/api/trpc'
  });
});

// Add health check at root level for nginx
app.get('/health', (c) => {
  return c.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

console.log(`🚀 Server starting on port ${port}`);
console.log(`📊 Environment: ${process.env.NODE_ENV}`);
console.log(`🔗 CORS Origin: ${process.env.CORS_ORIGIN}`);
console.log(`💾 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);

serve({
  fetch: app.fetch,
  port: port,
}, (info) => {
  console.log(`✅ Server is running on http://localhost:${info.port}`);
  console.log(`🌐 API available at http://localhost:${info.port}/api`);
  console.log(`🔧 tRPC endpoint: http://localhost:${info.port}/api/trpc`);
  console.log(`🏥 Health check: http://localhost:${info.port}/health`);
});