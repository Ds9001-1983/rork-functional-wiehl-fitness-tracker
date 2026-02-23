import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { trpcClient } from '@/lib/trpc';
import { syncQueue } from '@/lib/sync-queue';

interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'badge' | 'streak' | 'challenge' | 'system' | 'workout_reminder' | 'level';
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

export const [NotificationProvider, useNotifications] = createContextHook<NotificationState>(() => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) { setIsLoading(false); return; }
      const userId = JSON.parse(userStr).id;
      if (!userId) { setIsLoading(false); return; }

      try {
        const [serverNotifs, serverCount] = await Promise.all([
          trpcClient.notifications.list.query({ userId, limit: 50 }),
          trpcClient.notifications.unreadCount.query({ userId }),
        ]);

        const notifs = serverNotifs as AppNotification[];
        setNotifications(notifs);
        setUnreadCount((serverCount as any).count || 0);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notifs));
      } catch {
        // Fallback to local
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as AppNotification[];
          setNotifications(parsed);
          setUnreadCount(parsed.filter(n => !n.read).length);
        }
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
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
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const userId = JSON.parse(userStr).id;
        if (userId) {
          try {
            await trpcClient.notifications.markAllRead.mutate({ userId });
          } catch {
            syncQueue.enqueue('notifications.markAllRead', { userId });
          }
        }
      }
    } catch {
      // Silent fail
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
