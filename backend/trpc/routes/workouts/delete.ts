import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default protectedProcedure
  .input(z.object({
    id: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    // Ownership check: only owner or trainer/admin can delete
    const existing = await storage.workouts.getById(input.id);
    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'WORKOUT_NOT_FOUND' });
    }
    if (existing.userId !== ctx.user.userId && ctx.user.role !== 'trainer' && ctx.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Keine Berechtigung' });
    }

    const deleted = await storage.workouts.delete(input.id);
    return { success: deleted };
  });
