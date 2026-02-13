import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({ challengeId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    return storage.challenges.join(input.challengeId, ctx.user.userId);
  });
