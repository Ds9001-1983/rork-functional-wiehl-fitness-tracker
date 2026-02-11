import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { BarChart3, Users, Dumbbell, Activity } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { trpcClient } from '@/lib/trpc';

interface AdminStats {
  totalUsers: number;
  totalTrainers: number;
  totalClients: number;
  totalWorkouts: number;
  serverUptime: number;
  dbConnected: boolean;
  recentWorkouts: Array<{ id: string; name: string; date: string; userId: string }>;
}

export default function AdminDashboardScreen() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const result = await trpcClient.admin.stats.query();
      setStats(result as AdminStats);
    } catch (err) {
      setError('Dashboard-Daten konnten nicht geladen werden.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
      <Text style={styles.pageTitle}>Admin Dashboard</Text>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Stat Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Users size={24} color={Colors.accent} />
          <Text style={styles.statValue}>{stats?.totalUsers ?? 0}</Text>
          <Text style={styles.statLabel}>Gesamt Benutzer</Text>
        </View>
        <View style={styles.statCard}>
          <Users size={24} color="#4CAF50" />
          <Text style={styles.statValue}>{stats?.totalTrainers ?? 0}</Text>
          <Text style={styles.statLabel}>Trainer</Text>
        </View>
        <View style={styles.statCard}>
          <Users size={24} color="#2196F3" />
          <Text style={styles.statValue}>{stats?.totalClients ?? 0}</Text>
          <Text style={styles.statLabel}>Kunden</Text>
        </View>
        <View style={styles.statCard}>
          <Dumbbell size={24} color="#FF9800" />
          <Text style={styles.statValue}>{stats?.totalWorkouts ?? 0}</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </View>
      </View>

      {/* Server Status */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Server Status</Text>
          <Activity size={20} color={Colors.accent} />
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Datenbank</Text>
          <View style={[styles.statusDot, { backgroundColor: stats?.dbConnected ? '#4CAF50' : '#F44336' }]} />
          <Text style={styles.statusValue}>{stats?.dbConnected ? 'Verbunden' : 'Getrennt'}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Uptime</Text>
          <Text style={styles.statusValue}>{stats ? formatUptime(stats.serverUptime) : '-'}</Text>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Letzte Aktivitaeten</Text>
        {(!stats?.recentWorkouts || stats.recentWorkouts.length === 0) ? (
          <Text style={styles.muted}>Noch keine Workouts vorhanden</Text>
        ) : (
          stats.recentWorkouts.slice(0, 10).map((w) => (
            <View key={w.id} style={styles.activityRow}>
              <Dumbbell size={16} color={Colors.textMuted} />
              <View style={styles.activityInfo}>
                <Text style={styles.activityName}>{w.name}</Text>
                <Text style={styles.activityDate}>{new Date(w.date).toLocaleDateString('de-DE')}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  pageTitle: { fontSize: 24, fontWeight: '700', color: Colors.text, padding: Spacing.lg, paddingBottom: Spacing.sm },
  errorBanner: { marginHorizontal: Spacing.lg, padding: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: 'rgba(244, 67, 54, 0.15)', borderWidth: 1, borderColor: 'rgba(244, 67, 54, 0.4)' },
  errorText: { color: Colors.text, fontSize: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, gap: Spacing.md },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statValue: { fontSize: 28, fontWeight: '700', color: Colors.text, marginTop: Spacing.sm },
  statLabel: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  card: { backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginTop: Spacing.lg, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  cardTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: Spacing.md },
  statusRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.sm },
  statusLabel: { flex: 1, fontSize: 15, color: Colors.textSecondary },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusValue: { fontSize: 15, color: Colors.text, fontWeight: '500' },
  muted: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: Spacing.md },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  activityInfo: { flex: 1 },
  activityName: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  activityDate: { fontSize: 12, color: Colors.textMuted },
});
