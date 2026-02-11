import { z } from 'zod';
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
    userId: z.string(),
    name: z.string(),
    date: z.string(),
    duration: z.number().optional(),
    exercises: z.array(workoutExerciseSchema),
    completed: z.boolean(),
    createdBy: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    const workout = await storage.workouts.create({
      userId: input.userId,
      name: input.name,
      date: input.date,
      duration: input.duration,
      exercises: input.exercises,
      completed: input.completed,
      createdBy: input.createdBy,
    });

    console.log('[Server] Created workout:', workout.id, 'for user:', input.userId);
    return workout;
  });
