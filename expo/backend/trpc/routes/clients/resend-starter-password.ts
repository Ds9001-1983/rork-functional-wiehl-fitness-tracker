import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { trainerProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default trainerProcedure
  .input(z.object({ id: z.string(), email: z.string().email().optional() }))
  .mutation(async ({ input }) => {
    let resolvedId = input.id;
    let result = await storage.clients.regenerateStarterPassword(resolvedId);

    // Fallback: Falls die übergebene ID ungültig/unbekannt ist (z. B. veralteter
    // App-Cache mit Timestamp-ID), den Kunden über die E-Mail auflösen.
    if (!result.ok && input.email) {
      const client = await storage.clients.findByEmail(input.email);
      if (client) {
        resolvedId = client.id;
        result = await storage.clients.regenerateStarterPassword(resolvedId);
      }
    }

    if (!result.ok) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'CLIENT_NOT_FOUND' });
    }

    // Offene Reset-Anfrage-Notifications für diesen Kunden bei allen Trainern entfernen
    try {
      const removed = await storage.notifications.deleteByTypeAndClient('password_reset_request', resolvedId);
      if (removed > 0) console.log('[Clients] Removed', removed, 'reset-request notifications for client', resolvedId);
    } catch (err) {
      console.log('[Clients] Could not remove reset-request notifications:', err);
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const APP_URL = process.env.APP_URL || 'https://app.functional-wiehl.de';
    let emailSent = false;

    if (RESEND_API_KEY) {
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Functional Wiehl <noreply@functional-wiehl.de>',
            to: [result.email],
            subject: 'Dein neues Starter-Passwort',
            html: `<p>Hallo ${result.name || ''},</p>
<p>Du hast ein neues Starter-Passwort für die Functional Wiehl App erhalten:</p>
<p style="font-size:18px;font-weight:bold;letter-spacing:2px;background:#f4f4f4;padding:10px 16px;border-radius:6px;display:inline-block">${result.password}</p>
<p>Logge dich unter <a href="${APP_URL}">${APP_URL}</a> mit dieser E-Mail-Adresse und dem Passwort ein. Beim ersten Login wirst du gebeten, ein eigenes Passwort zu setzen.</p>
<p>Functional Wiehl</p>`,
          }),
        });
        emailSent = r.ok;
        if (!r.ok) {
          console.log('[Clients] Resend Starter PW Email failed:', r.status, await r.text());
        }
      } catch (err) {
        console.log('[Clients] Resend Starter PW Email exception:', err);
      }
    }

    return { success: true, emailSent, email: result.email, password: result.password };
  });
