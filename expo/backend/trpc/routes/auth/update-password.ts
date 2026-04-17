import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';

export const updatePasswordProcedure = protectedProcedure
  .input(z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(6),
  }))
  .mutation(async ({ ctx, input }) => {
    const { currentPassword, newPassword } = input;

    const storedUser = await storage.users.findByEmail(ctx.user.email);
    if (!storedUser) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'USER_NOT_FOUND' });
    }

    const isValid = await storage.users.verifyPassword(currentPassword, storedUser.password);
    if (!isValid) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'INVALID_CURRENT_PASSWORD' });
    }

    const updated = await storage.users.updatePassword(storedUser.id, newPassword);
    if (!updated) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'PASSWORD_UPDATE_FAILED' });
    }

    return { success: true };
  });
