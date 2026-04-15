import { trainerProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default trainerProcedure
  .input(z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(2000),
    type: z.enum(['workout_count', 'total_volume', 'streak']),
    target: z.number().min(1).max(1000000),
    startDate: z.string(),
    endDate: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    const result = await storage.challenges.create({ ...input, createdBy: ctx.user.userId });

    // Notify all users with gamification data (active users)
    try {
      const leaderboardUsers = await storage.gamification.leaderboard(100);
      for (const entry of leaderboardUsers) {
        if (entry.userId !== ctx.user.userId) {
          await storage.notifications.create({
            userId: entry.userId,
            title: 'Neue Challenge!',
            body: `"${input.name}" - Tritt jetzt bei und zeig was du kannst!`,
            type: 'challenge',
          });
        }
      }
    } catch {
      // Non-critical, skip notification errors
    }

    return result;
  });
