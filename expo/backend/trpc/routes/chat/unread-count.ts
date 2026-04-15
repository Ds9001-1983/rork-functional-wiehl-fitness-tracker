import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default protectedProcedure
  .query(async ({ ctx }) => {
    const count = await storage.chatMessages.getUnreadCount(ctx.user.userId);
    return { count };
  });
