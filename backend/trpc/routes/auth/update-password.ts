import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { storage } from '../../../storage';

export const updatePasswordProcedure = publicProcedure
  .input(z.object({
    userId: z.string(),
    currentPassword: z.string(),
    newPassword: z.string().min(6),
  }))
  .mutation(async ({ input }) => {
    const { userId, currentPassword, newPassword } = input;

    console.log('[Server] Password update request for user:', userId);

    // Find the user to verify current password
    // We need to look up by ID, so we check all clients
    const allClients = await storage.clients.getAll();
    const client = allClients.find(c => c.id === userId || c.userId === userId);

    if (!client) {
      throw new Error('USER_NOT_FOUND');
    }

    // Find the stored user for password verification
    const storedUser = await storage.users.findByEmail(client.email);
    if (!storedUser) {
      throw new Error('USER_NOT_FOUND');
    }

    // Verify current password
    const isValid = await storage.users.verifyPassword(currentPassword, storedUser.password);
    if (!isValid) {
      throw new Error('INVALID_CURRENT_PASSWORD');
    }

    // Update the password
    const updated = await storage.users.updatePassword(storedUser.id, newPassword);

    if (!updated) {
      throw new Error('PASSWORD_UPDATE_FAILED');
    }

    console.log('[Server] Password updated successfully for user:', userId);
    return { success: true };
  });
