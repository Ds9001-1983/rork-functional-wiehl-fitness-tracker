import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../../create-context";
import { storage } from "../../../storage";

// Legacy endpoint: erzeugt jetzt eine eigenständige Instance (wie plans.instantiate),
// damit Trainer-Edits am Template den Kunden nicht mehr beeinflussen.
// Alte App-Versionen (≤ 1.0.7) rufen weiterhin diesen Endpoint auf.
export default protectedProcedure
  .input(z.object({
    planId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== 'trainer' && ctx.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Nur Trainer dürfen Pläne zuweisen.' });
    }

    const instance = await storage.workoutPlans.instantiate(input.planId, input.userId);
    if (!instance) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'TEMPLATE_NOT_FOUND' });
    }

    try {
      await storage.notifications.create({
        userId: input.userId,
        title: 'Neuer Trainingsplan',
        body: `Dein Trainer hat dir den Plan "${instance.name}" zugewiesen.`,
        type: 'system',
        data: { type: 'plan_assigned', planId: instance.id, templateId: input.planId },
      });
    } catch (err) {
      console.error('[Server] in-app notification failed for user', input.userId, err);
    }

    try {
      const pushToken = await storage.pushTokens.getByUserId(input.userId);
      if (pushToken) {
        await sendPushNotification(pushToken, {
          title: 'Neuer Trainingsplan!',
          body: `Dir wurde der Plan "${instance.name}" zugewiesen.`,
          data: { type: 'plan_assigned', planId: instance.id },
        });
        console.log('[Server] Push notification sent to user', input.userId);
      }
    } catch (err) {
      console.error('[Server] Push notification failed:', err);
    }

    console.log('[Server] Instantiated plan', input.planId, '→ instance', instance.id, 'for user', input.userId);
    return { success: true, instance };
  });

async function sendPushNotification(
  token: string,
  notification: { title: string; body: string; data?: Record<string, unknown> }
) {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
