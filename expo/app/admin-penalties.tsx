import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { trpcClient } from '@/lib/trpc';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { confirmAlert, infoAlert } from '@/lib/alert';
import { TrainerOnly } from '@/components/TrainerOnly';

export default function AdminPenaltiesScreen() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await trpcClient.courses.admin.listPenalties.query();
      setList(r.sort((a: any, b: any) => Number(b.is_blocked) - Number(a.is_blocked) || b.no_show_count - a.no_show_count));
    } catch (e: any) { infoAlert('Fehler', e?.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const reset = (userId: string, name: string) => {
    confirmAlert('Zurücksetzen?', `Zähler für ${name} auf 0 setzen und entsperren?`, async () => {
      try { await trpcClient.courses.admin.resetNoShowCount.mutate({ userId }); await load(); }
      catch (e: any) { infoAlert('Fehler', e?.message); }
    }, { confirmLabel: 'Zurücksetzen' });
  };

  if (loading) return <TrainerOnly><View style={styles.center}><ActivityIndicator color={Colors.accent} /></View></TrainerOnly>;

  return (
    <TrainerOnly><SafeAreaView edges={['bottom']} style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.accent} />}
        contentContainerStyle={{ padding: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.xxl + Spacing.lg }}
      >
        {list.length === 0 && <Text style={styles.empty}>Keine Einträge.</Text>}
        {list.map((p: any) => (
          <View key={p.user_id} style={[styles.card, p.is_blocked && styles.blockedCard]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{p.user_name}</Text>
              <Text style={styles.meta}>{p.user_email}</Text>
              <Text style={[styles.count, p.is_blocked && { color: Colors.error }]}>
                {p.no_show_count} No-Show{p.no_show_count !== 1 ? 's' : ''} {p.is_blocked && '· GESPERRT'}
              </Text>
            </View>
            {(p.no_show_count > 0 || p.is_blocked) && (
              <Pressable style={styles.btn} onPress={() => reset(p.user_id, p.user_name)}>
                <Text style={styles.btnText}>{p.is_blocked ? 'Entsperren' : 'Zurücksetzen'}</Text>
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView></TrainerOnly>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  empty: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.sm },
  blockedCard: { borderLeftWidth: 4, borderLeftColor: Colors.error },
  name: { color: Colors.text, fontWeight: '700' },
  meta: { color: Colors.textMuted, fontSize: 12 },
  count: { color: Colors.textSecondary, marginTop: 4 },
  btn: { backgroundColor: Colors.accent, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.sm },
  btnText: { color: Colors.text, fontWeight: '700' },
});
