import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { Trophy, Medal, Flame, Dumbbell, Calendar } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { trpcClient } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';
import { LEVEL_NAMES } from '@/types/gamification';

type Period = 'all' | 'month' | 'week';

const PERIOD_LABELS: Record<Period, string> = {
  all: 'Alle Zeit',
  month: 'Dieser Monat',
  week: 'Diese Woche',
};

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('all');

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      if (period === 'all') {
        const data = await trpcClient.gamification.leaderboard.query({ limit: 50 });
        setEntries(data);
      } else {
        // For time-filtered views, fetch leaderboard + workouts and compute
        const [leaderboardData, workouts] = await Promise.all([
          trpcClient.gamification.leaderboard.query({ limit: 100 }),
          trpcClient.workouts.list.query(),
        ]);

        const now = new Date();
        let startDate: Date;
        if (period === 'week') {
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        // Count completed workouts per user in period
        const workoutCounts = new Map<string, number>();
        (workouts as any[]).forEach((w: any) => {
          if (w.completed && new Date(w.date) >= startDate) {
            workoutCounts.set(w.userId, (workoutCounts.get(w.userId) || 0) + 1);
          }
        });

        // Merge with leaderboard data for names/levels
        const merged = leaderboardData.map((entry: any) => ({
          ...entry,
          periodWorkouts: workoutCounts.get(entry.userId) || 0,
        }));

        // Sort by period workouts, then XP as tiebreaker
        merged.sort((a: any, b: any) => {
          if (b.periodWorkouts !== a.periodWorkouts) return b.periodWorkouts - a.periodWorkouts;
          return b.xp - a.xp;
        });

        // Filter out users with 0 workouts in period
        setEntries(merged.filter((e: any) => e.periodWorkouts > 0));
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

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
            <Text style={styles.subtitle}>
              {period === 'all' ? 'Wer hat die meisten XP?' : 'Wer trainiert am meisten?'}
            </Text>
          </View>

          {/* Period Filter */}
          <View style={styles.filterRow}>
            {(['all', 'month', 'week'] as Period[]).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.filterTab, period === p && styles.filterTabActive]}
                onPress={() => setPeriod(p)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterTabText, period === p && styles.filterTabTextActive]}>
                  {PERIOD_LABELS[p]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
          ) : entries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Noch keine Eintraege</Text>
              <Text style={styles.emptySubtext}>
                {period === 'all'
                  ? 'Schliesse Workouts ab, um auf der Rangliste zu erscheinen.'
                  : `Keine Workouts ${period === 'week' ? 'diese Woche' : 'diesen Monat'}.`}
              </Text>
            </View>
          ) : (
            entries.map((entry, index) => {
              const rank = index + 1;
              const isCurrentUser = entry.userId === user?.id;
              const levelName = LEVEL_NAMES[entry.level] || `Level ${entry.level}`;
              const badgeCount = Array.isArray(entry.badges) ? entry.badges.length : 0;
              const showWorkouts = period !== 'all' && entry.periodWorkouts != null;

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
                    {showWorkouts ? (
                      <View style={styles.workoutCountRow}>
                        <Dumbbell size={14} color={Colors.accent} />
                        <Text style={styles.xpText}>{entry.periodWorkouts}</Text>
                      </View>
                    ) : (
                      <Text style={styles.xpText}>{entry.xp.toLocaleString()} XP</Text>
                    )}
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

  // Filter tabs
  filterRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  filterTabActive: {
    backgroundColor: Colors.accent,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },

  // Entries
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
  workoutCountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  streakText: { fontSize: 12, color: Colors.textSecondary },
});
