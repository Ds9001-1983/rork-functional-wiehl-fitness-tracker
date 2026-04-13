import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { trpcClient } from '@/lib/trpc';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { confirmAlert, infoAlert } from '@/lib/alert';
import { TrainerOnly } from '@/components/TrainerOnly';

function formatDe(iso: string) {
  return new Date(iso).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function ParticipantsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await trpcClient.courses.trainer.getMyInstance.query({ id });
      setData(r);
    } catch (e: any) { infoAlert('Fehler', e?.message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleNoShow = (bookingId: string, name: string) => {
    confirmAlert('No-Show markieren?', `${name} als No-Show markieren? Zähler wird erhöht.`,
      async () => {
        try { await trpcClient.courses.trainer.markNoShow.mutate({ bookingId }); await load(); }
        catch (e: any) { infoAlert('Fehler', e?.message); }
      }, { confirmLabel: 'Bestätigen', destructive: true });
  };

  const handleRemove = (bookingId: string, name: string) => {
    confirmAlert('Entfernen?', `${name} aus dem Kurs entfernen?`,
      async () => {
        try { await trpcClient.courses.trainer.removeParticipant.mutate({ bookingId }); await load(); }
        catch (e: any) { infoAlert('Fehler', e?.message); }
      }, { confirmLabel: 'Entfernen', destructive: true });
  };

  if (loading || !data) return <TrainerOnly><View style={styles.center}><ActivityIndicator color={Colors.accent} /></View></TrainerOnly>;

  const hasStarted = new Date(data.instance.start_time).getTime() <= Date.now();

  return (
    <TrainerOnly><SafeAreaView edges={['bottom']} style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.xxl + Spacing.lg }}>
        <Text style={styles.title}>{data.course?.name}</Text>
        <Text style={styles.sub}>{formatDe(data.instance.start_time)}</Text>

        <Text style={styles.section}>Teilnehmer ({data.participants.filter((p: any) => p.status === 'booked').length})</Text>
        {data.participants.length === 0 && <Text style={styles.empty}>Keine Teilnehmer.</Text>}
        {data.participants.map((p: any) => (
          <View key={p.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{p.user.name}</Text>
              <Text style={styles.status}>{p.status}</Text>
            </View>
            {p.status === 'booked' && (
              <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
                {hasStarted && (
                  <Pressable style={[styles.btn, styles.btnWarn]} onPress={() => handleNoShow(p.id, p.user.name)}>
                    <Text style={styles.btnText}>No-Show</Text>
                  </Pressable>
                )}
                <Pressable style={[styles.btn, styles.btnDanger]} onPress={() => handleRemove(p.id, p.user.name)}>
                  <Text style={styles.btnText}>Entfernen</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))}

        <Text style={styles.section}>Warteliste ({data.waitlist.length})</Text>
        {data.waitlist.length === 0 && <Text style={styles.empty}>Leer.</Text>}
        {data.waitlist.map((w: any) => (
          <View key={w.id} style={styles.row}>
            <Text style={styles.name}>{w.user.name}</Text>
            {w.last_notified_at && <Text style={styles.status}>benachrichtigt</Text>}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView></TrainerOnly>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  title: { color: Colors.text, fontSize: 22, fontWeight: '700' },
  sub: { color: Colors.textSecondary, marginTop: 4 },
  section: { color: Colors.text, fontSize: 16, fontWeight: '700', marginTop: Spacing.lg, marginBottom: Spacing.sm },
  empty: { color: Colors.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.xs },
  name: { color: Colors.text, fontWeight: '600' },
  status: { color: Colors.textMuted, fontSize: 12 },
  btn: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.sm },
  btnWarn: { backgroundColor: Colors.warning },
  btnDanger: { backgroundColor: Colors.error },
  btnText: { color: Colors.text, fontWeight: '700', fontSize: 12 },
});
