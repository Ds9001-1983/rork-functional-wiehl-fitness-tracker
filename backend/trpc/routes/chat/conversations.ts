import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default protectedProcedure
  .query(async ({ ctx }) => {
    const conversations = await storage.chatMessages.getConversations(ctx.user.userId);
    return conversations;
  });
