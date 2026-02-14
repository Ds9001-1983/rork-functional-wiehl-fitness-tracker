import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { trainerProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default trainerProcedure
  .input(z.object({
    planId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const assigned = await storage.workoutPlans.assign(input.planId, input.userId);

    if (!assigned) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'PLAN_NOT_FOUND' });
    }

    console.log('[Server] Assigned plan:', input.planId, 'to user:', input.userId);
    return { success: true };
  });
