import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import apiApp from './backend/hono';

// Load environment variables
const port = parseInt(process.env.BACKEND_PORT || '3000');
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
    const path = c.req.path;
    // Skip static serving for API routes and health check
    if (path.startsWith('/api') || path === '/health') {
      return next();
    }
    return serveStatic({ 
      root: './web-build'
    })(c, next);
  });
  console.log('📁 Serving web build from web-build/');
} else {
  console.log('⚠️  No web build found. Run "bunx expo export --platform web" to build for web.');
}

// Fallback for SPA routing - serve index.html only for non-API routes
app.get('*', (c) => {
  const path = c.req.path;
  // Don't intercept API routes
  if (path.startsWith('/api') || path === '/health') {
    return c.json({ 
      status: 'error', 
      message: 'API route not found',
      requestedPath: path
    });
  }
  
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
console.log(`✅ Server is running on http://localhost:${port}`);
console.log(`🌐 API available at http://localhost:${port}/api`);
console.log(`🔧 tRPC endpoint: http://localhost:${port}/api/trpc`);
console.log(`🏥 Health check: http://localhost:${port}/health`);

export default {
  port,
  fetch: app.fetch
};