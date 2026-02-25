import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';

const workoutSetSchema = z.object({
  id: z.string(),
  reps: z.number().min(0).max(9999),
  weight: z.number().min(0).max(9999),
  completed: z.boolean(),
  restTime: z.number().min(0).max(600).optional(),
  type: z.string().max(20).optional(),
});

const workoutExerciseSchema = z.object({
  id: z.string(),
  exerciseId: z.string(),
  sets: z.array(workoutSetSchema).max(50),
  notes: z.string().max(500).optional(),
});

export default protectedProcedure
  .input(z.object({
    id: z.string(),
    name: z.string().max(255).optional(),
    duration: z.number().min(0).max(86400000).optional(),
    exercises: z.array(workoutExerciseSchema).max(50).optional(),
    completed: z.boolean().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    // Ownership check: only owner or trainer/admin can update
    const existing = await storage.workouts.getById(input.id);
    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'WORKOUT_NOT_FOUND' });
    }
    if (existing.userId !== ctx.user.userId && ctx.user.role !== 'trainer' && ctx.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Keine Berechtigung' });
    }

    const { id, ...updates } = input;
    const workout = await storage.workouts.update(id, updates);

    if (!workout) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'WORKOUT_NOT_FOUND' });
    }
    return workout;
  });
