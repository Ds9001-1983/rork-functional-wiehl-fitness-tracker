import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal, ActivityIndicator, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { trpcClient } from '@/lib/trpc';
import { Colors, Spacing, BorderRadius, CoursePalette, DEFAULT_COURSE_COLOR } from '@/constants/colors';
import { confirmAlert, infoAlert } from '@/lib/alert';
import { Plus, ChevronRight, Trash2 } from 'lucide-react-native';
import { TrainerOnly } from '@/components/TrainerOnly';

interface Course {
  id: string; name: string; description: string | null; duration_minutes: number;
  max_participants: number; trainer_id: string; category: string | null;
  color: string | null; is_active: boolean;
}

export default function AdminCoursesScreen() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState<{
    name: string; description: string; duration_minutes: string; max_participants: string;
    category: string; color: string; is_active: boolean;
  }>({
    name: '', description: '', duration_minutes: '60', max_participants: '10',
    category: '', color: DEFAULT_COURSE_COLOR, is_active: true,
  });

  const load = useCallback(async () => {
    try { setCourses(await trpcClient.courses.admin.listCourses.query({}) as Course[]); }
    catch (e: any) { infoAlert('Fehler', e?.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({
      name: '', description: '', duration_minutes: '60', max_participants: '10',
      category: '', color: DEFAULT_COURSE_COLOR, is_active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (c: Course) => {
    setEditing(c);
    setForm({
      name: c.name, description: c.description ?? '',
      duration_minutes: String(c.duration_minutes), max_participants: String(c.max_participants),
      category: c.category ?? '', color: c.color ?? DEFAULT_COURSE_COLOR, is_active: c.is_active,
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { infoAlert('Fehler', 'Name erforderlich'); return; }
    const dur = parseInt(form.duration_minutes); const max = parseInt(form.max_participants);
    if (!dur || !max) { infoAlert('Fehler', 'Dauer und Teilnehmer müssen Zahlen sein'); return; }
    try {
      if (editing) {
        await trpcClient.courses.admin.updateCourse.mutate({
          id: editing.id, name: form.name, description: form.description || null,
          duration_minutes: dur, max_participants: max,
          category: form.category || null, color: form.color, is_active: form.is_active,
        });
        setModalOpen(false); await load();
      } else {
        const created = await trpcClient.courses.admin.createCourse.mutate({
          name: form.name, description: form.description || undefined,
          duration_minutes: dur, max_participants: max,
          category: form.category || undefined, color: form.color,
        });
        setModalOpen(false);
        await load();
        const newId = (created as any)?.id;
        if (newId) {
          router.push(`/admin-course-detail?id=${newId}&openSchedule=1`);
        }
      }
    } catch (e: any) { infoAlert('Fehler', e?.message); }
  };

  const softDelete = (c: Course) => {
    confirmAlert('Kurs deaktivieren?', `${c.name} wird deaktiviert. Bestehende Termine bleiben sichtbar, neue werden nicht mehr generiert. Kurs kann später reaktiviert werden.`, async () => {
      try { await trpcClient.courses.admin.deleteCourse.mutate({ id: c.id }); await load(); }
      catch (e: any) { infoAlert('Fehler', e?.message); }
    }, { confirmLabel: 'Deaktivieren', destructive: true });
  };

  const hardDelete = (c: Course) => {
    confirmAlert(
      'Kurs endgültig löschen?',
      `${c.name} wird KOMPLETT gelöscht. Alle zukünftigen Termine werden abgesagt und die Teilnehmer per Push informiert. Dieser Schritt kann nicht rückgängig gemacht werden.`,
      () => {
        // Zweite Bestätigung
        confirmAlert(
          'Wirklich löschen?',
          `Letzte Chance: ${c.name} ist dann weg. Fortfahren?`,
          async () => {
            try {
              await trpcClient.courses.admin.hardDeleteCourse.mutate({ id: c.id });
              await load();
            } catch (e: any) { infoAlert('Fehler', e?.message); }
          },
          { confirmLabel: 'Ja, löschen', destructive: true },
        );
      },
      { confirmLabel: 'Löschen', destructive: true },
    );
  };

  if (loading) return <TrainerOnly><View style={styles.center}><ActivityIndicator color={Colors.accent} /></View></TrainerOnly>;

  return (
    <TrainerOnly><SafeAreaView edges={['bottom']} style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.xxl + Spacing.lg }}>
        <Pressable style={styles.newBtn} onPress={openNew}>
          <Plus size={18} color={Colors.text} /><Text style={styles.newText}>Neuer Kurs</Text>
        </Pressable>
        {courses.map(c => (
          <View key={c.id} style={styles.card}>
            <View style={[styles.colorBar, { backgroundColor: c.color ?? Colors.border }]} />
            <Pressable style={{ flex: 1 }} onPress={() => router.push(`/admin-course-detail?id=${c.id}`)}>
              <Text style={[styles.name, !c.is_active && { opacity: 0.5 }]}>{c.name} {!c.is_active && '(inaktiv)'}</Text>
              <Text style={styles.meta}>{c.duration_minutes} min · max {c.max_participants}{c.category ? ' · ' + c.category : ''}</Text>
            </Pressable>
            <Pressable onPress={() => openEdit(c)}><Text style={styles.link}>Bearbeiten</Text></Pressable>
            <Pressable onPress={() => softDelete(c)} hitSlop={6}><Text style={[styles.link, { color: Colors.textMuted }]}>⏻</Text></Pressable>
            <Pressable onPress={() => hardDelete(c)} hitSlop={6}><Trash2 size={18} color={Colors.error} /></Pressable>
            <ChevronRight size={18} color={Colors.textMuted} />
          </View>
        ))}
      </ScrollView>

      <Modal visible={modalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBg}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editing ? 'Kurs bearbeiten' : 'Neuer Kurs'}</Text>
            {!editing && (
              <Text style={{ color: Colors.textSecondary, fontSize: 12, marginBottom: Spacing.sm, lineHeight: 18 }}>
                Schritt 1: Kurs-Stammdaten (Name, Dauer, Teilnehmer, Farbe).{'\n'}
                Schritt 2: Nach dem Speichern öffnet sich der Kurs-Detail-Screen, dort legst du Wochentage, wöchentliche Wiederholung oder Einzeltermine an.
              </Text>
            )}
            <TextInput style={styles.input} placeholder="Name" placeholderTextColor={Colors.textMuted} value={form.name} onChangeText={v => setForm({ ...form, name: v })} />
            <TextInput style={[styles.input, { height: 80 }]} multiline placeholder="Beschreibung" placeholderTextColor={Colors.textMuted} value={form.description} onChangeText={v => setForm({ ...form, description: v })} />
            <TextInput style={styles.input} placeholder="Dauer (Minuten)" keyboardType="numeric" placeholderTextColor={Colors.textMuted} value={form.duration_minutes} onChangeText={v => setForm({ ...form, duration_minutes: v })} />
            <TextInput style={styles.input} placeholder="Max. Teilnehmer" keyboardType="numeric" placeholderTextColor={Colors.textMuted} value={form.max_participants} onChangeText={v => setForm({ ...form, max_participants: v })} />
            <TextInput style={styles.input} placeholder="Kategorie (optional)" placeholderTextColor={Colors.textMuted} value={form.category} onChangeText={v => setForm({ ...form, category: v })} />

            <Text style={styles.label}>Farbe</Text>
            <View style={styles.swatchRow}>
              {CoursePalette.map(p => (
                <Pressable
                  key={p.value}
                  onPress={() => setForm({ ...form, color: p.value })}
                  style={[
                    styles.swatch,
                    { backgroundColor: p.value },
                    form.color === p.value && styles.swatchActive,
                  ]}
                  accessibilityLabel={`Farbe ${p.name}`}
                />
              ))}
            </View>

            {editing && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm }}>
                <Text style={{ color: Colors.text }}>Aktiv</Text>
                <Switch value={form.is_active} onValueChange={v => setForm({ ...form, is_active: v })} />
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <Pressable style={[styles.modalBtn, { backgroundColor: Colors.surfaceLight }]} onPress={() => setModalOpen(false)}><Text style={styles.btnText}>Abbrechen</Text></Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: Colors.accent }]} onPress={save}><Text style={styles.btnText}>Speichern</Text></Pressable>
            </View>
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
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.accent, padding: Spacing.md, borderRadius: BorderRadius.md, justifyContent: 'center', marginBottom: Spacing.md },
  newText: { color: Colors.text, fontWeight: '700' },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.sm, overflow: 'hidden' },
  colorBar: { width: 4, alignSelf: 'stretch', marginLeft: -Spacing.md, borderTopLeftRadius: BorderRadius.md, borderBottomLeftRadius: BorderRadius.md },
  name: { color: Colors.text, fontWeight: '700' },
  meta: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  link: { color: Colors.accent, fontWeight: '600' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', padding: Spacing.md },
  modal: { backgroundColor: Colors.surface, padding: Spacing.lg, borderRadius: BorderRadius.lg, width: '100%', maxWidth: 560, alignSelf: 'center' },
  modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '700', marginBottom: Spacing.md },
  input: { backgroundColor: Colors.surfaceLight, color: Colors.text, padding: Spacing.sm, borderRadius: BorderRadius.sm, marginBottom: Spacing.sm },
  modalBtn: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.sm, alignItems: 'center' },
  btnText: { color: Colors.text, fontWeight: '700' },
  label: { color: Colors.textSecondary, fontSize: 12, marginBottom: Spacing.xs, marginTop: Spacing.xs },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
  swatchActive: { borderColor: Colors.text, transform: [{ scale: 1.1 }] },
});
