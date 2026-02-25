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
      ctx.user.userId,
      input.receiverId,
      input.message
    );

    // Create notification for receiver
    try {
      const allClients = await storage.clients.getAll();
      const sender = allClients.find((c: any) => c.userId === ctx.user.userId || c.id === ctx.user.userId);
      const senderName = sender?.name || 'Jemand';
      const preview = input.message.length > 50 ? input.message.slice(0, 50) + '...' : input.message;

      await storage.notifications.create({
        userId: input.receiverId,
        title: `Neue Nachricht von ${senderName}`,
        body: preview,
        type: 'chat',
        data: { senderId: ctx.user.userId },
      });
    } catch (err) {
      console.log('[Chat] Failed to create notification:', err);
    }

    return result;
  });
