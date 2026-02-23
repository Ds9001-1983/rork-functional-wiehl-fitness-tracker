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
    description: z.string().optional(),
    exercises: z.array(workoutExerciseSchema).optional(),
    assignedTo: z.array(z.string()).optional(),
    schedule: z.array(z.object({
      dayOfWeek: z.number(),
      time: z.string().optional(),
    })).optional(),
  }))
  .mutation(async ({ input }) => {
    const { id, ...updates } = input;
    const plan = await storage.workoutPlans.update(id, updates);

    if (!plan) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'PLAN_NOT_FOUND' });
    }
    return plan;
  });
