import { Hono } from 'hono';

const app = new Hono();

// Healthcheck
app.get('/health', (c) => c.text('ok'));

export default app;
