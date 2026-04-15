import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({
    userId: z.string(),
    name: z.string().min(1).max(255),
    exercises: z.array(z.object({
      exerciseId: z.string(),
      sets: z.number().min(0).max(99).optional(),
      reps: z.number().min(0).max(9999).optional(),
      weight: z.number().min(0).max(9999).optional(),
      notes: z.string().max(500).optional(),
    })).max(50),
  }))
  .mutation(async ({ input }) => {
    return storage.routines.create(input);
  });
