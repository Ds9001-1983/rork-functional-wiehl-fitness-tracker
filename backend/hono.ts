import { Hono } from 'hono';
import { trpcServer } from '@hono/trpc-server';
import { appRouter } from './trpc/app-router.ts';
import { createContext } from './trpc/create-context.ts';
import { cors } from 'hono/cors';

const app = new Hono();

// CORS middleware
app.use('/*', cors({
  origin: process.env.CORS_ORIGIN || '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Debug middleware: log what URL reaches the tRPC handler
app.use('/trpc/*', async (c, next) => {
  console.log('[DEBUG-tRPC] raw URL:', c.req.raw.url);
  console.log('[DEBUG-tRPC] path:', c.req.path);
  console.log('[DEBUG-tRPC] method:', c.req.method);
  await next();
});

// tRPC handler (mounted under /api in backend-server.ts, so this becomes /api/trpc/*)
app.use('/trpc/*', trpcServer({
  router: appRouter,
  createContext: (opts: any) => createContext(opts),
  onError: ({ error, path }: { error: any; path: any }) => {
    console.error('[tRPC] Error on procedure:', path, error.message);
  },
  endpoint: '/api/trpc',  // Tell tRPC where it's mounted in the full URL path
}));

// Healthcheck
app.get('/health', (c) => c.text('ok'));

// Root endpoint for debugging
app.get('/', (c) => {
  return c.json({
    message: 'Fitness App API',
    endpoints: {
      health: '/health',
      trpc: '/trpc',
    },
  });
});

export default app;
