import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    // Nur eigene Benachrichtigungen dürfen als gelesen markiert werden.
    return storage.notifications.markRead(input.id, ctx.user.userId);
  });
