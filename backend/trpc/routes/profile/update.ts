import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default protectedProcedure
  .input(z.object({
    userId: z.string(),
    name: z.string().optional(),
    phone: z.string().optional(),
    avatar: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    const { userId, ...updates } = input;

    const updated = await storage.clients.updateProfile(userId, updates);

    if (!updated) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'USER_NOT_FOUND' });
    }
    return { success: true };
  });
