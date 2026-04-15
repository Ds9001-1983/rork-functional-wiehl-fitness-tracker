import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({
    endpoint: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    await storage.pushSubscriptions.unsubscribe(ctx.user.userId, input.endpoint);
    return { success: true };
  });
