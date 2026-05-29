import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({ userId: z.string().optional() }).optional())
  .query(async ({ ctx, input }) => {
    // Clients sehen NUR eigene Gamification-Daten; Trainer/Admin dürfen fremde abrufen.
    const isStaff = ctx.user.role === 'trainer' || ctx.user.role === 'admin';
    const targetUserId = isStaff && input?.userId ? input.userId : ctx.user.userId;
    return storage.gamification.get(targetUserId);
  });
