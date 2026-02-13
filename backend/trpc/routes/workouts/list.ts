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
      console.log('[Server] Listed workouts for user:', input.userId, 'count:', workouts.length);
      return workouts;
    }

    const workouts = await storage.workouts.getAll(ctx.user.studioId);
    console.log('[Server] Listed all workouts, count:', workouts.length);
    return workouts;
  });
