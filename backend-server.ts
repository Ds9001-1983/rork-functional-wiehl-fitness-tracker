import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';
import apiApp from './backend/hono';

// Load environment variables
const port = parseInt(process.env.BACKEND_PORT || '3001');
console.log(`[Debug] BACKEND_PORT env var: ${process.env.BACKEND_PORT}`);
console.log(`[Debug] Final port: ${port}`);

// Create main app and mount API at /api
const app = new Hono();

// Add health check before any other routes
app.get('/health', (c) => {
  return c.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Mount the API app at /api
app.route('/api', apiApp);

// Serve static files from web-build directory (Expo web build)
const webBuildPath = join(process.cwd(), 'web-build');
if (existsSync(webBuildPath)) {
  // Serve static files for all non-API routes (exclude /api and /health)
  app.use('/*', (c, next) => {
    if (c.req.path.startsWith('/api') || c.req.path === '/health') {
      return next();
    }
    return serveStatic({ 
      root: './web-build',
      index: 'index.html'
    })(c, next);
  });
  console.log('📁 Serving web build from web-build/');
} else {
  console.log('⚠️  No web build found. Run "bunx expo export --platform web" to build for web.');
}

// Fallback for SPA routing - serve index.html for non-API routes
app.get('*', (c) => {
  const indexPath = join(process.cwd(), 'web-build', 'index.html');
  if (existsSync(indexPath)) {
    const html = readFileSync(indexPath, 'utf8');
    return c.html(html);
  }
  return c.json({ 
    status: 'ok', 
    message: 'Fitness App Server',
    api: '/api',
    trpc: '/api/trpc'
  });
});

console.log(`🚀 Server starting on port ${port}`);
console.log(`📊 Environment: ${process.env.NODE_ENV}`);
console.log(`🔗 CORS Origin: ${process.env.CORS_ORIGIN}`);
console.log(`💾 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);

serve({
  fetch: app.fetch,
  port: port,
  hostname: '0.0.0.0'
}, (info) => {
  console.log(`✅ Server is running on http://localhost:${info.port}`);
  console.log(`🌐 API available at http://localhost:${info.port}/api`);
  console.log(`🔧 tRPC endpoint: http://localhost:${info.port}/api/trpc`);
  console.log(`🏥 Health check: http://localhost:${info.port}/health`);
});