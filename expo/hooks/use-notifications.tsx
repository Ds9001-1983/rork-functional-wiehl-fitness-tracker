import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { trpcClient } from '@/lib/trpc';

// Notification-Verhalten konfigurieren
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function useNotifications(userId: string | null) {
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  const registerForPushNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      // Berechtigungen anfragen
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[Notifications] Permission nicht erteilt');
        return;
      }

      // Push-Token holen
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      const token = tokenData.data;
      console.log('[Notifications] Push token:', token);

      // Token am Server registrieren
      await trpcClient.push.register.mutate({ token });
      console.log('[Notifications] Token am Server registriert');

      // Android-Kanal einrichten
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Functional Wiehl',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
        });
      }
    } catch (error) {
      console.error('[Notifications] Registrierung fehlgeschlagen:', error);
    }
  }, [userId]);

  useEffect(() => {
    registerForPushNotifications();

    // Listener für eingehende Notifications (App im Vordergrund)
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[Notifications] Empfangen:', notification.request.content.title);
    });

    // Listener für Notification-Tap (App wird geöffnet)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[Notifications] Getappt:', response.notification.request.content.data);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [registerForPushNotifications]);
}
