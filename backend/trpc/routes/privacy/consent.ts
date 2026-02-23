import { z } from 'zod';
import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default protectedProcedure
  .input(z.object({
    accepted: z.boolean(),
    version: z.string().default('1.0'),
  }))
  .mutation(async ({ ctx, input }) => {
    if (!input.accepted) {
      return { success: false, message: 'Zustimmung erforderlich' };
    }

    const success = await storage.privacy.recordConsent(ctx.user.userId, input.version);

    console.log(`[Privacy] Consent recorded for user ${ctx.user.userId}, version ${input.version}`);
    return { success };
  });
