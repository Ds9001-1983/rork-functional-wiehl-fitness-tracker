import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default protectedProcedure
  .mutation(async ({ ctx }) => {
    const userId = ctx.user.userId;
    const studioId = ctx.user.studioId;

    // Get all active challenges
    const challenges = await storage.challenges.getActive(studioId);

    // Get user's workouts
    const workouts = await storage.workouts.list(userId) as any[];
    const completedWorkouts = workouts.filter((w: any) => w.completed);

    // Get user's gamification data for streak
    let currentStreak = 0;
    try {
      const gam = await storage.gamification.get(userId);
      if (gam) currentStreak = gam.currentStreak || 0;
    } catch { /* ignore */ }

    const updated: { challengeId: string; value: number }[] = [];

    for (const challenge of challenges) {
      // Check if user is participating
      const progress = await storage.challenges.getProgress(challenge.id);
      const userProgress = progress.find((p: any) => p.userId === userId);
      if (!userProgress) continue;

      const startDate = new Date(challenge.startDate);
      let newValue = 0;

      switch (challenge.type) {
        case 'workout_count':
          newValue = completedWorkouts.filter((w: any) =>
            new Date(w.date) >= startDate
          ).length;
          break;

        case 'total_volume':
          newValue = completedWorkouts
            .filter((w: any) => new Date(w.date) >= startDate)
            .reduce((total: number, w: any) => {
              return total + (w.exercises || []).reduce((wTotal: number, ex: any) => {
                return wTotal + (ex.sets || []).reduce((sTotal: number, s: any) => {
                  return sTotal + ((s.completed ? s.weight * s.reps : 0) || 0);
                }, 0);
              }, 0);
            }, 0);
          newValue = Math.round(newValue);
          break;

        case 'streak':
          newValue = currentStreak;
          break;
      }

      if (newValue !== userProgress.currentValue) {
        await storage.challenges.updateProgress(challenge.id, userId, newValue);
        updated.push({ challengeId: challenge.id, value: newValue });
      }
    }

    return { updated };
  });
