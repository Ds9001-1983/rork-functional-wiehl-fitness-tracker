import { storage } from './storage';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
}

/**
 * Send push notification to a specific user via Expo Push API.
 * Supports both Expo Push Tokens (native) and Web Push subscriptions.
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<void> {
  try {
    const subscriptions = await storage.pushSubscriptions.list(userId);
    if (!subscriptions || subscriptions.length === 0) return;

    const messages: PushMessage[] = [];

    for (const sub of subscriptions) {
      const endpoint = (sub as any).endpoint || '';
      // Expo Push Token starts with "ExponentPushToken[" or "ExpoPushToken["
      if (endpoint.startsWith('ExponentPushToken[') || endpoint.startsWith('ExpoPushToken[')) {
        messages.push({
          to: endpoint,
          title,
          body,
          data,
          sound: 'default',
        });
      }
      // Web push subscriptions are handled separately (existing behavior)
    }

    if (messages.length === 0) return;

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      console.error('[PushSender] Expo Push API Fehler:', response.status, await response.text());
    }
  } catch (err) {
    console.error('[PushSender] Fehler beim Senden:', err);
  }
}
