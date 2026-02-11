import { z } from 'zod';
import { trainerProcedure } from '../../create-context';
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

export default trainerProcedure
  .input(z.object({
    name: z.string(),
    description: z.string().optional(),
    exercises: z.array(workoutExerciseSchema),
    createdBy: z.string(),
    assignedTo: z.array(z.string()).optional(),
    schedule: z.array(z.object({
      dayOfWeek: z.number(),
      time: z.string().optional(),
    })).optional(),
  }))
  .mutation(async ({ input }) => {
    const plan = await storage.workoutPlans.create({
      name: input.name,
      description: input.description,
      exercises: input.exercises,
      createdBy: input.createdBy,
      assignedTo: input.assignedTo || [],
      schedule: input.schedule,
    });

    console.log('[Server] Created workout plan:', plan.id, 'by:', input.createdBy);
    return plan;
  });
