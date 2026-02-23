import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { trainerProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default trainerProcedure
  .input(z.object({
    id: z.string(),
    name: z.string().optional(),
    phone: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    const { id, ...updates } = input;

    const updated = await storage.clients.updateProfile(id, updates);

    if (!updated) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'CLIENT_NOT_FOUND' });
    }
    return { success: true };
  });
