import { z } from 'zod';
import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default protectedProcedure
  .input(z.object({
    userId: z.string().optional(),
  }).optional())
  .query(async ({ input, ctx }) => {
    if (input?.userId) {
      const workouts = await storage.workouts.getByUserId(input.userId);
      return workouts;
    }

    const workouts = await storage.workouts.getAll();
    return workouts;
  });
