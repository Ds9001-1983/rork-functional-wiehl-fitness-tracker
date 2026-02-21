import { publicProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';
import crypto from 'crypto';

export default publicProcedure
  .input(z.object({ email: z.string().email() }))
  .mutation(async ({ input }) => {
    const user = await storage.users.findByEmail(input.email);
    if (!user) {
      // Don't reveal if email exists
      return { success: true, message: 'Falls ein Konto mit dieser E-Mail existiert, wurde ein Reset-Link gesendet.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour
    await storage.passwordResets.create(user.id, token, expiresAt);

    // Send email via Resend API
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const APP_URL = process.env.APP_URL || 'https://app.functional-wiehl.de';

    if (RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Functional Wiehl <noreply@functional-wiehl.de>',
            to: [input.email],
            subject: 'Passwort zurücksetzen',
            html: `<p>Hallo,</p><p>Klicke auf den folgenden Link, um dein Passwort zurückzusetzen:</p><p><a href="${APP_URL}/reset-password?token=${token}">Passwort zurücksetzen</a></p><p>Der Link ist 1 Stunde gültig.</p><p>Functional Wiehl</p>`,
          }),
        });
      } catch (err) {
        console.log('[Auth] Email send failed:', err);
      }
    }

    return { success: true, message: 'Falls ein Konto mit dieser E-Mail existiert, wurde ein Reset-Link gesendet.' };
  });
