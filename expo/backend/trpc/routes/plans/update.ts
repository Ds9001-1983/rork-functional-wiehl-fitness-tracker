import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../../create-context";
import { getPool } from "../../../storage";

export default protectedProcedure
  .input(z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    exercises: z.any().optional(),
    schedule: z.any().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== 'trainer') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Nur Trainer dürfen Pläne bearbeiten.' });
    }

    const pool = getPool();
    if (!pool) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Datenbank nicht verfügbar.' });

    const result = await pool.query(
      `UPDATE workout_plans SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        exercises = COALESCE($3, exercises),
        schedule = COALESCE($4, schedule),
        updated_at = NOW()
      WHERE id = $5 AND created_by = $6
      RETURNING id::text, name, description, exercises, schedule, created_by as "createdBy"`,
      [
        input.name || null,
        input.description || null,
        input.exercises ? JSON.stringify(input.exercises) : null,
        input.schedule ? JSON.stringify(input.schedule) : null,
        parseInt(input.id),
        parseInt(ctx.user.userId),
      ]
    );

    if (result.rows.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Plan nicht gefunden.' });
    }

    console.log('[Server] Updated plan:', input.id);
    return result.rows[0];
  });
