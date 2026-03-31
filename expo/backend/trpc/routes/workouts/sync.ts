import { z } from "zod";
import { protectedProcedure } from "../../create-context";
import { storage } from "../../../storage";
import { workoutExerciseSchema } from "./schemas";

const syncWorkoutSchema = z.object({
  localId: z.string(),
  name: z.string(),
  date: z.string(),
  duration: z.number().optional(),
  exercises: z.array(workoutExerciseSchema),
  completed: z.boolean(),
  userId: z.string(),
});

export default protectedProcedure
  .input(z.object({
    workouts: z.array(syncWorkoutSchema),
  }))
  .mutation(async ({ ctx, input }) => {
    const { userId } = ctx.user;

    // Sicherheit: Nur Workouts des authentifizierten Users synchronisieren
    const userWorkouts = input.workouts.filter(w => w.userId === userId);

    const results: Array<{ localId: string; serverId: string }> = [];

    for (const workout of userWorkouts) {
      try {
        const created = await storage.workouts.create({
          name: workout.name,
          date: workout.date,
          duration: workout.duration,
          exercises: workout.exercises,
          completed: workout.completed,
          userId: userId,
        });
        results.push({ localId: workout.localId, serverId: created.id });
      } catch (err) {
        console.error('[Server] Sync failed for workout:', workout.localId, err);
        // Einzelne Fehler überspringen, Rest weiter synchronisieren
      }
    }

    console.log('[Server] Synced', results.length, 'of', userWorkouts.length, 'workouts for user:', userId);
    return { synced: results.length, idMap: results };
  });
