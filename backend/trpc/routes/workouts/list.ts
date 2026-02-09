import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default publicProcedure
  .input(z.object({
    userId: z.string().optional(),
  }).optional())
  .query(async ({ input }) => {
    if (input?.userId) {
      const workouts = await storage.workouts.getByUserId(input.userId);
      console.log('[Server] Listed workouts for user:', input.userId, 'count:', workouts.length);
      return workouts;
    }

    const workouts = await storage.workouts.getAll();
    console.log('[Server] Listed all workouts, count:', workouts.length);
    return workouts;
  });
