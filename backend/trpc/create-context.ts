import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

// Load jsonwebtoken - require() works in both Bun and Node.js
let jwtModule: any = null;
try {
  jwtModule = require('jsonwebtoken');
  console.log('[Auth] jsonwebtoken loaded successfully');
} catch {
  console.warn('[Auth] jsonwebtoken not available - JWT auth disabled');
}

const JWT_SECRET = process.env.JWT_SECRET || 'functional-wiehl-beta-secret-2026';

export interface AuthUser {
  userId: string;
  email: string;
  role: 'client' | 'trainer' | 'admin' | 'superadmin';
  studioId: string;
}

export const createContext = async (opts?: any) => {
  let user: AuthUser | null = null;

  if (jwtModule) {
    const authHeader = opts?.req?.headers?.get?.('authorization') || opts?.req?.headers?.authorization || '';
    const token = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : '';

    if (token) {
      try {
        const decoded = jwtModule.verify(token, JWT_SECRET) as AuthUser;
        user = {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          studioId: decoded.studioId || '1',
        };
      } catch {
        // Invalid token
      }
    }
  }

  // Allow X-Studio-Id header override for superadmin
  if (user && user.role === 'superadmin') {
    const studioHeader = opts?.req?.headers?.get?.('x-studio-id') || opts?.req?.headers?.['x-studio-id'];
    if (studioHeader) {
      user.studioId = studioHeader;
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
  if (ctx.user.role !== 'trainer' && ctx.user.role !== 'admin' && ctx.user.role !== 'superadmin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Nur fuer Trainer' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// Requires admin role
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Nicht angemeldet' });
  }
  if (ctx.user.role !== 'admin' && ctx.user.role !== 'superadmin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Nur fuer Administratoren' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// Requires superadmin role (SUPERBAND cross-studio access)
export const superadminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Nicht angemeldet' });
  }
  if (ctx.user.role !== 'superadmin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Nur fuer SUPERBAND Administratoren' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export function signJWT(payload: AuthUser): string {
  if (!jwtModule) {
    // Fallback: base64 encoded payload (not secure, for beta only)
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }
  return jwtModule.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
