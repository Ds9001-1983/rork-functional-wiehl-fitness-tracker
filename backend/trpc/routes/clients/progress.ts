import { trainerProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default trainerProcedure
  .input(z.object({ clientId: z.string() }))
  .query(async ({ input, ctx }) => {
    // Get client's workouts
    const allWorkouts = await storage.workouts.getAll();
    const clientWorkouts = (allWorkouts as any[]).filter(
      (w: any) => w.userId === input.clientId && w.completed
    );

    // Last 4 weeks
    const now = new Date();
    const fourWeeksAgo = new Date(now);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const recentWorkouts = clientWorkouts.filter(
      (w: any) => new Date(w.date) >= fourWeeksAgo
    );

    // Weekly breakdown
    const weeklyData = [0, 1, 2, 3].map(weeksAgo => {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (weeksAgo + 1) * 7);
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - weeksAgo * 7);

      const weekWorkouts = clientWorkouts.filter((w: any) => {
        const d = new Date(w.date);
        return d >= weekStart && d < weekEnd;
      });

      const volume = weekWorkouts.reduce((total: number, w: any) => {
        return total + (w.exercises || []).reduce((eTotal: number, ex: any) => {
          return eTotal + (ex.sets || []).reduce((sTotal: number, s: any) => {
            return sTotal + (s.weight || 0) * (s.reps || 0);
          }, 0);
        }, 0);
      }, 0);

      return {
        weekLabel: `KW ${getWeekNumber(weekStart)}`,
        workoutCount: weekWorkouts.length,
        volume,
      };
    }).reverse();

    // Compliance: planned vs actual
    const plans = await storage.workoutPlans.getAll();
    const clientPlans = (plans as any[]).filter(
      (p: any) => p.assignedTo?.includes(input.clientId)
    );
    const scheduledDaysPerWeek = clientPlans.reduce((total: number, p: any) => {
      return total + (p.schedule?.length || 0);
    }, 0) || 3; // default 3 if no schedule

    const expectedWorkouts = scheduledDaysPerWeek * 4; // 4 weeks
    const complianceRate = expectedWorkouts > 0
      ? Math.min(100, Math.round((recentWorkouts.length / expectedWorkouts) * 100))
      : 0;

    // Last activity
    const lastWorkout = clientWorkouts.length > 0
      ? clientWorkouts.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      : null;

    // Streak
    const gamificationData = await storage.gamification.get(input.clientId);

    return {
      totalWorkouts: clientWorkouts.length,
      recentWorkouts: recentWorkouts.length,
      complianceRate,
      weeklyData,
      lastWorkoutDate: lastWorkout?.date || null,
      currentStreak: (gamificationData as any)?.currentStreak || 0,
      assignedPlans: clientPlans.length,
    };
  });

function getWeekNumber(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}
