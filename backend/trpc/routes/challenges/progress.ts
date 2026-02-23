import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({ challengeId: z.string() }))
  .query(async ({ input }) => {
    return storage.challenges.getProgress(input.challengeId);
  });
