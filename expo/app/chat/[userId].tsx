import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Send } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { trpcClient } from '@/lib/trpc';

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

export default function ChatScreen() {
  const { userId: otherUserId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useAuth();
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [otherName, setOtherName] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async () => {
    if (!otherUserId) return;
    try {
      const data = await trpcClient.chat.list.query({ otherUserId });
      setMessages(data as ChatMessage[]);
    } catch {}
  }, [otherUserId]);

  // Load messages and poll
  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [loadMessages]);

  // Try to get other user's name from clients list
  useEffect(() => {
    if (!otherUserId) return;
    trpcClient.clients.list.query().then((clients: any[]) => {
      const found = clients.find((c: any) => c.userId === otherUserId || c.id === otherUserId);
      if (found) setOtherName(found.name);
    }).catch(() => {});
  }, [otherUserId]);

  const handleSend = async () => {
    if (!newMessage.trim() || !otherUserId || sending) return;
    setSending(true);
    try {
      await trpcClient.chat.send.mutate({
        receiverId: otherUserId,
        message: newMessage.trim(),
      });
      setNewMessage('');
      await loadMessages();
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    } catch {}
    setSending(false);
  };

  const isMyMessage = (msg: ChatMessage) => msg.sender_id === user?.id;

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Heute';
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Gestern';
    return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const mine = isMyMessage(item);
    const showDate = index === 0 || formatDate(messages[index - 1].created_at) !== formatDate(item.created_at);

    return (
      <>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>{formatDate(item.created_at)}</Text>
          </View>
        )}
        <View style={[styles.messageBubble, mine ? styles.myBubble : styles.otherBubble]}>
          <Text style={[styles.messageText, mine && styles.myMessageText]}>{item.message}</Text>
          <Text style={[styles.messageTime, mine && styles.myMessageTime]}>{formatTime(item.created_at)}</Text>
        </View>
      </>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: otherName || 'Chat' }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>Noch keine Nachrichten</Text>
              <Text style={styles.emptyChatSubtext}>Schreibe die erste Nachricht!</Text>
            </View>
          }
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Nachricht schreiben..."
            placeholderTextColor={Colors.textMuted}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={2000}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!newMessage.trim() || sending}
          >
            <Send size={20} color={!newMessage.trim() || sending ? Colors.textMuted : '#FFFFFF'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const createStyles = (Colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  messageList: {
    padding: Spacing.md,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  dateSeparatorText: {
    fontSize: 12,
    color: Colors.textMuted,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  myBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.accent,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.text,
    fontSize: 16,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
  emptyChat: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyChatText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  emptyChatSubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
});
