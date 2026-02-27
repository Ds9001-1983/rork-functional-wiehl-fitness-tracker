import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpcClient } from '@/lib/trpc';

const PUSH_TOKEN_KEY = 'expoPushToken';

/**
 * Register for native push notifications on iOS.
 * Returns the Expo Push Token string, or null if permissions denied.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  // Dynamic imports to avoid web bundling issues
  const Notifications = await import('expo-notifications');
  const Device = await import('expo-device');

  if (!Device.isDevice) {
    console.warn('[Push] Push-Notifications nur auf echten Geraeten verfuegbar.');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Push] Push-Berechtigung nicht erteilt.');
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

  // Configure notification behavior for iOS foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  return token;
}

/**
 * Register push token with the backend server.
 */
export async function registerPushTokenWithServer(token: string): Promise<void> {
  try {
    await trpcClient.notifications.subscribePush.mutate({
      endpoint: token,
      keys: { p256dh: 'expo-push', auth: 'expo-push' },
    });
  } catch (err) {
    console.warn('[Push] Token-Registrierung fehlgeschlagen:', err);
  }
}

/**
 * Unregister push token from the backend server.
 */
export async function unregisterPushTokenFromServer(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (token) {
      await trpcClient.notifications.unsubscribePush.mutate({ endpoint: token });
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    }
  } catch (err) {
    console.warn('[Push] Token-Abmeldung fehlgeschlagen:', err);
  }
}

/**
 * Get the stored push token.
 */
export async function getStoredPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
}
