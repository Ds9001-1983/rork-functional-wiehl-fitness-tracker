import { protectedProcedure } from "../../create-context";
import { getPool } from "../../../storage";

export default protectedProcedure
  .query(async ({ ctx }) => {
    try {
      const pool = getPool();
      if (!pool) throw new Error('Database not available');

      // Get all users with their client data
      const result = await pool.query(`
        SELECT
          id,
          email,
          role,
          password_changed,
          created_at,
          name,
          phone,
          join_date,
          total_workouts,
          total_volume,
          current_streak,
          longest_streak,
          personal_records
        FROM users
        ORDER BY created_at DESC
      `);
      
      let clients = result.rows.map(row => ({
        id: row.id.toString(),
        name: row.name || row.email.split('@')[0],
        email: row.email,
        phone: row.phone,
        role: row.role,
        joinDate: row.join_date || row.created_at,
        passwordChanged: row.password_changed,
        stats: {
          totalWorkouts: row.total_workouts || 0,
          totalVolume: row.total_volume || 0,
          currentStreak: row.current_streak || 0,
          longestStreak: row.longest_streak || 0,
          personalRecords: row.personal_records || {},
        },
      }));

      // Clients dürfen nur ihre eigenen Daten sehen
      if (ctx.user.role === 'client') {
        clients = clients.filter(c => c.id === ctx.user.userId);
      }

      console.log('[Server] Fetched clients:', clients.length);
      return clients;
      
    } catch (error) {
      console.log('[Server] Error fetching clients:', error);
      throw new Error('Failed to fetch clients');
    }
  });