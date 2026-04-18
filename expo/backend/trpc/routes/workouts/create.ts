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

    // Stats aktualisieren: totalWorkouts + totalVolume (atomarer Update)
    const pool = getPool();
    if (input.completed && pool) {
      const userIdInt = Number.parseInt(input.userId, 10);
      if (!Number.isFinite(userIdInt)) {
        console.error('[Server] Stats update skipped — invalid userId:', input.userId);
      } else {
        const client = await pool.connect();
        try {
          const totalVolume = input.exercises.reduce((total, ex) =>
            total + ex.sets.reduce((setTotal, s) => setTotal + (s.weight * s.reps), 0), 0
          );

          await client.query('BEGIN');
          await client.query(
            `UPDATE users SET
              total_workouts = COALESCE(total_workouts, 0) + 1,
              total_volume = COALESCE(total_volume, 0) + $1
            WHERE id = $2`,
            [Math.round(totalVolume), userIdInt]
          );
          await client.query('COMMIT');
          console.log('[Server] Updated stats for user:', input.userId, 'volume:', totalVolume);
        } catch (err) {
          try { await client.query('ROLLBACK'); } catch {}
          console.error('[Server] Stats update failed (non-blocking):', err);
        } finally {
          client.release();
        }
      }
    }

    console.log('[Server] Created workout:', workout.id, 'for user:', input.userId);

    // Wenn Trainer einem Kunden ein Training zuweist: Notification + Push
    if (createdBy && input.userId !== ctx.user.userId) {
      try {
        await storage.notifications.create({
          userId: input.userId,
          title: 'Neues Training',
          body: `Dein Trainer hat dir ein Training zugewiesen: "${input.name}".`,
          type: 'system',
          data: { type: 'workout_assigned', workoutId: workout.id },
        });
      } catch (err) {
        console.error('[Server] in-app notification failed for user', input.userId, err);
      }

      try {
        const pushToken = await storage.pushTokens.getByUserId(input.userId);
        if (pushToken) {
          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: pushToken,
              sound: 'default',
              title: 'Neues Training!',
              body: `Dein Trainer hat dir "${input.name}" zugewiesen.`,
              data: { type: 'workout_assigned', workoutId: workout.id },
            }),
          });
          if (!response.ok) {
            console.error('[Server] Expo Push API error:', response.status);
          } else {
            console.log('[Server] Push notification sent to user', input.userId);
          }
        } else {
          console.log('[Server] No push token for user', input.userId);
        }
      } catch (err) {
        console.error('[Server] Push notification failed for user', input.userId, err);
      }
    }

    return workout;
  });
