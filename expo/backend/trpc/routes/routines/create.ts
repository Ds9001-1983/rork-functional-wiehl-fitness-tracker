import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({
    userId: z.string().optional(),
    name: z.string().min(1).max(255),
    exercises: z.array(z.object({
      exerciseId: z.string(),
      sets: z.number().min(0).max(99).optional(),
      reps: z.number().min(0).max(9999).optional(),
      weight: z.number().min(0).max(9999).optional(),
      notes: z.string().max(500).optional(),
    })).max(50),
  }))
  .mutation(async ({ ctx, input }) => {
    // Routinen sind immer dem eingeloggten Nutzer zugeordnet (input.userId wird ignoriert).
    return storage.routines.create({ userId: ctx.user.userId, name: input.name, exercises: input.exercises });
  });
