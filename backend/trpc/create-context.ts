import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || 'functional-wiehl-beta-secret-2026';

export interface AuthUser {
  userId: string;
  email: string;
  role: 'client' | 'trainer' | 'admin';
}

export const createContext = async (opts?: any) => {
  let user: AuthUser | null = null;

  // Extract JWT from Authorization header
  const authHeader = opts?.req?.headers?.get?.('authorization') || opts?.req?.headers?.authorization || '';
  const token = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : '';

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
      user = { userId: decoded.userId, email: decoded.email, role: decoded.role };
    } catch {
      // Invalid token - user stays null
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
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Nur fuer Trainer' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// Requires admin role
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Nicht angemeldet' });
  }
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Nur fuer Administratoren' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export function signJWT(payload: AuthUser): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
