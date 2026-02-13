import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({ challengeId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const result = await storage.challenges.join(input.challengeId, ctx.user.userId);

    // Confirm join notification
    try {
      const challenges = await storage.challenges.getActive();
      const challenge = challenges.find((c: any) => c.id === input.challengeId);
      if (challenge) {
        await storage.notifications.create({
          userId: ctx.user.userId,
          title: 'Challenge beigetreten!',
          body: `Du nimmst jetzt an "${challenge.name}" teil. Viel Erfolg!`,
          type: 'challenge',
        });
      }
    } catch {
      // Non-critical
    }

    return result;
  });
