import { z } from 'zod';
import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default protectedProcedure
  .input(z.object({
    createdBy: z.string().optional(),
    userId: z.string().optional(),
  }).optional())
  .query(async ({ input, ctx }) => {
    if (input?.createdBy) {
      const plans = await storage.workoutPlans.getByCreator(input.createdBy);
      return plans;
    }

    if (input?.userId) {
      const plans = await storage.workoutPlans.getByUserId(input.userId);
      return plans;
    }

    const plans = await storage.workoutPlans.getAll();
    return plans;
  });
