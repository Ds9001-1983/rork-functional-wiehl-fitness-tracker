import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../../create-context";
import { storage } from "../../../storage";

export default protectedProcedure
  .input(z.object({
    planId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== 'trainer') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Nur Trainer dürfen Pläne zuweisen.' });
    }

    await storage.workoutPlans.assign(input.planId, input.userId);

    // Push-Notification an den Kunden senden
    const pushToken = await storage.pushTokens.getByUserId(input.userId);
    if (pushToken) {
      try {
        const plan = (await storage.workoutPlans.getByCreator(ctx.user.userId)).find(p => p.id === input.planId);
        await sendPushNotification(pushToken, {
          title: 'Neuer Trainingsplan!',
          body: `Dir wurde der Plan "${plan?.name || 'Trainingsplan'}" zugewiesen.`,
          data: { type: 'plan_assigned', planId: input.planId },
        });
        console.log('[Server] Push notification sent to user', input.userId);
      } catch (err) {
        console.error('[Server] Push notification failed:', err);
        // Fehler bei Notification soll Zuweisung nicht blockieren
      }
    }

    console.log('[Server] Assigned plan', input.planId, 'to user', input.userId);
    return { success: true };
  });

async function sendPushNotification(
  token: string,
  notification: { title: string; body: string; data?: any }
) {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data,
    }),
  });

  if (!response.ok) {
    throw new Error(`Expo Push API error: ${response.status}`);
  }
}
