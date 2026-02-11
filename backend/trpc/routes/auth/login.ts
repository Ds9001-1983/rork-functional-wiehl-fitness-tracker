import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { storage } from '../../../storage';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const loginProcedure = publicProcedure
  .input(loginSchema)
  .mutation(async ({ input }) => {
    const { email, password } = input;

    console.log('[Server] Login attempt for:', email);

    try {
      const user = await storage.users.findByEmail(email);

      if (!user) {
        console.log('[Server] User not found:', email);
        throw new Error('USER_NOT_INVITED');
      }

      console.log('[Server] Found user:', { id: user.id, email: user.email, role: user.role });

      const isValidPassword = await storage.users.verifyPassword(password, user.password);

      if (!isValidPassword) {
        console.log('[Server] Invalid password for user:', email);
        throw new Error('INVALID_PASSWORD');
      }

      // Get client profile data
      const allClients = await storage.clients.getAll();
      const clientData = allClients.find(c =>
        c.email === email || c.userId === user.id || c.id === user.id
      );

      const userData = {
        id: user.id,
        name: clientData?.name || (user.role === 'admin' ? 'Administrator' : user.role === 'trainer' ? 'Functional Wiehl Trainer' : email.split('@')[0]),
        email: user.email,
        phone: clientData?.phone,
        role: user.role,
        avatar: clientData?.avatar,
        joinDate: clientData?.joinDate || user.createdAt,
        passwordChanged: user.passwordChanged,
        stats: clientData?.stats || {
          totalWorkouts: 0,
          totalVolume: 0,
          currentStreak: 0,
          longestStreak: 0,
          personalRecords: {},
        },
      };

      console.log('[Server] Login successful:', email, 'role:', user.role);
      return { success: true, user: userData };

    } catch (error: any) {
      console.log('[Server] Login error:', error.message);

      if (error.message === 'USER_NOT_INVITED' || error.message === 'INVALID_PASSWORD') {
        throw error;
      }

      throw new Error('CONNECTION_FAILED');
    }
  });
