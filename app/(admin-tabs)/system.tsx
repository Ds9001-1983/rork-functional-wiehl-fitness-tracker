import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Server, Database, Clock, RefreshCw, Wifi, WifiOff } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { trpcClient } from '@/lib/trpc';

interface SystemStatus {
  serverUptime: number;
  dbConnected: boolean;
  totalUsers: number;
  totalWorkouts: number;
  memoryUsage?: number;
}

export default function AdminSystemScreen() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const result = await trpcClient.admin.stats.query();
      setStatus(result as SystemStatus);
      setLastCheck(new Date());
    } catch (err) {
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days} Tage, ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins} Minuten`;
  };

  if (isLoading && !status) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>Systemstatus</Text>
        <TouchableOpacity onPress={checkStatus} style={styles.refreshButton}>
          <RefreshCw size={20} color={Colors.accent} />
        </TouchableOpacity>
      </View>

      {lastCheck && (
        <Text style={styles.lastCheckText}>
          Letzte Pruefung: {lastCheck.toLocaleTimeString('de-DE')}
        </Text>
      )}

      {/* Connection Status */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Verbindung</Text>
          {status ? <Wifi size={20} color="#4CAF50" /> : <WifiOff size={20} color="#F44336" />}
        </View>
        <View style={styles.statusItem}>
          <View style={[styles.statusDot, { backgroundColor: status ? '#4CAF50' : '#F44336' }]} />
          <Text style={styles.statusText}>{status ? 'Server erreichbar' : 'Keine Verbindung'}</Text>
        </View>
      </View>

      {/* Database */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Datenbank</Text>
          <Database size={20} color={status?.dbConnected ? '#4CAF50' : '#F44336'} />
        </View>
        <View style={styles.statusItem}>
          <View style={[styles.statusDot, { backgroundColor: status?.dbConnected ? '#4CAF50' : '#F44336' }]} />
          <Text style={styles.statusText}>
            PostgreSQL: {status?.dbConnected ? 'Verbunden' : 'Getrennt'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Benutzer</Text>
          <Text style={styles.infoValue}>{status?.totalUsers ?? '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Workouts</Text>
          <Text style={styles.infoValue}>{status?.totalWorkouts ?? '-'}</Text>
        </View>
      </View>

      {/* Server */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Server</Text>
          <Server size={20} color={Colors.accent} />
        </View>
        <View style={styles.infoRow}>
          <Clock size={16} color={Colors.textMuted} />
          <Text style={styles.infoLabel}>Uptime</Text>
          <Text style={styles.infoValue}>{status ? formatUptime(status.serverUptime) : '-'}</Text>
        </View>
      </View>

      {/* App Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>App-Informationen</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Framework</Text>
          <Text style={styles.infoValue}>Expo SDK 53</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Backend</Text>
          <Text style={styles.infoValue}>Hono + tRPC / Bun</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Domain</Text>
          <Text style={styles.infoValue}>app.functional-wiehl.de</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  pageTitle: { fontSize: 24, fontWeight: '700', color: Colors.text },
  refreshButton: { padding: Spacing.sm },
  lastCheckText: { color: Colors.textMuted, fontSize: 12, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  card: { backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginBottom: Spacing.md, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  cardTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 15, color: Colors.text },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm, gap: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  infoLabel: { flex: 1, fontSize: 15, color: Colors.textSecondary },
  infoValue: { fontSize: 15, color: Colors.text, fontWeight: '500' },
});
