import { z } from "zod";

export const workoutSetSchema = z.object({
  reps: z.number(),
  weight: z.number(),
  completed: z.boolean(),
  restTime: z.number().optional(),
});

export const workoutExerciseSchema = z.object({
  exerciseId: z.string(),
  sets: z.array(workoutSetSchema),
  notes: z.string().optional(),
});
