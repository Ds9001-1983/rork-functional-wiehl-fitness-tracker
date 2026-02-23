import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({
    otherUserId: z.string(),
    limit: z.number().optional(),
  }))
  .query(async ({ input, ctx }) => {
    const messages = await storage.chatMessages.list(
      ctx.user.userId,
      input.otherUserId,
      input.limit || 50
    );
    // Mark messages as read
    await storage.chatMessages.markRead(ctx.user.userId, input.otherUserId);
    return messages;
  });
