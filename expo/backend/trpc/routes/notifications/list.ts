import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({ limit: z.number().optional() }).optional())
  .query(async ({ input, ctx }) => {
    const userId = ctx.user.userId;
    console.log('[Notifications] list for userId:', userId);
    const results = await storage.notifications.getByUserId(userId, input?.limit || 50);
    console.log('[Notifications] found', results.length, 'notifications');
    return results;
  });
