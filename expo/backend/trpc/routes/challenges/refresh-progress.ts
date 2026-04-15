import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import type { StoredWorkout, StoredChallenge } from '../../../storage';

export default protectedProcedure
  .mutation(async ({ ctx }) => {
    const userId = ctx.user.userId;

    // Get all active challenges
    const challenges = await storage.challenges.getActive();

    // Get user's workouts
    const workouts = await storage.workouts.getByUserId(userId);
    const completedWorkouts = workouts.filter((w: StoredWorkout) => w.completed);

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
      const userProgress = progress.find((p: { userId: string }) => p.userId === userId);
      if (!userProgress) continue;

      const startDate = new Date((challenge as StoredChallenge).startDate);
      let newValue = 0;

      switch (challenge.type) {
        case 'workout_count':
          newValue = completedWorkouts.filter((w: StoredWorkout) =>
            new Date(w.date) >= startDate
          ).length;
          break;

        case 'total_volume':
          newValue = completedWorkouts
            .filter((w: StoredWorkout) => new Date(w.date) >= startDate)
            .reduce((total: number, w: StoredWorkout) => {
              return total + (w.exercises || []).reduce((wTotal: number, ex: { sets?: { weight?: number; reps?: number; completed?: boolean }[] }) => {
                return wTotal + (ex.sets || []).reduce((sTotal: number, s: { weight?: number; reps?: number; completed?: boolean }) => {
                  return sTotal + ((s.completed ? (s.weight || 0) * (s.reps || 0) : 0) || 0);
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
