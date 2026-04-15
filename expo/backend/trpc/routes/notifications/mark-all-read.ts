import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default protectedProcedure
  .mutation(async ({ ctx }) => {
    const userId = ctx.user.userId;
    return storage.notifications.markAllRead(userId);
  });
