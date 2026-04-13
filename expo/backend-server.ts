import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import apiApp from './backend/hono';
import { initCourseTables, instancesStore, bookingsStore, coursesStore } from './backend/courses/storage';
import { generateUpcomingInstances, expireSchedules } from './backend/courses/generate';
import { sendPushToUser } from './backend/push/send';
import { formatDateTimeDe } from './backend/courses/rules';

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

// Schutz gegen Doppel-Registrierung bei Hot-Reload (Dev)
const globalAny = globalThis as any;
if (globalAny.__courseCronRegistered) {
  clearTimeout(globalAny.__courseCronTimeout);
  clearInterval(globalAny.__courseCronInterval);
}
globalAny.__courseCronRegistered = true;

// Initialize course tables (after storage.ts has connected the pool)
setTimeout(() => {
  initCourseTables()
    .then(() => generateUpcomingInstances().catch(err => console.log('[Cron] initial generate failed:', err)))
    .catch(err => console.log('[Courses] init failed:', err));
}, 2000);

// Cron: daily instance generation (03:00 Europe/Berlin)
async function runDailyGeneration() {
  try {
    await generateUpcomingInstances();
    await expireSchedules();
  } catch (err) { console.log('[Cron] daily generation failed:', err); }
}
function scheduleDaily() {
  const now = new Date();
  const berlinNowStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(now);
  const [bh, bm] = berlinNowStr.split(':').map(Number);
  const minutesNow = bh * 60 + bm;
  const targetMin = 3 * 60;
  const minutesUntil = (targetMin - minutesNow + 24 * 60) % (24 * 60) || 24 * 60;
  globalAny.__courseCronTimeout = setTimeout(async () => {
    await runDailyGeneration();
    scheduleDaily();
  }, minutesUntil * 60 * 1000);
}
scheduleDaily();

// Cron: reminder every 5 minutes (großzügiges Fenster in remindersDue fängt Drift)
async function runReminders() {
  try {
    const due = await instancesStore.remindersDue();
    for (const { booking, instance, course } of due) {
      await sendPushToUser(booking.user_id, 'Kurs startet bald',
        `Dein Kurs ${course.name} findet bald statt! (${formatDateTimeDe(instance.start_time)})`,
        { type: 'reminder', instanceId: instance.id });
      await bookingsStore.markReminderSent(booking.id);
    }
  } catch (err) { console.log('[Cron] reminder failed:', err); }
}
globalAny.__courseCronInterval = setInterval(runReminders, 5 * 60 * 1000);

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