import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default publicProcedure
  .input(z.object({
    createdBy: z.string().optional(),
  }).optional())
  .query(async ({ input }) => {
    if (input?.createdBy) {
      const plans = await storage.workoutPlans.getByCreator(input.createdBy);
      console.log('[Server] Listed plans by creator:', input.createdBy, 'count:', plans.length);
      return plans;
    }

    const plans = await storage.workoutPlans.getAll();
    console.log('[Server] Listed all plans, count:', plans.length);
    return plans;
  });
