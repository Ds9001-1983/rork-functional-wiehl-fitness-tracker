import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../../create-context";
import { storage, getPool } from "../../../storage";
import { workoutExerciseSchema } from "./schemas";

export default protectedProcedure
  .input(z.object({
    name: z.string(),
    date: z.string(),
    duration: z.number().optional(),
    exercises: z.array(workoutExerciseSchema),
    completed: z.boolean(),
    userId: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    // Clients dürfen nur Workouts für sich selbst erstellen
    if (ctx.user.role === 'client' && input.userId !== ctx.user.userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Kein Zugriff auf fremde Workout-Daten.',
      });
    }

    const createdBy = ctx.user.role === 'trainer' ? ctx.user.userId : undefined;

    const workout = await storage.workouts.create({
      name: input.name,
      date: input.date,
      duration: input.duration,
      exercises: input.exercises,
      completed: input.completed,
      userId: input.userId,
      createdBy,
    });

    // Stats aktualisieren: totalWorkouts + totalVolume
    const pool = getPool();
    if (input.completed && pool) {
      try {
        const totalVolume = input.exercises.reduce((total, ex) =>
          total + ex.sets.reduce((setTotal, s) => setTotal + (s.weight * s.reps), 0), 0
        );

        await pool.query(
          `UPDATE users SET
            total_workouts = COALESCE(total_workouts, 0) + 1,
            total_volume = COALESCE(total_volume, 0) + $1
          WHERE id = $2`,
          [Math.round(totalVolume), parseInt(input.userId)]
        );
        console.log('[Server] Updated stats for user:', input.userId, 'volume:', totalVolume);
      } catch (err) {
        console.error('[Server] Stats update failed (non-blocking):', err);
      }
    }

    console.log('[Server] Created workout:', workout.id, 'for user:', input.userId);
    return workout;
  });
