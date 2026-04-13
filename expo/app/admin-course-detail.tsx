import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { trpcClient } from '@/lib/trpc';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { confirmAlert, infoAlert } from '@/lib/alert';
import { TrainerOnly } from '@/components/TrainerOnly';

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function formatDe(iso: string) {
  return new Date(iso).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function AdminCourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<'schedules' | 'instances' | 'log'>('schedules');
  type Schedule = Awaited<ReturnType<typeof trpcClient.courses.admin.listSchedules.query>>[number];
  type Instance = Awaited<ReturnType<typeof trpcClient.courses.admin.listInstances.query>>[number];
  type LogData = Awaited<ReturnType<typeof trpcClient.courses.admin.getInstanceLog.query>>;
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newSched, setNewSched] = useState({ day_of_week: 0, start_time: '18:00', valid_from: new Date().toISOString().slice(0, 10), valid_until: '' });
  const [instanceModal, setInstanceModal] = useState(false);
  const [newInst, setNewInst] = useState({ date: new Date().toISOString().slice(0, 10), time: '18:00' });
  const [logModal, setLogModal] = useState<{ id: string } | null>(null);
  const [logData, setLogData] = useState<LogData | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [s, i] = await Promise.all([
        trpcClient.courses.admin.listSchedules.query({ course_id: id }),
        trpcClient.courses.admin.listInstances.query({ course_id: id }),
      ]);
      setSchedules(s); setInstances(i);
    } catch (e: any) { infoAlert('Fehler', e?.message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const addSchedule = async () => {
    try {
      await trpcClient.courses.admin.createSchedule.mutate({
        course_id: id!, day_of_week: newSched.day_of_week,
        start_time: newSched.start_time, valid_from: newSched.valid_from,
        valid_until: newSched.valid_until || null,
      });
      setModalOpen(false); await load();
    } catch (e: any) { infoAlert('Fehler', e?.message); }
  };

  const deleteSchedule = (sid: string) => {
    Alert.alert('Zeitplan löschen?', 'Sollen auch zukünftige Termine dieses Zeitplans abgesagt werden?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Nur Zeitplan', onPress: async () => {
        try { await trpcClient.courses.admin.deleteSchedule.mutate({ id: sid }); await load(); }
        catch (e: any) { infoAlert('Fehler', e?.message); }
      }},
      { text: 'Zeitplan + Termine', style: 'destructive', onPress: async () => {
        try { await trpcClient.courses.admin.deleteSchedule.mutate({ id: sid, cascade: true }); await load(); }
        catch (e: any) { infoAlert('Fehler', e?.message); }
      }},
    ]);
  };

  const addInstance = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newInst.date) || !/^\d{2}:\d{2}$/.test(newInst.time)) {
      infoAlert('Fehler', 'Datum YYYY-MM-DD und Uhrzeit HH:MM erforderlich'); return;
    }
    try {
      await trpcClient.courses.admin.createInstance.mutate({ course_id: id!, date: newInst.date, time: newInst.time });
      setInstanceModal(false); await load();
    } catch (e: any) { infoAlert('Fehler', e?.message); }
  };

  const cancelInstance = (iid: string) => {
    confirmAlert('Termin absagen?', 'Alle Teilnehmer werden benachrichtigt.', async () => {
      try { await trpcClient.courses.admin.cancelInstance.mutate({ id: iid }); await load(); }
      catch (e: any) { infoAlert('Fehler', e?.message); }
    }, { confirmLabel: 'Absagen', destructive: true });
  };

  const loadLog = async (iid: string) => {
    try {
      const r = await trpcClient.courses.admin.getInstanceLog.query({ id: iid });
      setLogData(r); setLogModal({ id: iid });
    } catch (e: any) { infoAlert('Fehler', e?.message); }
  };

  if (loading) return <TrainerOnly><View style={styles.center}><ActivityIndicator color={Colors.accent} /></View></TrainerOnly>;

  return (
    <TrainerOnly><SafeAreaView edges={['bottom']} style={styles.container}>
      <View style={styles.tabs}>
        {(['schedules', 'instances', 'log'] as const).map(t => (
          <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'schedules' ? 'Zeitplan' : t === 'instances' ? 'Termine' : 'Protokoll'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.xxl + Spacing.lg }}>
        {tab === 'schedules' && (
          <>
            <Pressable style={styles.newBtn} onPress={() => setModalOpen(true)}>
              <Text style={styles.btnText}>+ Wochenplan hinzufügen</Text>
            </Pressable>
            {schedules.map((s) => (
              <View key={s.id} style={styles.row}>
                <Text style={styles.rowText}>{DAYS[s.day_of_week]} · {s.start_time}</Text>
                <Text style={styles.meta}>ab {s.valid_from}{s.valid_until ? ` bis ${s.valid_until}` : ''}</Text>
                <Pressable onPress={() => deleteSchedule(s.id)}><Text style={[styles.link, { color: Colors.error }]}>Löschen</Text></Pressable>
              </View>
            ))}
          </>
        )}

        {tab === 'instances' && (
          <>
            <Pressable style={styles.newBtn} onPress={() => setInstanceModal(true)}>
              <Text style={styles.btnText}>+ Einzeltermin</Text>
            </Pressable>
            {instances.map((i) => (
              <View key={i.id} style={styles.row}>
                <Text style={styles.rowText}>{formatDe(i.start_time)}</Text>
                <Text style={styles.meta}>{i.status}</Text>
                {i.status === 'scheduled' && (
                  <Pressable onPress={() => cancelInstance(i.id)}><Text style={[styles.link, { color: Colors.error }]}>Absagen</Text></Pressable>
                )}
                <Pressable onPress={() => loadLog(i.id)}><Text style={styles.link}>Protokoll</Text></Pressable>
              </View>
            ))}
          </>
        )}

        {tab === 'log' && (
          <Text style={styles.meta}>Wähle einen Termin im Tab „Termine" → „Protokoll".</Text>
        )}
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBg}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Wochenplan hinzufügen</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.md }}>
              {DAYS.map((d, idx) => (
                <Pressable key={idx} style={[styles.dayBtn, newSched.day_of_week === idx && styles.dayBtnActive]} onPress={() => setNewSched({ ...newSched, day_of_week: idx })}>
                  <Text style={styles.dayText}>{d}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput style={styles.input} placeholder="Uhrzeit HH:MM" placeholderTextColor={Colors.textMuted} value={newSched.start_time} onChangeText={v => setNewSched({ ...newSched, start_time: v })} />
            <TextInput style={styles.input} placeholder="Gültig ab YYYY-MM-DD" placeholderTextColor={Colors.textMuted} value={newSched.valid_from} onChangeText={v => setNewSched({ ...newSched, valid_from: v })} />
            <TextInput style={styles.input} placeholder="Gültig bis (optional) YYYY-MM-DD" placeholderTextColor={Colors.textMuted} value={newSched.valid_until} onChangeText={v => setNewSched({ ...newSched, valid_until: v })} />
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <Pressable style={[styles.modalBtn, { backgroundColor: Colors.surfaceLight }]} onPress={() => setModalOpen(false)}><Text style={styles.btnText}>Abbrechen</Text></Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: Colors.accent }]} onPress={addSchedule}><Text style={styles.btnText}>Anlegen</Text></Pressable>
            </View>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={instanceModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBg}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Einzeltermin (Europe/Berlin)</Text>
            <TextInput style={styles.input} placeholder="Datum YYYY-MM-DD" placeholderTextColor={Colors.textMuted} value={newInst.date} onChangeText={v => setNewInst({ ...newInst, date: v })} />
            <TextInput style={styles.input} placeholder="Uhrzeit HH:MM" placeholderTextColor={Colors.textMuted} value={newInst.time} onChangeText={v => setNewInst({ ...newInst, time: v })} />
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <Pressable style={[styles.modalBtn, { backgroundColor: Colors.surfaceLight }]} onPress={() => setInstanceModal(false)}><Text style={styles.btnText}>Abbrechen</Text></Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: Colors.accent }]} onPress={addInstance}><Text style={styles.btnText}>Anlegen</Text></Pressable>
            </View>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!logModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBg}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={[styles.modal, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Protokoll</Text>
            <ScrollView>
              {logData?.bookings.map((b) => (
                <View key={b.id} style={{ marginBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: Spacing.sm }}>
                  <Text style={{ color: Colors.text }}>User {b.user_id} · {b.status}</Text>
                  <Text style={styles.meta}>Gebucht: {formatDe(b.booked_at)}</Text>
                  {b.cancelled_at && <Text style={styles.meta}>Storniert: {formatDe(b.cancelled_at)} von {b.cancelled_by}</Text>}
                  {b.no_show_marked_at && <Text style={styles.meta}>No-Show: {formatDe(b.no_show_marked_at)}</Text>}
                </View>
              ))}
            </ScrollView>
            <Pressable style={[styles.modalBtn, { backgroundColor: Colors.accent, marginTop: Spacing.sm }]} onPress={() => { setLogModal(null); setLogData(null); }}>
              <Text style={styles.btnText}>Schließen</Text>
            </Pressable>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView></TrainerOnly>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, padding: Spacing.md, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.accent },
  tabText: { color: Colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: Colors.accent },
  newBtn: { backgroundColor: Colors.accent, padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center', marginBottom: Spacing.md },
  btnText: { color: Colors.text, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.xs },
  rowText: { color: Colors.text, flex: 1, fontWeight: '600' },
  meta: { color: Colors.textSecondary, fontSize: 12 },
  link: { color: Colors.accent, fontWeight: '600' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', padding: Spacing.md },
  modal: { backgroundColor: Colors.surface, padding: Spacing.lg, borderRadius: BorderRadius.lg, width: '100%', maxWidth: 560, alignSelf: 'center' },
  modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '700', marginBottom: Spacing.md },
  input: { backgroundColor: Colors.surfaceLight, color: Colors.text, padding: Spacing.sm, borderRadius: BorderRadius.sm, marginBottom: Spacing.sm },
  modalBtn: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.sm, alignItems: 'center' },
  dayBtn: { backgroundColor: Colors.surfaceLight, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.sm },
  dayBtnActive: { backgroundColor: Colors.accent },
  dayText: { color: Colors.text, fontWeight: '600' },
});
