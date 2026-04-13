import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { trpcClient } from '@/lib/trpc';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { confirmAlert, infoAlert } from '@/lib/alert';
import { Users, XCircle } from 'lucide-react-native';
import { TrainerOnly } from '@/components/TrainerOnly';

function formatDe(iso: string) {
  return new Date(iso).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function TrainerCoursesScreen() {
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await trpcClient.courses.trainer.listMyInstances.query();
      setInstances(data);
    } catch (e: any) { infoAlert('Fehler', e?.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const handleCancelInstance = (id: string, name: string) => {
    confirmAlert('Termin absagen?', `${name} wirklich absagen? Alle Teilnehmer werden benachrichtigt.`,
      async () => {
        try { await trpcClient.courses.admin.cancelInstance.mutate({ id }); await load(); }
        catch (e: any) { infoAlert('Fehler', e?.message); }
      }, { confirmLabel: 'Absagen', destructive: true });
  };

  if (loading) return <TrainerOnly><View style={styles.center}><ActivityIndicator color={Colors.accent} /></View></TrainerOnly>;

  return (
    <TrainerOnly><SafeAreaView edges={['bottom']} style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        contentContainerStyle={{ padding: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.xxl + Spacing.lg }}
      >
        {instances.length === 0 && <Text style={styles.empty}>Keine anstehenden Kurse.</Text>}
        {instances.map(i => {
          const fillPct = Math.round((i.booked / i.max_participants) * 100);
          return (
            <View key={i.id} style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.name}>{i.course.name}</Text>
                <Text style={styles.status}>{i.status}</Text>
              </View>
              <Text style={styles.time}>{formatDe(i.start_time)}</Text>
              <View style={styles.fillBar}>
                <View style={[styles.fillInner, { width: `${Math.min(fillPct, 100)}%`, backgroundColor: fillPct >= 100 ? Colors.error : Colors.accent }]} />
              </View>
              <View style={styles.row}>
                <Users size={14} color={Colors.textSecondary} />
                <Text style={styles.count}>{i.booked}/{i.max_participants} ({i.available} frei)</Text>
              </View>
              <View style={styles.actions}>
                <Pressable style={styles.btn} onPress={() => router.push(`/trainer-course-participants?id=${i.id}`)}>
                  <Text style={styles.btnText}>Teilnehmer</Text>
                </Pressable>
                {i.status === 'scheduled' && (
                  <Pressable style={[styles.btn, styles.btnDanger]} onPress={() => handleCancelInstance(i.id, i.course.name)}>
                    <XCircle size={14} color={Colors.text} />
                    <Text style={styles.btnText}>Absagen</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView></TrainerOnly>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  empty: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl },
  card: { backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.sm },
  name: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  status: { color: Colors.textMuted, fontSize: 12 },
  time: { color: Colors.textSecondary, marginTop: 4 },
  fillBar: { height: 6, backgroundColor: Colors.surfaceLight, borderRadius: 3, marginVertical: Spacing.sm, overflow: 'hidden' },
  fillInner: { height: '100%', borderRadius: 3 },
  row: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' },
  count: { color: Colors.textSecondary, fontSize: 13 },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.accent, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.sm, flex: 1, justifyContent: 'center' },
  btnDanger: { backgroundColor: Colors.error },
  btnText: { color: Colors.text, fontWeight: '700' },
});
