import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { trainerProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default trainerProcedure
  .input(z.object({
    id: z.string(),
    name: z.string().min(1).max(255).optional(),
    email: z.string().email().max(255).optional(),
    phone: z.string().max(50).optional(),
  }))
  .mutation(async ({ input }) => {
    const { id, ...updates } = input;
    const result = await storage.clients.updateProfile(id, updates);
    if (!result.ok) {
      if (result.reason === 'email_taken') {
        throw new TRPCError({ code: 'CONFLICT', message: 'Diese E-Mail-Adresse wird bereits verwendet.' });
      }
      throw new TRPCError({ code: 'NOT_FOUND', message: 'CLIENT_NOT_FOUND' });
    }
    return { success: true };
  });
