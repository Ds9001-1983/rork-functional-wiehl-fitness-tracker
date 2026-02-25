import { z } from 'zod';
import { trainerProcedure } from '../../create-context';
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

export default trainerProcedure
  .input(z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(2000).optional(),
    exercises: z.array(workoutExerciseSchema).max(50),
    createdBy: z.string(),
    assignedTo: z.array(z.string()).max(100).optional(),
    schedule: z.array(z.object({
      dayOfWeek: z.number().min(0).max(6),
      time: z.string().max(10).optional(),
    })).max(7).optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    const plan = await storage.workoutPlans.create({
      name: input.name,
      description: input.description,
      exercises: input.exercises,
      createdBy: input.createdBy,
      assignedTo: input.assignedTo || [],
      schedule: input.schedule,
    });
    return plan;
  });
