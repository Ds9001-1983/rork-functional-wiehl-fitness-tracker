import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default protectedProcedure
  .query(async ({ ctx }) => {
    const userId = ctx.user.userId;
    return storage.notifications.getUnreadCount(userId);
  });
