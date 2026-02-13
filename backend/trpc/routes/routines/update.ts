import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({
    id: z.string(),
    name: z.string().optional(),
    exercises: z.array(z.any()).optional(),
    timesUsed: z.number().optional(),
    lastUsed: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    const { id, ...updates } = input;
    return storage.routines.update(id, updates);
  });
