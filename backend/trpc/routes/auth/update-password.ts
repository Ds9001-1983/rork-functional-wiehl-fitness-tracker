import { z } from 'zod';
import { TRPCError } from '@trpc/server';
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

    // Find the user to verify current password
    // We need to look up by ID, so we check all clients
    const allClients = await storage.clients.getAll();
    const client = allClients.find(c => c.id === userId || c.userId === userId);

    if (!client) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'USER_NOT_FOUND' });
    }

    // Find the stored user for password verification
    const storedUser = await storage.users.findByEmail(client.email);
    if (!storedUser) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'USER_NOT_FOUND' });
    }

    // Verify current password
    const isValid = await storage.users.verifyPassword(currentPassword, storedUser.password);
    if (!isValid) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'INVALID_CURRENT_PASSWORD' });
    }

    // Update the password
    const updated = await storage.users.updatePassword(storedUser.id, newPassword);

    if (!updated) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'PASSWORD_UPDATE_FAILED' });
    }

    return { success: true };
  });
