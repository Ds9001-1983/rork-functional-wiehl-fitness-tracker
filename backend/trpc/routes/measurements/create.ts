import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({
    userId: z.string(),
    date: z.string(),
    measurements: z.record(z.string(), z.number()),
  }))
  .mutation(async ({ input }) => {
    const result = await storage.measurements.create(input);
    return result;
  });
