import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default protectedProcedure
  .input(z.object({
    id: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    // Ownership check: only creator or admin can delete
    const existing = await storage.workoutPlans.getById(input.id);
    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'PLAN_NOT_FOUND' });
    }
    if (existing.createdBy !== ctx.user.userId && ctx.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Keine Berechtigung' });
    }

    const deleted = await storage.workoutPlans.delete(input.id);
    return { success: deleted };
  });
