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
    description: z.string().max(2000).optional(),
    exercises: z.array(workoutExerciseSchema).max(50).optional(),
    assignedTo: z.array(z.string()).max(100).optional(),
    schedule: z.array(z.object({
      dayOfWeek: z.number().min(0).max(6),
      time: z.string().max(10).optional(),
    })).max(7).optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    // Ownership check: only creator or admin can update
    const existing = await storage.workoutPlans.getById(input.id);
    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'PLAN_NOT_FOUND' });
    }
    if (existing.createdBy !== ctx.user.userId && ctx.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Keine Berechtigung' });
    }

    const { id, ...updates } = input;
    const plan = await storage.workoutPlans.update(id, updates);

    if (!plan) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'PLAN_NOT_FOUND' });
    }
    return plan;
  });
