import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { trainerProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default trainerProcedure
  .input(z.object({
    planId: z.string(),
    userId: z.string(),
    createInstance: z.boolean().optional(), // if true, creates independent copy
  }))
  .mutation(async ({ input, ctx }) => {
    if (input.createInstance) {
      // Create an independent instance copy for this user
      const instance = await storage.workoutPlans.instantiate(
        input.planId,
        input.userId,
        ctx.user.studioId
      );

      if (!instance) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'PLAN_NOT_FOUND' });
      }

      console.log('[Server] Created plan instance:', instance.id, 'from template:', input.planId, 'for user:', input.userId);
      return { success: true, instanceId: instance.id };
    }

    // Legacy: just add to assignedTo array
    const assigned = await storage.workoutPlans.assign(input.planId, input.userId);

    if (!assigned) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'PLAN_NOT_FOUND' });
    }

    console.log('[Server] Assigned plan:', input.planId, 'to user:', input.userId);
    return { success: true };
  });
