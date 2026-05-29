import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({ userId: z.string().optional() }).optional())
  .query(async ({ ctx, input }) => {
    // Körpermaße sind Gesundheitsdaten (DSGVO Art. 9): Clients sehen NUR eigene,
    // Trainer/Admin dürfen gezielt fremde abrufen (Client-Progress).
    const isStaff = ctx.user.role === 'trainer' || ctx.user.role === 'admin';
    const targetUserId = isStaff && input?.userId ? input.userId : ctx.user.userId;
    return storage.measurements.getByUserId(targetUserId);
  });
