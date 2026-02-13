import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({ userId: z.string() }))
  .mutation(async ({ input }) => {
    return storage.notifications.markAllRead(input.userId);
  });
