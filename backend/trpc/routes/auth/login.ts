import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const loginProcedure = publicProcedure
  .input(loginSchema)
  .mutation(async ({ input }) => {
    const { email, password } = input;
    
    console.log('[Server] Login attempt for:', email);
    
    try {
      // Check if user exists in database
      const userResult = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      
      if (userResult.rows.length === 0) {
        console.log('[Server] User not found:', email);
        throw new Error('USER_NOT_INVITED');
      }
      
      const user = userResult.rows[0];
      console.log('[Server] Found user:', user.email, 'role:', user.role);
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        console.log('[Server] Invalid password for user:', email);
        throw new Error('INVALID_PASSWORD');
      }
      
      // Get additional client data if exists
      let clientData = null;
      if (user.role === 'client') {
        const clientResult = await pool.query(
          'SELECT * FROM clients WHERE user_id = $1',
          [user.id]
        );
        clientData = clientResult.rows[0] || null;
      }
      
      // Format user data for frontend
      const userData = {
        id: user.id.toString(),
        name: clientData?.name || user.email.split('@')[0],
        email: user.email,
        phone: clientData?.phone,
        role: user.role,
        joinDate: clientData?.join_date || user.created_at,
        passwordChanged: user.password_changed,
        stats: {
          totalWorkouts: clientData?.total_workouts || 0,
          totalVolume: clientData?.total_volume || 0,
          currentStreak: clientData?.current_streak || 0,
          longestStreak: clientData?.longest_streak || 0,
          personalRecords: clientData?.personal_records || {},
        },
      };
      
      console.log('[Server] User login successful:', email, 'role:', user.role);
      return { success: true, user: userData };
      
    } catch (error: any) {
      console.log('[Server] Login error:', error.message);
      
      if (error.message === 'USER_NOT_INVITED' || error.message === 'INVALID_PASSWORD') {
        throw error;
      }
      
      // Database connection error
      console.log('[Server] Database error during login:', error);
      throw new Error('CONNECTION_FAILED');
    }
  });