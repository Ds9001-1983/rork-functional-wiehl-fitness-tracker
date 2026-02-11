import { z } from 'zod';
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
      throw new Error('PLAN_NOT_FOUND');
    }

    console.log('[Server] Assigned plan:', input.planId, 'to user:', input.userId);
    return { success: true };
  });
