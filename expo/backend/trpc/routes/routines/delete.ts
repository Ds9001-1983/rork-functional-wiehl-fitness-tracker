import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    // Owner-Scope: nur eigene Routinen dürfen gelöscht werden.
    return storage.routines.delete(input.id, ctx.user.userId);
  });
