import { z } from 'zod';
import { publicProcedure, signJWT } from '../../create-context';
import { storage } from '../../../storage';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const loginProcedure = publicProcedure
  .input(loginSchema)
  .mutation(async ({ input }) => {
    const { email, password } = input;

    try {
      const user = await storage.users.findByEmail(email);

      if (!user) {
        throw new Error('USER_NOT_INVITED');
      }

      const isValidPassword = await storage.users.verifyPassword(password, user.password);

      if (!isValidPassword) {
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

      // Generate JWT token
      const token = signJWT({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return { success: true, user: userData, token };

    } catch (error: any) {
      if (error.message === 'USER_NOT_INVITED' || error.message === 'INVALID_PASSWORD') {
        throw error;
      }

      throw new Error('CONNECTION_FAILED');
    }
  });
