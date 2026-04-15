import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({
    endpoint: z.string(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  }))
  .mutation(async ({ input, ctx }) => {
    const result = await storage.pushSubscriptions.subscribe(
      ctx.user.userId,
      input.endpoint,
      input.keys.p256dh,
      input.keys.auth
    );
    return { success: result };
  });
