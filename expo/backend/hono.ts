import { Hono } from 'hono';
import { trpcServer } from '@hono/trpc-server';
import { bodyLimit } from 'hono/body-limit';
import { appRouter } from './trpc/app-router.ts';
import { createContext } from './trpc/create-context.ts';
import { cors } from 'hono/cors';
import { apiRateLimit, loginRateLimit, aiGenerateRateLimit } from './middleware/rate-limit.ts';
import { initCourseTables } from './courses/storage.ts';

initCourseTables()
  .then(() => console.log('[Courses] ✅ Course tables initialized'))
  .catch((err) => console.error('[Courses] ❌ Course table init failed:', err));

const app = new Hono();

// CORS middleware
app.use('/*', cors({
  origin: process.env.CORS_ORIGIN || '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Body size cap for tRPC mutations (raw iPhone photos up to ~10 MB; server resizes to <=400 KB)
app.use('/trpc/*', bodyLimit({
  maxSize: 10 * 1024 * 1024,
  onError: (c) => c.json({ error: 'Datei zu groß. Maximal 10 MB pro Anfrage.' }, 413),
}));

// Genereller Anti-Abuse-Backstop pro IP (vorher toter Code, nie eingehängt).
app.use('/trpc/*', apiRateLimit());

// Strengere Drosseln pro Endpunkt: teure KI-Generierung + Passwort-Reset-Pfade.
// (Login selbst wird pro E-Mail in routes/auth/login.ts gedrosselt, um Shared-IP-False-Positives zu vermeiden.)
const aiLimiter = aiGenerateRateLimit();
const authLimiter = loginRateLimit();
app.use('/trpc/*', async (c, next) => {
  const path = new URL(c.req.url).pathname;
  if (path.includes('plans.aiGenerate')) return aiLimiter(c, next);
  if (path.includes('auth.requestReset') || path.includes('auth.resetPassword') || path.includes('auth.requestTrainerReset')) {
    return authLimiter(c, next);
  }
  return next();
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
