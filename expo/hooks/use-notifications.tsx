import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { trpcClient } from '@/lib/trpc';
import { useWorkouts } from '@/hooks/use-workouts';

const isWeb = Platform.OS === 'web';

if (!isWeb) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

type PushData = { type?: string; workoutId?: string; planId?: string; instanceId?: string };

export function useNotifications(userId: string | null) {
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);
  const { refreshWorkouts } = useWorkouts();

  const handleTappedPush = useCallback(async (data: PushData) => {
    try {
      if (data?.type === 'workout_assigned' && data.workoutId) {
        await refreshWorkouts();
        router.push(`/workout-detail/${data.workoutId}`);
        return;
      }
      if (data?.type === 'plan_assigned' && data.planId) {
        await refreshWorkouts();
        router.push(`/plan-detail/${data.planId}`);
        return;
      }
    } catch (err) {
      console.error('[Notifications] Deeplink-Handling fehlgeschlagen:', err);
    }
  }, [refreshWorkouts]);

  const registerForPushNotifications = useCallback(async () => {
    if (isWeb) return;
    if (!userId) return;

    try {
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

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      const token = tokenData.data;
      console.log('[Notifications] Push token:', token);

      await trpcClient.push.register.mutate({ token });
      console.log('[Notifications] Token am Server registriert');

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
    if (isWeb) return;

    registerForPushNotifications();

    // Cold-Start: App via Push-Tap gestartet
    Notifications.getLastNotificationResponseAsync().then(last => {
      if (last) {
        const data = (last.notification.request.content.data ?? {}) as PushData;
        handleTappedPush(data);
      }
    }).catch(() => {});

    // Foreground: Push empfangen → Liste aktualisieren, damit Daten frisch sind
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      const data = (notification.request.content.data ?? {}) as PushData;
      console.log('[Notifications] Empfangen:', notification.request.content.title, data?.type);
      if (data?.type === 'workout_assigned' || data?.type === 'plan_assigned') {
        refreshWorkouts().catch(err => console.error('[Notifications] Refresh fehlgeschlagen:', err));
      }
    });

    // Tap: Deeplink auf Detail-Seite
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = (response.notification.request.content.data ?? {}) as PushData;
      console.log('[Notifications] Getappt:', data);
      handleTappedPush(data);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [registerForPushNotifications, refreshWorkouts, handleTappedPush]);
}
