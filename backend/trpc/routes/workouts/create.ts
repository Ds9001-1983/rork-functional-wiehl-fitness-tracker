import { z } from 'zod';
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
    userId: z.string(),
    name: z.string().max(255),
    date: z.string(),
    duration: z.number().min(0).max(86400000).optional(),
    exercises: z.array(workoutExerciseSchema).max(50),
    completed: z.boolean(),
    createdBy: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    const workout = await storage.workouts.create({
      userId: input.userId,
      name: input.name,
      date: input.date,
      duration: input.duration,
      exercises: input.exercises,
      completed: input.completed,
      createdBy: input.createdBy,
    });
    return workout;
  });
