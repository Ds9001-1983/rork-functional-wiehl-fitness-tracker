import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({
    userId: z.string().optional(),
    date: z.string(),
    measurements: z.record(z.string().max(50), z.number().min(0).max(999)),
  }))
  .mutation(async ({ ctx, input }) => {
    // Körpermaße werden immer dem eingeloggten Nutzer zugeordnet (input.userId wird ignoriert).
    const result = await storage.measurements.create({
      userId: ctx.user.userId,
      date: input.date,
      measurements: input.measurements,
    });
    return result;
  });
