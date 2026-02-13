import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({ limit: z.number().optional() }))
  .query(async ({ input }) => {
    return storage.gamification.leaderboard(input.limit || 20);
  });
