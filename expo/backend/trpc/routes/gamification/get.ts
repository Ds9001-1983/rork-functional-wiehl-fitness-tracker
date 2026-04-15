import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({ userId: z.string() }))
  .query(async ({ input }) => {
    return storage.gamification.get(input.userId);
  });
