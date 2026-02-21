import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { Trophy, Medal, Flame } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { trpcClient } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';
import { LEVEL_NAMES } from '@/types/gamification';

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const data = await trpcClient.gamification.leaderboard.query({ limit: 50 });
      setEntries(data);
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy size={20} color="#FFD700" />;
    if (rank === 2) return <Medal size={20} color="#C0C0C0" />;
    if (rank === 3) return <Medal size={20} color="#CD7F32" />;
    return <Text style={styles.rankNumber}>{rank}</Text>;
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Rangliste' }} />
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Trophy size={32} color={Colors.accent} />
            <Text style={styles.title}>Studio-Rangliste</Text>
            <Text style={styles.subtitle}>Wer hat die meisten XP?</Text>
          </View>

          {loading ? (
            <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
          ) : entries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Noch keine Eintraege</Text>
              <Text style={styles.emptySubtext}>Schliesse Workouts ab, um auf der Rangliste zu erscheinen.</Text>
            </View>
          ) : (
            entries.map((entry, index) => {
              const rank = index + 1;
              const isCurrentUser = entry.userId === user?.id;
              const levelName = LEVEL_NAMES[entry.level] || `Level ${entry.level}`;
              const badgeCount = Array.isArray(entry.badges) ? entry.badges.length : 0;

              return (
                <View key={entry.userId} style={[styles.entry, isCurrentUser && styles.entryHighlight]}>
                  <View style={styles.rankCol}>{getRankIcon(rank)}</View>
                  <View style={styles.infoCol}>
                    <Text style={[styles.entryName, isCurrentUser && styles.entryNameHighlight]}>
                      {entry.name || 'Mitglied'} {isCurrentUser ? '(Du)' : ''}
                    </Text>
                    <Text style={styles.entryLevel}>{levelName} · {badgeCount} Badges</Text>
                  </View>
                  <View style={styles.statsCol}>
                    <Text style={styles.xpText}>{entry.xp.toLocaleString()} XP</Text>
                    {entry.currentStreak > 0 && (
                      <View style={styles.streakRow}>
                        <Flame size={12} color={Colors.accent} />
                        <Text style={styles.streakText}>{entry.currentStreak}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </>
  );
}

const createStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { alignItems: 'center', padding: Spacing.lg, paddingTop: Spacing.xl },
  title: { fontSize: 24, fontWeight: '700' as const, color: Colors.text, marginTop: Spacing.sm },
  subtitle: { fontSize: 14, color: Colors.textSecondary },
  emptyState: { alignItems: 'center', padding: Spacing.xxl },
  emptyText: { fontSize: 16, color: Colors.textSecondary, fontWeight: '600' as const },
  emptySubtext: { fontSize: 14, color: Colors.textMuted, marginTop: Spacing.xs, textAlign: 'center' },
  entry: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  entryHighlight: { borderColor: Colors.accent, backgroundColor: Colors.accent + '15' },
  rankCol: { width: 36, alignItems: 'center' },
  rankNumber: { fontSize: 16, fontWeight: '700' as const, color: Colors.textMuted },
  infoCol: { flex: 1, marginLeft: Spacing.sm },
  entryName: { fontSize: 15, fontWeight: '600' as const, color: Colors.text },
  entryNameHighlight: { color: Colors.accent },
  entryLevel: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  statsCol: { alignItems: 'flex-end' },
  xpText: { fontSize: 15, fontWeight: '700' as const, color: Colors.accent },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  streakText: { fontSize: 12, color: Colors.textSecondary },
});
