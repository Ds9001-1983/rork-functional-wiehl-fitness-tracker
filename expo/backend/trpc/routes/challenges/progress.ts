import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({ challengeId: z.string() }))
  .query(async ({ ctx, input }) => {
    const progress = await storage.challenges.getProgress(input.challengeId);
    // Clients sehen Fortschritt/Leaderboard nur, wenn sie selbst an der Challenge teilnehmen.
    const isStaff = ctx.user.role === 'trainer' || ctx.user.role === 'admin';
    if (!isStaff && !progress.some(p => p.userId === ctx.user.userId)) {
      return [];
    }
    return progress;
  });
