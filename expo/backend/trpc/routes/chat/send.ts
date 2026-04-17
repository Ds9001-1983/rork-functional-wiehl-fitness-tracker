import { protectedProcedure } from '../../create-context';
import { storage, getPool } from '../../../storage';
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

    try {
      let senderName = ctx.user.email.split('@')[0];
      const pool = getPool();
      if (pool) {
        const r = await pool.query('SELECT name FROM users WHERE id = $1', [parseInt(ctx.user.userId)]);
        if (r.rows[0]?.name) senderName = r.rows[0].name;
      }
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
