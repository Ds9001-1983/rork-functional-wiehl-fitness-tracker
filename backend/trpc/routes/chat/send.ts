import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({
    receiverId: z.string(),
    message: z.string().min(1).max(2000),
  }))
  .mutation(async ({ input, ctx }) => {
    const result = await storage.chatMessages.send(
      ctx.user.studioId,
      ctx.user.userId,
      input.receiverId,
      input.message
    );
    return result;
  });
