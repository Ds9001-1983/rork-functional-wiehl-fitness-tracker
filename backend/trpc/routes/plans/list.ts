import { z } from 'zod';
import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default protectedProcedure
  .input(z.object({
    createdBy: z.string().optional(),
  }).optional())
  .query(async ({ input, ctx }) => {
    if (input?.createdBy) {
      const plans = await storage.workoutPlans.getByCreator(input.createdBy);
      console.log('[Server] Listed plans by creator:', input.createdBy, 'count:', plans.length);
      return plans;
    }

    const plans = await storage.workoutPlans.getAll(ctx.user.studioId);
    console.log('[Server] Listed all plans, count:', plans.length);
    return plans;
  });
