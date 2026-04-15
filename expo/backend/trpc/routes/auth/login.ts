import { z } from 'zod';
import { publicProcedure, signToken } from '../../create-context';
import { getPool, storage } from '../../../storage';
import bcrypt from 'bcryptjs';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const loginProcedure = publicProcedure
  .input(loginSchema)
  .mutation(async ({ input }) => {
    const { email, password } = input;

    console.log('[Server] Login attempt for:', email);

    const pool = getPool();

    // In-Memory-Fallback: Login gegen storage.clients
    if (!pool) {
      const allClients = await storage.clients.getAll();
      const client = allClients.find(c => c.email === email);
      if (!client) throw new Error('USER_NOT_INVITED');
      if (client.starterPassword !== password) throw new Error('INVALID_PASSWORD');

      const userData = {
        id: client.id,
        name: client.name,
        email: client.email,
        role: client.role,
        joinDate: client.joinDate,
        passwordChanged: client.passwordChanged,
        stats: client.stats,
      };
      const token = signToken({ userId: userData.id, email: userData.email, role: userData.role });
      console.log('[Server] In-memory login successful:', email);
      return { success: true, user: userData, token };
    }

    // Database Login
    try {
      const userResult = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (userResult.rows.length === 0) {
        throw new Error('USER_NOT_INVITED');
      }

      const user = userResult.rows[0];

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new Error('INVALID_PASSWORD');
      }

      let clientData = null;
      if (user.role === 'client') {
        const clientResult = await pool.query(
          'SELECT * FROM clients WHERE user_id = $1',
          [user.id]
        );
        clientData = clientResult.rows[0] || null;
      }

      const userData = {
        id: user.id.toString(),
        name: clientData?.name || (user.role === 'trainer' ? 'Functional Wiehl Trainer' : user.email.split('@')[0]),
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

      const token = signToken({ userId: userData.id, email: userData.email, role: userData.role });
      console.log('[Server] DB login successful:', email, 'role:', user.role);
      return { success: true, user: userData, token };

    } catch (error: any) {
      if (error.message === 'USER_NOT_INVITED' || error.message === 'INVALID_PASSWORD') {
        throw error;
      }
      console.log('[Server] Database error during login:', error.message);
      throw new Error('CONNECTION_FAILED');
    }
  });