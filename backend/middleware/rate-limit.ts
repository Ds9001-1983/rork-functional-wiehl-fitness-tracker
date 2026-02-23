import type { Context, Next } from 'hono';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitConfig {
  maxTokens: number;
  refillRate: number; // tokens per second
  refillInterval: number; // ms
}

const buckets = new Map<string, TokenBucket>();

// Clean up old buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.lastRefill > 300000) { // 5 minutes inactive
      buckets.delete(key);
    }
  }
}, 300000);

function getClientIP(c: Context): string {
  return c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    || c.req.header('x-real-ip')
    || 'unknown';
}

function checkLimit(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: config.maxTokens, lastRefill: now };
    buckets.set(key, bucket);
  }

  // Refill tokens
  const elapsed = now - bucket.lastRefill;
  const tokensToAdd = Math.floor(elapsed / config.refillInterval) * config.refillRate;
  if (tokensToAdd > 0) {
    bucket.tokens = Math.min(config.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  if (bucket.tokens > 0) {
    bucket.tokens--;
    return {
      allowed: true,
      remaining: bucket.tokens,
      resetMs: config.refillInterval,
    };
  }

  return {
    allowed: false,
    remaining: 0,
    resetMs: config.refillInterval - (now - bucket.lastRefill),
  };
}

// General API rate limiter: 100 requests per minute per IP
export function apiRateLimit() {
  return async (c: Context, next: Next) => {
    const path = new URL(c.req.url).pathname;

    // Skip health check
    if (path === '/health' || path === '/api/health') {
      return next();
    }

    const ip = getClientIP(c);
    const key = `api:${ip}`;
    const config: RateLimitConfig = {
      maxTokens: 100,
      refillRate: 100,
      refillInterval: 60000, // 1 minute
    };

    const result = checkLimit(key, config);

    c.header('X-RateLimit-Limit', '100');
    c.header('X-RateLimit-Remaining', result.remaining.toString());
    c.header('X-RateLimit-Reset', Math.ceil(result.resetMs / 1000).toString());

    if (!result.allowed) {
      c.header('Retry-After', Math.ceil(result.resetMs / 1000).toString());
      return c.json(
        { error: 'Too many requests. Please try again later.' },
        429
      );
    }

    return next();
  };
}

// Login rate limiter: 5 attempts per minute per IP
export function loginRateLimit() {
  return async (c: Context, next: Next) => {
    const ip = getClientIP(c);
    const key = `login:${ip}`;
    const config: RateLimitConfig = {
      maxTokens: 5,
      refillRate: 5,
      refillInterval: 60000,
    };

    const result = checkLimit(key, config);

    c.header('X-RateLimit-Limit', '5');
    c.header('X-RateLimit-Remaining', result.remaining.toString());

    if (!result.allowed) {
      c.header('Retry-After', Math.ceil(result.resetMs / 1000).toString());
      return c.json(
        { error: 'Zu viele Anmeldeversuche. Bitte warte eine Minute.' },
        429
      );
    }

    return next();
  };
}

// AI generation rate limiter: 5 per day per studio
export function aiGenerateRateLimit() {
  return async (c: Context, next: Next) => {
    const studioId = c.req.header('x-studio-id') || '1';
    const key = `ai:${studioId}`;
    const config: RateLimitConfig = {
      maxTokens: 5,
      refillRate: 5,
      refillInterval: 86400000, // 24 hours
    };

    const result = checkLimit(key, config);

    c.header('X-RateLimit-Limit', '5');
    c.header('X-RateLimit-Remaining', result.remaining.toString());

    if (!result.allowed) {
      c.header('Retry-After', Math.ceil(result.resetMs / 1000).toString());
      return c.json(
        { error: 'KI-Generierungslimit erreicht (5 pro Tag). Bitte versuche es morgen erneut.' },
        429
      );
    }

    return next();
  };
}
