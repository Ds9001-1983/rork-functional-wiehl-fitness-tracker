import { superadminProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default superadminProcedure
  .query(async () => {
    const studios = await storage.studios.getAll();

    const studioDetails = await Promise.all(
      studios.map(async (studio) => {
        const memberCount = await storage.studios.getMemberCount(studio.id);
        const allWorkouts = await storage.workouts.getAll(studio.id);
        const completedWorkouts = allWorkouts.filter(w => w.completed);

        // Workouts in last 7 days
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const recentWorkouts = completedWorkouts.filter(
          w => new Date(w.date) >= weekAgo
        ).length;

        // Unique active users (last 7 days)
        const activeUsers = new Set(
          allWorkouts
            .filter(w => new Date(w.date) >= weekAgo)
            .map(w => w.userId)
        ).size;

        return {
          id: studio.id,
          name: studio.name,
          slug: studio.slug,
          accentColor: studio.accentColor,
          memberCount,
          totalWorkouts: completedWorkouts.length,
          recentWorkouts,
          activeUsers,
        };
      })
    );

    const totalStudios = studios.length;
    const totalUsers = studioDetails.reduce((sum, s) => sum + s.memberCount, 0);
    const totalWorkouts = studioDetails.reduce((sum, s) => sum + s.totalWorkouts, 0);
    const totalActiveUsers = studioDetails.reduce((sum, s) => sum + s.activeUsers, 0);
    const totalRecentWorkouts = studioDetails.reduce((sum, s) => sum + s.recentWorkouts, 0);

    return {
      totalStudios,
      totalUsers,
      totalWorkouts,
      totalActiveUsers,
      totalRecentWorkouts,
      studios: studioDetails,
    };
  });
