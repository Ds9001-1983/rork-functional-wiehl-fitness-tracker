import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import { trpcClient } from '@/lib/trpc';
import { syncQueue } from '@/lib/sync-queue';
import { registerForPushNotificationsAsync, registerPushTokenWithServer } from '@/lib/push-notifications';

interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'badge' | 'streak' | 'challenge' | 'system' | 'workout_reminder' | 'level' | 'chat';
  read: boolean;
  data?: any;
  createdAt: string;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  addLocalNotification: (title: string, body: string, type: string) => void;
}

const STORAGE_KEY = 'notifications';

// On native with push, poll less frequently (60s). On web keep 15s.
const POLL_INTERVAL = Platform.OS === 'web' ? 15000 : 60000;

export const [NotificationProvider, useNotifications] = createContextHook<NotificationState>(() => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const pushRegistered = useRef(false);

  const fetchNotifications = useCallback(async () => {
    try {
      // Check if user is logged in (has auth token)
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Routes now use ctx.user.userId from JWT - no userId input needed
      const [serverNotifs, serverCount] = await Promise.all([
        trpcClient.notifications.list.query(),
        trpcClient.notifications.unreadCount.query(),
      ]);

      const notifs = serverNotifs as AppNotification[];
      setNotifications(notifs);
      setUnreadCount((serverCount as any).count || 0);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notifs));
    } catch (err) {
      console.warn('[Notifications] Server-Fetch fehlgeschlagen:', err);
      // Fallback to local
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as AppNotification[];
          setNotifications(parsed);
          setUnreadCount(parsed.filter(n => !n.read).length);
        }
      } catch {
        // AsyncStorage not available
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Register native push notifications on mount
  useEffect(() => {
    if (Platform.OS === 'web' || pushRegistered.current) return;
    pushRegistered.current = true;

    (async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (!token) return;

        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          await registerPushTokenWithServer(pushToken);
        }
      } catch (err) {
        console.warn('[Notifications] Push-Registrierung fehlgeschlagen:', err);
      }
    })();
  }, []);

  // Set up native notification listeners
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let notificationListener: any;
    let responseListener: any;

    (async () => {
      try {
        const Notifications = await import('expo-notifications');

        // Listener for notifications received while app is in foreground
        notificationListener = Notifications.addNotificationReceivedListener(() => {
          // Refresh in-app notification list when a push arrives
          fetchNotifications();
        });

        // Listener for when user taps on a notification
        responseListener = Notifications.addNotificationResponseReceivedListener(() => {
          fetchNotifications();
        });
      } catch {
        // expo-notifications not available
      }
    })();

    return () => {
      notificationListener?.remove();
      responseListener?.remove();
    };
  }, [fetchNotifications]);

  // Fetch on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Poll for new notifications
  useEffect(() => {
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await trpcClient.notifications.markRead.mutate({ id });
    } catch {
      syncQueue.enqueue('notifications.markRead', { id });
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await trpcClient.notifications.markAllRead.mutate();
    } catch (err) {
      console.warn('[Notifications] markAllRead fehlgeschlagen:', err);
    }
  }, []);

  const addLocalNotification = useCallback((title: string, body: string, type: string) => {
    const notif: AppNotification = {
      id: Date.now().toString(),
      userId: '',
      title,
      body,
      type: type as AppNotification['type'],
      read: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [notif, ...prev]);
    setUnreadCount(prev => prev + 1);
  }, []);

  return useMemo(() => ({
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markRead,
    markAllRead,
    addLocalNotification,
  }), [notifications, unreadCount, isLoading, fetchNotifications, markRead, markAllRead, addLocalNotification]);
});
