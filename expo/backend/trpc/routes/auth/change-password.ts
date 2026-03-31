import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../create-context';
import { getPool } from '../../../storage';
import bcrypt from 'bcryptjs';

export const changePasswordProcedure = protectedProcedure
  .input(z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(6),
  }))
  .mutation(async ({ ctx, input }) => {
    const { userId } = ctx.user;
    const pool = getPool();
    if (!pool) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Datenbank nicht verfügbar.' });

    const userResult = await pool.query('SELECT password FROM users WHERE id = $1', [parseInt(userId)]);
    if (userResult.rows.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Benutzer nicht gefunden.' });
    }

    const isValid = await bcrypt.compare(input.currentPassword, userResult.rows[0].password);
    if (!isValid) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'INVALID_CURRENT_PASSWORD' });
    }

    const hashedPassword = await bcrypt.hash(input.newPassword, 10);
    await pool.query(
      'UPDATE users SET password = $1, password_changed = true, updated_at = NOW() WHERE id = $2',
      [hashedPassword, parseInt(userId)]
    );

    console.log('[Server] Password changed for user:', userId);
    return { success: true };
  });
