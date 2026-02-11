import { z } from 'zod';
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
      throw new Error('USER_NOT_FOUND');
    }

    console.log('[Server] Profile updated for user:', userId);
    return { success: true };
  });
