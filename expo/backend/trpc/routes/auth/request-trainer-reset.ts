import { publicProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { sendPushToUser } from '../../../push/send';
import { z } from 'zod';

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const recentRequests = new Map<string, number[]>();

function isRateLimited(email: string): boolean {
  const now = Date.now();
  const list = (recentRequests.get(email) || []).filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  if (list.length >= RATE_LIMIT_MAX) {
    recentRequests.set(email, list);
    return true;
  }
  list.push(now);
  recentRequests.set(email, list);
  return false;
}

export default publicProcedure
  .input(z.object({ email: z.string().email() }))
  .mutation(async ({ input }) => {
    const normalizedEmail = input.email.trim().toLowerCase();

    if (isRateLimited(normalizedEmail)) {
      console.log('[Auth] Trainer-Reset rate-limited for', normalizedEmail);
      return { success: true };
    }

    const result = await storage.clients.markResetRequest(normalizedEmail);

    if (result.ok) {
      const trainers = await storage.users.listByRole('trainer');
      for (const trainer of trainers) {
        try {
          await storage.notifications.create({
            userId: trainer.id,
            title: 'Passwort-Reset angefragt',
            body: `${result.name || normalizedEmail} hat ein Passwort-Reset angefragt.`,
            type: 'password_reset_request',
            data: { clientId: result.clientId, email: normalizedEmail },
          });
        } catch (err) {
          console.log('[Auth] Notification create failed for trainer', trainer.id, err);
        }
        try {
          await sendPushToUser(
            trainer.id,
            'Passwort-Reset angefragt',
            `${result.name || normalizedEmail} braucht ein neues Starter-Passwort.`,
            { type: 'password_reset_request', clientId: result.clientId },
          );
        } catch (err) {
          console.log('[Auth] Push send failed for trainer', trainer.id, err);
        }
      }
      console.log('[Auth] Trainer-Reset request registered for clientId', result.clientId);
    } else {
      console.log('[Auth] Trainer-Reset request for unknown email:', normalizedEmail);
    }

    return { success: true };
  });
