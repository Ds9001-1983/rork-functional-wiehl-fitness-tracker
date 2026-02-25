import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

// Load jsonwebtoken - require() works in both Bun and Node.js
let jwtModule: typeof import('jsonwebtoken') | null = null;
try {
  jwtModule = require('jsonwebtoken');
  console.log('[Auth] jsonwebtoken loaded successfully');
} catch {
  console.warn('[Auth] jsonwebtoken not available - JWT auth disabled');
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[Auth] FATAL: JWT_SECRET must be set in production');
  }
  console.warn('[Auth] WARNING: JWT_SECRET not set - using insecure default (dev only)');
}
const jwtSecret = JWT_SECRET || 'dev-only-insecure-secret-' + Math.random().toString(36);

export interface AuthUser {
  userId: string;
  email: string;
  role: 'client' | 'trainer' | 'admin';
}

export const createContext = async (opts?: { req?: { headers?: { get?: (name: string) => string | null; authorization?: string } } }) => {
  let user: AuthUser | null = null;

  if (jwtModule) {
    const authHeader = opts?.req?.headers?.get?.('authorization') || opts?.req?.headers?.authorization || '';
    const token = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : '';

    if (token) {
      try {
        const decoded = jwtModule.verify(token, jwtSecret) as AuthUser;
        user = {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
        };
      } catch {
        // Invalid token
      }
    }
  }

  return { req: opts?.req, user };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// Requires valid JWT token
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Nicht angemeldet' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// Requires trainer or admin role
export const trainerProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Nicht angemeldet' });
  }
  if (ctx.user.role !== 'trainer' && ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Nur für Trainer' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// Requires admin role
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Nicht angemeldet' });
  }
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Nur für Administratoren' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export function signJWT(payload: AuthUser): string {
  if (!jwtModule) {
    // Fallback: base64 encoded payload (not secure, for beta only)
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }
  return jwtModule.sign(payload, jwtSecret, { expiresIn: '7d' });
}
