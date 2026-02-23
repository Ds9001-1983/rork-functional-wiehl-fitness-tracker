import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';

const workoutSetSchema = z.object({
  id: z.string(),
  reps: z.number(),
  weight: z.number(),
  completed: z.boolean(),
  restTime: z.number().optional(),
  type: z.string().optional(),
});

const workoutExerciseSchema = z.object({
  id: z.string(),
  exerciseId: z.string(),
  sets: z.array(workoutSetSchema),
  notes: z.string().optional(),
});

export default protectedProcedure
  .input(z.object({
    id: z.string(),
    name: z.string().optional(),
    duration: z.number().optional(),
    exercises: z.array(workoutExerciseSchema).optional(),
    completed: z.boolean().optional(),
  }))
  .mutation(async ({ input }) => {
    const { id, ...updates } = input;
    const workout = await storage.workouts.update(id, updates);

    if (!workout) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'WORKOUT_NOT_FOUND' });
    }

    console.log('[Server] Updated workout:', id);
    return workout;
  });
