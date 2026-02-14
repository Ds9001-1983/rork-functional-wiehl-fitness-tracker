import { publicProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export default publicProcedure
  .input(z.object({ token: z.string(), newPassword: z.string().min(6) }))
  .mutation(async ({ input }) => {
    const tokenData = await storage.passwordResets.validate(input.token);
    if (!tokenData) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'INVALID_OR_EXPIRED_TOKEN' });
    }

    await storage.users.updatePassword(tokenData.userId, input.newPassword);
    await storage.passwordResets.markUsed(input.token);

    return { success: true };
  });
