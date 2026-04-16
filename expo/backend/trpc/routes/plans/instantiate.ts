import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { trainerProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default trainerProcedure
  .input(z.object({
    templateId: z.string(),
    userIds: z.array(z.string()).min(1),
  }))
  .mutation(async ({ input, ctx }) => {
    const instances = [];

    for (const userId of input.userIds) {
      const instance = await storage.workoutPlans.instantiate(
        input.templateId,
        userId
      );

      if (!instance) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'TEMPLATE_NOT_FOUND',
        });
      }

      instances.push(instance);
    }

    // Benachrichtigungen fuer zugewiesene Kunden erstellen + Push
    for (let i = 0; i < instances.length; i++) {
      const userId = input.userIds[i];
      const planName = instances[i].name;
      const planId = instances[i].id;

      try {
        await storage.notifications.create({
          userId,
          title: 'Neuer Trainingsplan',
          body: `Dein Trainer hat dir den Plan "${planName}" zugewiesen.`,
          type: 'system',
          data: { type: 'plan_assigned', planId, templateId: input.templateId },
        });
      } catch (err) {
        console.error('[Server] in-app notification failed for user', userId, err);
      }

      try {
        const pushToken = await storage.pushTokens.getByUserId(userId);
        if (pushToken) {
          await sendPushNotification(pushToken, {
            title: 'Neuer Trainingsplan!',
            body: `Dir wurde der Plan "${planName}" zugewiesen.`,
            data: { type: 'plan_assigned', planId },
          });
          console.log('[Server] Push notification sent to user', userId);
        } else {
          console.log('[Server] No push token for user', userId);
        }
      } catch (err) {
        console.error('[Server] Push notification failed for user', userId, err);
      }
    }
    return { success: true, instances };
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
