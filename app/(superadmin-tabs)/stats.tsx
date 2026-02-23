import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { BarChart3, Users, Dumbbell, Building2, TrendingUp, Flame } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { trpcClient } from '@/lib/trpc';

interface StudioDetail {
  id: string;
  name: string;
  slug: string;
  accentColor: string;
  memberCount: number;
  totalWorkouts: number;
  recentWorkouts: number;
  activeUsers: number;
}

interface StatsData {
  totalStudios: number;
  totalUsers: number;
  totalWorkouts: number;
  totalActiveUsers: number;
  totalRecentWorkouts: number;
  studios: StudioDetail[];
}

export default function SuperadminStatsScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      const data = await trpcClient.studios.stats.query();
      setStats(data as StatsData);
    } catch (err) {
      console.error('[SuperadminStats] Failed to load:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingText}>Lade Cross-Studio Statistiken...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.centered}>
        <BarChart3 size={48} color={Colors.textMuted} />
        <Text style={styles.errorText}>Statistiken konnten nicht geladen werden</Text>
      </View>
    );
  }

  // Find max workouts for bar chart scaling
  const maxWorkouts = Math.max(...stats.studios.map(s => s.totalWorkouts), 1);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
        }
      >
        <View style={styles.header}>
          <BarChart3 size={28} color={Colors.accent} />
          <Text style={styles.title}>Cross-Studio Statistiken</Text>
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Building2 size={22} color={Colors.accent} />
            <Text style={styles.kpiValue}>{stats.totalStudios}</Text>
            <Text style={styles.kpiLabel}>Studios</Text>
          </View>
          <View style={styles.kpiCard}>
            <Users size={22} color="#4CAF50" />
            <Text style={styles.kpiValue}>{stats.totalUsers}</Text>
            <Text style={styles.kpiLabel}>Nutzer gesamt</Text>
          </View>
          <View style={styles.kpiCard}>
            <Dumbbell size={22} color="#2196F3" />
            <Text style={styles.kpiValue}>{stats.totalWorkouts}</Text>
            <Text style={styles.kpiLabel}>Workouts gesamt</Text>
          </View>
          <View style={styles.kpiCard}>
            <Flame size={22} color="#FF9800" />
            <Text style={styles.kpiValue}>{stats.totalActiveUsers}</Text>
            <Text style={styles.kpiLabel}>Aktiv (7 Tage)</Text>
          </View>
        </View>

        {/* Weekly Activity */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <TrendingUp size={20} color={Colors.accent} />
            <Text style={styles.cardTitle}>Wochenaktivität</Text>
            <Text style={styles.cardBadge}>{stats.totalRecentWorkouts} Workouts</Text>
          </View>
          <Text style={styles.cardSubtitle}>Abgeschlossene Workouts in den letzten 7 Tagen</Text>
        </View>

        {/* Per-Studio Breakdown */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Building2 size={20} color={Colors.accent} />
            <Text style={styles.cardTitle}>Studio-Vergleich</Text>
          </View>

          {stats.studios.map((studio) => (
            <View key={studio.id} style={styles.studioRow}>
              <View style={styles.studioInfo}>
                <View style={styles.studioNameRow}>
                  <View style={[styles.studioIndicator, { backgroundColor: studio.accentColor || Colors.accent }]} />
                  <Text style={styles.studioName}>{studio.name}</Text>
                </View>
                <Text style={styles.studioMeta}>
                  {studio.memberCount} Mitglieder · {studio.activeUsers} aktiv
                </Text>
              </View>

              <View style={styles.studioBarSection}>
                <View style={styles.studioBarContainer}>
                  <View
                    style={[
                      styles.studioBar,
                      {
                        width: `${Math.max(5, (studio.totalWorkouts / maxWorkouts) * 100)}%`,
                        backgroundColor: studio.accentColor || Colors.accent,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.studioWorkoutCount}>{studio.totalWorkouts}</Text>
              </View>

              <View style={styles.studioRecentRow}>
                <Text style={styles.studioRecentLabel}>Letzte 7 Tage:</Text>
                <Text style={styles.studioRecentValue}>{studio.recentWorkouts} Workouts</Text>
              </View>
            </View>
          ))}

          {stats.studios.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Keine Studios vorhanden</Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, gap: Spacing.md },
  scrollContent: { padding: Spacing.md },
  loadingText: { color: Colors.textSecondary, fontSize: 14 },
  errorText: { color: Colors.textSecondary, fontSize: 16, fontWeight: '600', marginTop: Spacing.md },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },

  // KPI Grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%' as any,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
  },
  kpiLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },

  // Cards
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  cardBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.accent,
    backgroundColor: Colors.accent + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginLeft: 28,
  },

  // Studio rows
  studioRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  studioInfo: {
    marginBottom: Spacing.xs,
  },
  studioNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  studioIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  studioName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  studioMeta: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 18,
    marginTop: 2,
  },
  studioBarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    marginLeft: 18,
  },
  studioBarContainer: {
    flex: 1,
    height: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  studioBar: {
    height: '100%',
    borderRadius: BorderRadius.sm,
    minWidth: 4,
  },
  studioWorkoutCount: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    width: 40,
    textAlign: 'right',
  },
  studioRecentRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginLeft: 18,
    marginTop: 4,
  },
  studioRecentLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  studioRecentValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
  },

  emptyState: { padding: Spacing.lg, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
});
