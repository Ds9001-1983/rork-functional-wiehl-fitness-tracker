import { storage } from '../storage';

const EXPO_PUSH_URL = 'https://exp.host/--/api/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: any;
  sound?: 'default';
  priority?: 'default' | 'high';
}

async function deliver(messages: PushMessage[]): Promise<void> {
  if (!messages.length) return;
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Accept-Encoding': 'gzip, deflate' },
      body: JSON.stringify(messages),
    });
    if (!res.ok) {
      console.log('[Push] ❌ Expo push failed:', res.status, await res.text());
    } else {
      console.log('[Push] ✅ Sent', messages.length, 'push(es)');
    }
  } catch (err) {
    console.log('[Push] ❌ Send error:', err);
  }
}

export async function sendPushToUser(userId: string, title: string, body: string, data?: any): Promise<void> {
  const token = await storage.pushTokens.getByUserId(userId);
  if (!token) { console.log('[Push] No token for user', userId); return; }
  await deliver([{ to: token, title, body, data, sound: 'default', priority: 'high' }]);
}

export async function sendPushToUsers(userIds: string[], title: string, body: string, data?: any): Promise<void> {
  if (!userIds.length) return;
  const tokens = await storage.pushTokens.getByUserIds(userIds);
  const messages = tokens.map(t => ({ to: t.token, title, body, data, sound: 'default' as const, priority: 'high' as const }));
  await deliver(messages);
}
