import { adminProcedure } from '../../create-context';
import { storage, getDatabaseStatus } from '../../../storage';

export default adminProcedure
  .query(async ({ ctx }) => {
    const allClients = await storage.clients.getAll();
    const allWorkouts = await storage.workouts.getAll();
    const dbStatus = getDatabaseStatus();

    const totalUsers = allClients.length;
    const totalTrainers = allClients.filter(c => c.role === 'trainer').length;
    const totalClients = allClients.filter(c => c.role === 'client').length;

    return {
      totalUsers,
      totalTrainers,
      totalClients,
      totalWorkouts: allWorkouts.length,
      serverUptime: Math.floor(process.uptime()),
      dbConnected: dbStatus.connected,
      recentWorkouts: allWorkouts.slice(0, 10).map(w => ({
        id: w.id,
        name: w.name,
        date: w.date,
        userId: w.userId,
      })),
    };
  });
