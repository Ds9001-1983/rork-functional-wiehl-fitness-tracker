import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Bell, Trophy, Flame, Target, Info, Dumbbell, Star, ClipboardList, MessageSquare, KeyRound } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { trpcClient } from '@/lib/trpc';

interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

function getNotificationIcon(type: string, Colors: any) {
  switch (type) {
    case 'badge': return <Trophy size={20} color={Colors.warning} />;
    case 'streak': return <Flame size={20} color={Colors.accent} />;
    case 'challenge': return <Target size={20} color={Colors.success} />;
    case 'level': return <Star size={20} color={Colors.warning} />;
    case 'workout_reminder': return <Dumbbell size={20} color={Colors.accent} />;
    case 'chat': return <MessageSquare size={20} color={Colors.accent} />;
    case 'password_reset_request': return <KeyRound size={20} color={Colors.accent} />;
    case 'system': return <ClipboardList size={20} color={Colors.accent} />;
    default: return <Info size={20} color={Colors.textSecondary} />;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Gerade eben';
  if (minutes < 60) return `Vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Vor ${days} Tag${days > 1 ? 'en' : ''}`;
  return new Date(dateStr).toLocaleDateString('de-DE');
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const router = useRouter();

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const items = await trpcClient.notifications.list.query();
      setNotifications((items as NotificationItem[]) ?? []);
    } catch (err) {
      console.log('[Notifications] fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  const markRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await trpcClient.notifications.markRead.mutate({ id });
    } catch (err) {
      console.log('[Notifications] markRead failed:', err);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await trpcClient.notifications.markAllRead.mutate();
    } catch (err) {
      console.log('[Notifications] markAllRead failed:', err);
    }
  }, []);

  const handleNotificationPress = (item: NotificationItem) => {
    if (!item.read) markRead(item.id);
    if (item.type === 'chat' && item.data?.senderId) {
      router.push(`/chat/${item.data.senderId}` as any);
    } else if (item.type === 'password_reset_request' && item.data?.clientId) {
      router.push(`/customer-management?focus=${item.data.clientId}` as any);
    } else if (item.data?.type === 'plan_assigned') {
      router.push('/(tabs)');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Benachrichtigungen' }} />
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Benachrichtigungen' }} />

      {unreadCount > 0 && (
        <TouchableOpacity style={styles.markAllButton} onPress={markAllRead}>
          <Text style={styles.markAllText}>Alle als gelesen markieren</Text>
        </TouchableOpacity>
      )}

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Bell size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Keine Benachrichtigungen</Text>
          <Text style={styles.emptySubtitle}>
            Hier siehst du Updates zu Badges, Streaks, Challenges und mehr.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.notifCard, !item.read && styles.notifUnread]}
              onPress={() => handleNotificationPress(item)}
              activeOpacity={0.7}
            >
              <View style={styles.notifIcon}>
                {getNotificationIcon(item.type, Colors)}
              </View>
              <View style={styles.notifContent}>
                <Text style={styles.notifTitle}>{item.title}</Text>
                <Text style={styles.notifBody}>{item.body}</Text>
                <Text style={styles.notifTime}>{timeAgo(item.createdAt)}</Text>
              </View>
              {!item.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const createStyles = (Colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  markAllButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'flex-end',
  },
  markAllText: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  notifUnread: {
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
  },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  notifBody: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  notifTime: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    marginTop: 6,
    marginLeft: Spacing.sm,
  },
});
