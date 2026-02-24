import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({
    userId: z.string(),
    date: z.string(),
    measurements: z.record(z.string().max(50), z.number().min(0).max(999)),
  }))
  .mutation(async ({ input }) => {
    const result = await storage.measurements.create(input);
    return result;
  });
