import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({
    userId: z.string(),
    xp: z.number(),
    level: z.number(),
    badges: z.array(z.any()),
    currentStreak: z.number(),
    longestStreak: z.number(),
    streakFreezes: z.number(),
    streakFreezesUsed: z.array(z.string()),
    lastActiveDate: z.string(),
    coachingTone: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    await storage.gamification.sync(input.userId, input);
    return { success: true };
  });
