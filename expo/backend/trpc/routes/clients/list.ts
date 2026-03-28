import { publicProcedure } from "../../create-context";
import { Pool } from 'pg';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default publicProcedure
  .query(async () => {
    try {
      console.log('[Server] Fetching clients from database...');
      
      // Get all users with their client data
      const result = await pool.query(`
        SELECT 
          u.id,
          u.email,
          u.role,
          u.password_changed,
          u.created_at,
          c.name,
          c.phone,
          c.join_date,
          c.total_workouts,
          c.total_volume,
          c.current_streak,
          c.longest_streak,
          c.personal_records
        FROM users u
        LEFT JOIN clients c ON u.id = c.user_id
        ORDER BY u.created_at DESC
      `);
      
      const clients = result.rows.map(row => ({
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
      
      console.log('[Server] Fetched clients:', clients.length);
      return clients;
      
    } catch (error) {
      console.log('[Server] Error fetching clients:', error);
      throw new Error('Failed to fetch clients');
    }
  });