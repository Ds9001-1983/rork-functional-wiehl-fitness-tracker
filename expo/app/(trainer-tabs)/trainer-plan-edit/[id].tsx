import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Modal, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Plus, X, Save, Dumbbell, Search, Check } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { trpcClient } from '@/lib/trpc';
import { useExercises } from '@/hooks/use-exercises';
import type { WorkoutExercise, WorkoutSet } from '@/types/workout';

interface Plan {
  id: string;
  name: string;
  description?: string;
  exercises: WorkoutExercise[];
  isInstance?: boolean;
  assignedUserId?: string | null;
}

export default function TrainerPlanEditScreen() {
  const { id: planId } = useLocalSearchParams<{ id: string }>();
  const Colors = useColors();
  const { exercises: exerciseDb } = useExercises();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [exerciseList, setExerciseList] = useState<WorkoutExercise[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');

  const loadPlan = useCallback(async () => {
    if (!planId) return;
    try {
      const plans = (await trpcClient.plans.list.query()) as Plan[];
      const found = plans.find((p) => p.id === planId);
      if (found) {
        setPlan(found);
        setExerciseList(found.exercises || []);
      }
    } catch (e) {
      console.error('[PlanEdit] Load failed:', e);
    }
    setLoading(false);
  }, [planId]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const getExerciseName = (exerciseId: string) =>
    exerciseDb.find((e) => e.id === exerciseId)?.name || exerciseId;

  const updateSet = (exIdx: number, setIdx: number, patch: Partial<WorkoutSet>) => {
    setExerciseList((prev) => {
      const next = [...prev];
      const ex = { ...next[exIdx] };
      const sets = [...ex.sets];
      sets[setIdx] = { ...sets[setIdx], ...patch };
      ex.sets = sets;
      next[exIdx] = ex;
      return next;
    });
  };

  const addSet = (exIdx: number) => {
    setExerciseList((prev) => {
      const next = [...prev];
      const ex = { ...next[exIdx] };
      const lastSet = ex.sets[ex.sets.length - 1];
      const newSet: WorkoutSet = {
        id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        reps: lastSet?.reps ?? 10,
        weight: lastSet?.weight ?? 0,
        completed: false,
      };
      ex.sets = [...ex.sets, newSet];
      next[exIdx] = ex;
      return next;
    });
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    setExerciseList((prev) => {
      const next = [...prev];
      const ex = { ...next[exIdx] };
      ex.sets = ex.sets.filter((_, i) => i !== setIdx);
      next[exIdx] = ex;
      return next;
    });
  };

  const removeExercise = (exIdx: number) => {
    setExerciseList((prev) => prev.filter((_, i) => i !== exIdx));
  };

  const addExercise = (exerciseId: string) => {
    const newEx: WorkoutExercise = {
      id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      exerciseId,
      sets: [{ id: `s-${Date.now()}`, reps: 10, weight: 0, completed: false }],
    };
    setExerciseList((prev) => [...prev, newEx]);
    setShowAddModal(false);
    setExerciseSearch('');
  };

  const save = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      await trpcClient.plans.update.mutate({
        id: plan.id,
        exercises: exerciseList,
      });
      Alert.alert('Gespeichert', 'Änderungen wurden übernommen.');
      router.back();
    } catch (e: any) {
      Alert.alert('Fehler', e?.message || 'Speichern fehlgeschlagen.');
    }
    setSaving(false);
  };

  const filteredAddList = useMemo(() => {
    const q = exerciseSearch.trim().toLowerCase();
    if (!q) return exerciseDb.slice(0, 50);
    return exerciseDb.filter((e) =>
      e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)
    );
  }, [exerciseSearch]);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Plan bearbeiten' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      </>
    );
  }

  if (!plan) {
    return (
      <>
        <Stack.Screen options={{ title: 'Plan bearbeiten' }} />
        <View style={styles.centered}>
          <Text style={styles.muted}>Plan nicht gefunden.</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: plan.name,
          headerRight: () => (
            <TouchableOpacity onPress={save} disabled={saving} style={{ paddingHorizontal: Spacing.md }}>
              <Text style={{ color: saving ? Colors.textMuted : Colors.accent, fontWeight: '700', fontSize: 16 }}>
                {saving ? '…' : 'Speichern'}
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.header}>
            <Text style={styles.title}>{plan.name}</Text>
            {plan.isInstance && (
              <Text style={styles.subtitle}>Persönliche Instanz · Änderungen betreffen nur diesen Kunden</Text>
            )}
            {plan.description ? <Text style={styles.description}>{plan.description}</Text> : null}
          </View>

          {exerciseList.map((ex, exIdx) => (
            <View key={ex.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exerciseName}>{getExerciseName(ex.exerciseId)}</Text>
                </View>
                <TouchableOpacity onPress={() => removeExercise(exIdx)} style={styles.iconBtn}>
                  <X size={18} color={Colors.error} />
                </TouchableOpacity>
              </View>

              <View style={styles.setsHeader}>
                <Text style={styles.setsHeaderLabel}>Satz</Text>
                <Text style={styles.setsHeaderLabel}>Wdh.</Text>
                <Text style={styles.setsHeaderLabel}>Gewicht (kg)</Text>
                <Text style={styles.setsHeaderLabel}> </Text>
              </View>

              {ex.sets.map((s, sIdx) => (
                <View key={s.id} style={styles.setRow}>
                  <Text style={styles.setNumber}>{sIdx + 1}</Text>
                  <TextInput
                    style={styles.setInput}
                    keyboardType="numeric"
                    value={String(s.reps ?? '')}
                    onChangeText={(v) => updateSet(exIdx, sIdx, { reps: parseInt(v) || 0 })}
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                  />
                  <TextInput
                    style={styles.setInput}
                    keyboardType="numeric"
                    value={String(s.weight ?? '')}
                    onChangeText={(v) => updateSet(exIdx, sIdx, { weight: parseFloat(v.replace(',', '.')) || 0 })}
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                  />
                  <TouchableOpacity onPress={() => removeSet(exIdx, sIdx)} style={styles.iconBtn}>
                    <X size={14} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(exIdx)}>
                <Plus size={14} color={Colors.accent} />
                <Text style={styles.addSetText}>Satz hinzufügen</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.addExerciseBtn} onPress={() => setShowAddModal(true)}>
            <Plus size={18} color={Colors.text} />
            <Text style={styles.addExerciseText}>Übung hinzufügen</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Exercise-Picker-Modal */}
        <Modal visible={showAddModal} animationType="slide" transparent>
          <View style={styles.modalBg}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Übung hinzufügen</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <X size={22} color={Colors.text} />
                </TouchableOpacity>
              </View>
              <View style={styles.searchRow}>
                <Search size={18} color={Colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  value={exerciseSearch}
                  onChangeText={setExerciseSearch}
                  placeholder="Übung suchen…"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <ScrollView style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">
                {filteredAddList.map((e) => {
                  const already = exerciseList.some((x) => x.exerciseId === e.id);
                  return (
                    <TouchableOpacity
                      key={e.id}
                      style={[styles.pickRow, already && { opacity: 0.4 }]}
                      onPress={() => !already && addExercise(e.id)}
                      disabled={already}
                    >
                      <Dumbbell size={16} color={Colors.accent} />
                      <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                        <Text style={styles.pickName}>{e.name}</Text>
                        <Text style={styles.pickMeta}>{e.muscleGroups?.join(', ') || e.category}</Text>
                      </View>
                      {already ? <Check size={16} color={Colors.accent} /> : <Plus size={16} color={Colors.textSecondary} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const createStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  muted: { color: Colors.textMuted, fontSize: 14 },
  header: { padding: Spacing.lg, paddingBottom: Spacing.md },
  title: { fontSize: 22, fontWeight: '700' as const, color: Colors.text },
  subtitle: { fontSize: 12, color: Colors.accent, marginTop: 4 },
  description: { fontSize: 13, color: Colors.textSecondary, marginTop: Spacing.xs },
  exerciseCard: { backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginBottom: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  exerciseName: { fontSize: 16, fontWeight: '600' as const, color: Colors.text },
  iconBtn: { padding: 6 },
  setsHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.border },
  setsHeaderLabel: { flex: 1, fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase' as const },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  setNumber: { flex: 1, color: Colors.textSecondary, fontSize: 14 },
  setInput: { flex: 1, backgroundColor: Colors.surfaceLight, padding: Spacing.xs, borderRadius: BorderRadius.sm, color: Colors.text, fontSize: 14, textAlign: 'center' as const },
  addSetBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm, alignSelf: 'flex-start' as const },
  addSetText: { color: Colors.accent, fontSize: 13, fontWeight: '600' as const },
  addExerciseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.accent, marginHorizontal: Spacing.lg, padding: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.md },
  addExerciseText: { color: Colors.text, fontWeight: '700' as const },
  footer: { position: 'absolute' as const, bottom: 0, left: 0, right: 0, backgroundColor: Colors.background, padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.accent, padding: Spacing.md, borderRadius: BorderRadius.md },
  saveBtnText: { color: Colors.text, fontSize: 16, fontWeight: '700' as const },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: Spacing.md },
  modal: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, maxWidth: 560, alignSelf: 'center' as const, width: '100%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  modalTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, marginBottom: Spacing.sm, gap: Spacing.sm },
  searchInput: { flex: 1, padding: Spacing.sm, color: Colors.text, fontSize: 14 },
  pickRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pickName: { color: Colors.text, fontSize: 14, fontWeight: '500' as const },
  pickMeta: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
});
