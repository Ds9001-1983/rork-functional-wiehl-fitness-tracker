import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import jwt from "jsonwebtoken";

const JWT_SECRET = (() => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[Auth] JWT_SECRET muss in Production gesetzt sein!');
  }
  console.warn('[Auth] ⚠️ No JWT_SECRET set - using development fallback.');
  return 'dev-fallback-secret-change-in-production';
})();

export interface TokenPayload {
  userId: string;
  role: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

// Context creation function
export const createContext = async (opts?: any) => {
  let user: TokenPayload | null = null;

  try {
    const authHeader = opts?.req?.headers?.get?.('authorization')
      || opts?.req?.headers?.authorization;
    if (authHeader && typeof authHeader === 'string') {
      const token = authHeader.replace('Bearer ', '');
      if (token) {
        user = verifyToken(token);
      }
    }
  } catch {
    // Invalid token - user stays null
  }

  return {
    req: opts?.req,
    user,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async (opts) => {
  if (!opts.ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Nicht authentifiziert. Bitte erneut einloggen.',
    });
  }
  return opts.next({
    ctx: {
      ...opts.ctx,
      user: opts.ctx.user,
    },
  });
});