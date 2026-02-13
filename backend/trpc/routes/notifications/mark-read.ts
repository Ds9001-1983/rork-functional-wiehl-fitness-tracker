import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input }) => {
    return storage.notifications.markRead(input.id);
  });
