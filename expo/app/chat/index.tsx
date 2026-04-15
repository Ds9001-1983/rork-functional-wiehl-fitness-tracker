import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MessageSquare, User } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { trpcClient } from '@/lib/trpc';

interface Conversation {
  other_id: string;
  other_name: string;
  other_role: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Gerade eben';
  if (minutes < 60) return `${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}T`;
  return new Date(dateStr).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

export default function ConversationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    try {
      const data = await trpcClient.chat.conversations.query();
      setConversations(data as Conversation[]);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 15000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  const roleLabel = (role: string) => {
    if (role === 'trainer') return 'Trainer';
    if (role === 'admin') return 'Admin';
    return 'Kunde';
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Nachrichten' }} />
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Nachrichten' }} />

      {conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MessageSquare size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Keine Nachrichten</Text>
          <Text style={styles.emptySubtitle}>
            Hier siehst du deine Gespräche.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.other_id}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.conversationCard, item.unread_count > 0 && styles.conversationUnread]}
              onPress={() => router.push(`/chat/${item.other_id}` as any)}
              activeOpacity={0.7}
            >
              <View style={styles.avatar}>
                <User size={22} color={Colors.textSecondary} />
              </View>
              <View style={styles.conversationContent}>
                <View style={styles.conversationHeader}>
                  <Text style={[styles.conversationName, item.unread_count > 0 && styles.unreadText]} numberOfLines={1}>
                    {item.other_name}
                  </Text>
                  <Text style={styles.conversationTime}>{timeAgo(item.last_message_at)}</Text>
                </View>
                <View style={styles.conversationFooter}>
                  <Text style={[styles.conversationRole]}>{roleLabel(item.other_role)}</Text>
                  <Text style={[styles.lastMessage, item.unread_count > 0 && styles.unreadText]} numberOfLines={1}>
                    {item.last_message}
                  </Text>
                </View>
              </View>
              {item.unread_count > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {item.unread_count > 9 ? '9+' : item.unread_count}
                  </Text>
                </View>
              )}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center' as const,
    marginTop: Spacing.sm,
  },
  conversationCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  conversationUnread: {
    backgroundColor: 'rgba(255, 107, 53, 0.06)',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  conversationName: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
    flex: 1,
    marginRight: Spacing.sm,
  },
  conversationTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  conversationFooter: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginTop: 2,
    gap: 6,
  },
  conversationRole: {
    fontSize: 11,
    color: Colors.accent,
    fontWeight: '600' as const,
  },
  lastMessage: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  unreadText: {
    fontWeight: '700' as const,
    color: Colors.text,
  },
  unreadBadge: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 6,
    marginLeft: Spacing.sm,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700' as const,
  },
});
