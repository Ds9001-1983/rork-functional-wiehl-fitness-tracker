import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default protectedProcedure
  .input(z.object({
    confirmEmail: z.string().email(),
  }))
  .mutation(async ({ ctx, input }) => {
    // Verify email matches the authenticated user
    if (input.confirmEmail !== ctx.user.email) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'E-Mail stimmt nicht überein. Bitte gib deine registrierte E-Mail zur Bestätigung ein.',
      });
    }

    const success = await storage.privacy.deleteUserData(ctx.user.userId);

    if (!success) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Konto konnte nicht gelöscht werden. Bitte kontaktiere den Support.',
      });
    }

    console.log(`[Privacy] DSGVO: Account deleted for user ${ctx.user.userId} (${ctx.user.email})`);
    return { success: true, message: 'Dein Konto und alle Daten wurden gelöscht.' };
  });
