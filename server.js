// Load environment variables
require('dotenv').config();

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'NodeNext',
    moduleResolution: 'NodeNext',
    allowImportingTsExtensions: true,
    strict: true
  }
});
const { serve } = require('@hono/node-server');
const { Hono } = require('hono');
const { serveStatic } = require('@hono/node-server/serve-static');
const path = require('path');
const fs = require('fs');
const apiApp = require('./backend/hono.ts').default;

const port = process.env.PORT || 3000;

// Create main app and mount API at /api
const app = new Hono();

// Mount the API app at /api
app.route('/api', apiApp);

// Serve static files from dist directory (web build)
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  // Serve static files for all non-API routes
  app.use('/*', serveStatic({ 
    root: './dist',
    index: 'index.html'
  }));
  console.log('📁 Serving web build from dist/');
} else {
  console.log('⚠️  No web build found. Run "bunx rork export -p web" to build for web.');
}

// Fallback for SPA routing - serve index.html for non-API routes
app.get('*', (c) => {
  const indexPath = path.join(process.cwd(), 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, 'utf8');
    return c.html(html);
  }
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