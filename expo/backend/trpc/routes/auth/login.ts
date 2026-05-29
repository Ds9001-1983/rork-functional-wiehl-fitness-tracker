import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure, signToken } from '../../create-context';
import { getPool, storage } from '../../../storage';
import bcrypt from 'bcryptjs';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Brute-Force-Schutz pro E-Mail (nicht pro IP, damit Studio-WLAN andere Mitglieder nicht aussperrt).
// Zähler wird bei erfolgreichem Login zurückgesetzt.
const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const loginAttempts = new Map<string, number[]>();

function recordLoginAttempt(key: string): number {
  const now = Date.now();
  const list = (loginAttempts.get(key) || []).filter(ts => now - ts < LOGIN_WINDOW_MS);
  list.push(now);
  loginAttempts.set(key, list);
  return list.length;
}

export const loginProcedure = publicProcedure
  .input(loginSchema)
  .mutation(async ({ input }) => {
    const email = input.email.trim().toLowerCase();
    const password = input.password;

    console.log('[Server] Login attempt for:', email);

    if (recordLoginAttempt(email) > LOGIN_MAX_ATTEMPTS) {
      console.warn('[Server] Login throttled for:', email);
      throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Zu viele Anmeldeversuche. Bitte warte ein paar Minuten.' });
    }

    const pool = getPool();

    // In-Memory-Fallback: einheitlich via bcrypt gegen storage.users
    if (!pool) {
      const user = await storage.users.findByEmail(email);
      if (!user) throw new Error('USER_NOT_INVITED');

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) throw new Error('INVALID_PASSWORD');

      const allClients = await storage.clients.getAll();
      const client = allClients.find(c => c.email === email);

      const userData = client
        ? {
            id: client.id,
            name: client.name,
            email: client.email,
            role: client.role,
            joinDate: client.joinDate,
            passwordChanged: client.passwordChanged,
            stats: client.stats,
          }
        : {
            id: user.id,
            name: user.role === 'admin' ? 'Administrator' : user.role === 'trainer' ? 'Functional Wiehl Trainer' : user.email.split('@')[0],
            email: user.email,
            role: user.role,
            joinDate: user.createdAt,
            passwordChanged: user.passwordChanged,
            stats: {
              totalWorkouts: 0,
              totalVolume: 0,
              currentStreak: 0,
              longestStreak: 0,
              personalRecords: {},
            },
          };
      const token = signToken({ userId: userData.id, email: userData.email, role: userData.role });
      loginAttempts.delete(email);
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

      // Alle Profildaten kommen jetzt direkt aus der users-Tabelle (post-merge).
      const userData = {
        id: user.id.toString(),
        name: user.name || (user.role === 'trainer' ? 'Functional Wiehl Trainer' : user.role === 'admin' ? 'Administrator' : user.email.split('@')[0]),
        email: user.email,
        phone: user.phone,
        role: user.role,
        joinDate: user.join_date || user.created_at,
        passwordChanged: user.password_changed,
        stats: {
          totalWorkouts: Number(user.total_workouts) || 0,
          totalVolume: Number(user.total_volume) || 0,
          currentStreak: Number(user.current_streak) || 0,
          longestStreak: Number(user.longest_streak) || 0,
          personalRecords: user.personal_records || {},
        },
      };

      const token = signToken({ userId: userData.id, email: userData.email, role: userData.role });
      loginAttempts.delete(email);
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