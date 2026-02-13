import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({ userId: z.string(), limit: z.number().optional() }))
  .query(async ({ input }) => {
    return storage.notifications.getByUserId(input.userId, input.limit || 50);
  });
