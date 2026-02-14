import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({
    userId: z.string(),
    name: z.string(),
    exercises: z.array(z.object({
      exerciseId: z.string(),
      sets: z.number().optional(),
      reps: z.number().optional(),
      weight: z.number().optional(),
      notes: z.string().optional(),
    })),
  }))
  .mutation(async ({ input }) => {
    return storage.routines.create(input);
  });
