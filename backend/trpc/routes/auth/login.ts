import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure, signJWT } from '../../create-context';
import { storage } from '../../../storage';

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
});

export const loginProcedure = publicProcedure
  .input(loginSchema)
  .mutation(async ({ input }) => {
    const { email, password } = input;

    try {
      const user = await storage.users.findByEmail(email);

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'USER_NOT_INVITED',
        });
      }

      const isValidPassword = await storage.users.verifyPassword(password, user.password);

      if (!isValidPassword) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'INVALID_PASSWORD',
        });
      }

      // Get client profile data
      const allClients = await storage.clients.getAll();
      const clientData = allClients.find(c =>
        c.email === email || c.userId === user.id || c.id === user.id
      );

      const userData = {
        id: user.id,
        name: clientData?.name || (user.role === 'admin' ? 'Administrator' : user.role === 'trainer' ? 'Trainer' : email.split('@')[0]),
        email: user.email,
        phone: clientData?.phone,
        role: user.role,
        avatar: clientData?.avatar,
        joinDate: clientData?.joinDate || user.createdAt,
        passwordChanged: user.passwordChanged,
        stats: clientData?.stats || {
          totalWorkouts: 0,
          totalVolume: 0,
          currentStreak: 0,
          longestStreak: 0,
          personalRecords: {},
        },
      };

      const token = signJWT({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return { success: true, user: userData, token };

    } catch (error: unknown) {
      // Re-throw TRPCErrors as-is (they already have proper HTTP status codes)
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error('[Login] Unexpected error:', error instanceof Error ? error.message : error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'CONNECTION_FAILED',
      });
    }
  });
