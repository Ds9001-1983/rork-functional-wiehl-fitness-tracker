import { Hono } from 'hono';
import { trpcServer } from '@hono/trpc-server';
import { appRouter } from './trpc/app-router';
import { createContext } from './trpc/create-context';
import { cors } from 'hono/cors';

const app = new Hono();

// CORS middleware
app.use('/*', cors({
  origin: process.env.CORS_ORIGIN || '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// tRPC handler
app.use('/api/trpc/*', trpcServer({
  router: appRouter,
  createContext: (opts: any) => createContext(opts),
  onError: ({ error, path }: { error: any; path: any }) => {
    console.error('[tRPC] Error on', path, ':', error);
  },
}));

// Healthcheck
app.get('/health', (c) => c.text('ok'));

// Root endpoint for debugging
app.get('/', (c) => {
  return c.json({
    message: 'Fitness App API',
    endpoints: {
      health: '/health',
      trpc: '/api/trpc',
    },
  });
});

export default app;
