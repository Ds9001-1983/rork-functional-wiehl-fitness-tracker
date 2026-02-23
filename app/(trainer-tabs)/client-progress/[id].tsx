import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { TrendingUp, Calendar, Target, Flame, Dumbbell, BarChart3 } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { trpcClient } from '@/lib/trpc';

export default function ClientProgressScreen() {
  const { id: clientId } = useLocalSearchParams<{ id: string }>();
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<any>(null);
  const [clientName, setClientName] = useState('');

  useEffect(() => {
    if (!clientId) return;
    const load = async () => {
      try {
        const [data, clients] = await Promise.all([
          trpcClient.clients.progress.query({ clientId }),
          trpcClient.clients.list.query(),
        ]);
        setProgress(data);
        const client = (clients as any[]).find((c: any) => c.id === clientId || c.userId === clientId);
        if (client) setClientName(client.name);
      } catch {}
      setLoading(false);
    };
    load();
  }, [clientId]);

  const getComplianceColor = (rate: number) => {
    if (rate >= 80) return Colors.success;
    if (rate >= 50) return Colors.warning;
    return Colors.error;
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Fortschritt' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      </>
    );
  }

  if (!progress) {
    return (
      <>
        <Stack.Screen options={{ title: 'Fortschritt' }} />
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>Keine Daten verfügbar</Text>
        </View>
      </>
    );
  }

  const maxVolume = Math.max(...progress.weeklyData.map((w: any) => w.volume), 1);

  return (
    <>
      <Stack.Screen options={{ title: clientName || 'Fortschritt' }} />
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>{clientName}</Text>
            <Text style={styles.subtitle}>Letzte 4 Wochen</Text>
          </View>

          {/* Key Metrics */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={styles.metricIcon}>
                <Target size={20} color={getComplianceColor(progress.complianceRate)} />
              </View>
              <Text style={[styles.metricValue, { color: getComplianceColor(progress.complianceRate) }]}>
                {progress.complianceRate}%
              </Text>
              <Text style={styles.metricLabel}>Compliance</Text>
            </View>
            <View style={styles.metricCard}>
              <View style={styles.metricIcon}>
                <Dumbbell size={20} color={Colors.accent} />
              </View>
              <Text style={styles.metricValue}>{progress.recentWorkouts}</Text>
              <Text style={styles.metricLabel}>Workouts (4W)</Text>
            </View>
            <View style={styles.metricCard}>
              <View style={styles.metricIcon}>
                <Flame size={20} color={Colors.warning} />
              </View>
              <Text style={styles.metricValue}>{progress.currentStreak}</Text>
              <Text style={styles.metricLabel}>Streak</Text>
            </View>
            <View style={styles.metricCard}>
              <View style={styles.metricIcon}>
                <Calendar size={20} color={Colors.textSecondary} />
              </View>
              <Text style={styles.metricValue}>{progress.assignedPlans}</Text>
              <Text style={styles.metricLabel}>Pläne</Text>
            </View>
          </View>

          {/* Weekly Chart */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <BarChart3 size={20} color={Colors.accent} />
              <Text style={styles.sectionTitle}>Wöchentliches Volumen</Text>
            </View>
            <View style={styles.weekChart}>
              {progress.weeklyData.map((week: any, i: number) => (
                <View key={i} style={styles.weekColumn}>
                  <View style={styles.weekBarContainer}>
                    <View style={[styles.weekBar, { height: Math.max((week.volume / maxVolume) * 80, 2) }]} />
                  </View>
                  <Text style={styles.weekLabel}>{week.weekLabel}</Text>
                  <Text style={styles.weekValue}>{week.workoutCount}x</Text>
                  {week.volume > 0 && (
                    <Text style={styles.weekVolume}>{(week.volume / 1000).toFixed(1)}t</Text>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Last Activity */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={20} color={Colors.accent} />
              <Text style={styles.sectionTitle}>Zusammenfassung</Text>
            </View>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Gesamt Workouts</Text>
                <Text style={styles.summaryValue}>{progress.totalWorkouts}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Letztes Training</Text>
                <Text style={styles.summaryValue}>
                  {progress.lastWorkoutDate
                    ? new Date(progress.lastWorkoutDate).toLocaleDateString('de-DE')
                    : 'Noch nie'}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </>
  );
}

const createStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, color: Colors.textMuted },
  header: { padding: Spacing.lg, paddingTop: Spacing.md },
  title: { fontSize: 24, fontWeight: '700' as const, color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  metricCard: { flexBasis: '47%', flexGrow: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  metricIcon: { marginBottom: Spacing.xs },
  metricValue: { fontSize: 24, fontWeight: '700' as const, color: Colors.accent },
  metricLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  section: { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: '600' as const, color: Colors.text },
  weekChart: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  weekColumn: { flex: 1, alignItems: 'center' },
  weekBarContainer: { height: 80, justifyContent: 'flex-end', marginBottom: Spacing.xs },
  weekBar: { width: 30, backgroundColor: Colors.accent, borderRadius: BorderRadius.sm },
  weekLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' as const },
  weekValue: { fontSize: 12, color: Colors.accent, fontWeight: '600' as const, marginTop: 2 },
  weekVolume: { fontSize: 10, color: Colors.textMuted },
  summaryCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  summaryLabel: { fontSize: 14, color: Colors.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '600' as const, color: Colors.text },
});
