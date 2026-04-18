import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { ArrowLeft, Plus, Pencil, X, Check, Tag, Dumbbell, Search } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';

type Tab = 'exercises' | 'categories';

interface ExerciseRow {
  id: string;
  name: string;
  category: string;
  muscleGroups: string[];
  equipment?: string | null;
  instructions?: string | null;
  videoUrl?: string | null;
  active: boolean;
}

interface CategoryRow {
  slug: string;
  name: string;
  icon?: string;
  orderIndex: number;
  active: boolean;
}

export default function AdminExercisesScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('exercises');
  const [search, setSearch] = useState('');
  const [editExercise, setEditExercise] = useState<ExerciseRow | null>(null);
  const [editCategory, setEditCategory] = useState<CategoryRow | null>(null);
  const [showNewExercise, setShowNewExercise] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);

  const utils = trpc.useUtils();
  const exercisesQuery = trpc.exercises.list.useQuery({ includeInactive: true });
  const categoriesQuery = trpc.exerciseCategories.list.useQuery({ includeInactive: true });

  const refetchAll = async () => {
    await Promise.all([
      utils.exercises.list.invalidate(),
      utils.exerciseCategories.list.invalidate(),
    ]);
  };

  const filteredExercises: ExerciseRow[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = (exercisesQuery.data ?? []) as ExerciseRow[];
    if (!q) return rows;
    return rows.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.muscleGroups.some((m) => m.toLowerCase().includes(q))
    );
  }, [exercisesQuery.data, search]);

  const categories = (categoriesQuery.data ?? []) as CategoryRow[];

  if (user?.role !== 'admin') {
    return (
      <View style={styles.centered}>
        <Text style={styles.centeredText}>Nur für Administratoren</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Übungsverwaltung',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ padding: Spacing.sm }}>
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.container}>
        {/* Tab-Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'exercises' && styles.tabBtnActive]}
            onPress={() => setTab('exercises')}
          >
            <Dumbbell size={16} color={tab === 'exercises' ? Colors.text : Colors.textSecondary} />
            <Text style={[styles.tabBtnText, tab === 'exercises' && styles.tabBtnTextActive]}>
              Übungen
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'categories' && styles.tabBtnActive]}
            onPress={() => setTab('categories')}
          >
            <Tag size={16} color={tab === 'categories' ? Colors.text : Colors.textSecondary} />
            <Text style={[styles.tabBtnText, tab === 'categories' && styles.tabBtnTextActive]}>
              Kategorien
            </Text>
          </TouchableOpacity>
        </View>

        {tab === 'exercises' && (
          <>
            <View style={styles.searchRow}>
              <Search size={18} color={Colors.textSecondary} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Suche nach Name, Kategorie, Muskel…"
                placeholderTextColor={Colors.textMuted}
                style={styles.searchInput}
              />
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => setShowNewExercise(true)}
            >
              <Plus size={18} color={Colors.text} />
              <Text style={styles.primaryBtnText}>Neue Übung anlegen</Text>
            </TouchableOpacity>

            {exercisesQuery.isLoading ? (
              <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.xl }} />
            ) : (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }}>
                {filteredExercises.length === 0 && (
                  <Text style={styles.empty}>Keine Übungen gefunden.</Text>
                )}
                {filteredExercises.map((ex) => {
                  const cat = categories.find((c) => c.slug === ex.category);
                  return (
                    <View key={ex.id} style={[styles.row, !ex.active && styles.rowInactive]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>
                          {cat?.icon ? cat.icon + ' ' : ''}{ex.name}
                        </Text>
                        <Text style={styles.rowSub}>
                          {cat?.name ?? ex.category}
                          {ex.equipment ? ` · ${ex.equipment}` : ''}
                        </Text>
                        <Text style={styles.rowMuscles} numberOfLines={1}>
                          {ex.muscleGroups.join(', ')}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => setEditExercise(ex)} style={styles.iconBtn}>
                        <Pencil size={18} color={Colors.accent} />
                      </TouchableOpacity>
                      <Switch
                        value={ex.active}
                        onValueChange={async (val) => {
                          try {
                            await utils.client.exercises.toggleActive.mutate({ id: ex.id, active: val });
                            await refetchAll();
                          } catch (err) {
                            Alert.alert('Fehler', String((err as Error).message ?? err));
                          }
                        }}
                      />
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </>
        )}

        {tab === 'categories' && (
          <>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => setShowNewCategory(true)}
            >
              <Plus size={18} color={Colors.text} />
              <Text style={styles.primaryBtnText}>Neue Kategorie anlegen</Text>
            </TouchableOpacity>

            {categoriesQuery.isLoading ? (
              <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.xl }} />
            ) : (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }}>
                {categories.length === 0 && (
                  <Text style={styles.empty}>Keine Kategorien vorhanden.</Text>
                )}
                {categories.map((c) => (
                  <View key={c.slug} style={[styles.row, !c.active && styles.rowInactive]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>
                        {c.icon ? c.icon + ' ' : ''}{c.name}
                      </Text>
                      <Text style={styles.rowSub}>Slug: {c.slug}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setEditCategory(c)} style={styles.iconBtn}>
                      <Pencil size={18} color={Colors.accent} />
                    </TouchableOpacity>
                    <Switch
                      value={c.active}
                      onValueChange={async (val) => {
                        try {
                          await utils.client.exerciseCategories.update.mutate({
                            slug: c.slug,
                            patch: { active: val },
                          });
                          await refetchAll();
                        } catch (err) {
                          Alert.alert('Fehler', String((err as Error).message ?? err));
                        }
                      }}
                    />
                  </View>
                ))}
              </ScrollView>
            )}
          </>
        )}
      </View>

      {/* Exercise-Edit-Modal */}
      {(editExercise || showNewExercise) && (
        <ExerciseEditModal
          exercise={editExercise}
          categories={categories}
          onClose={() => {
            setEditExercise(null);
            setShowNewExercise(false);
          }}
          onSaved={refetchAll}
        />
      )}

      {/* Category-Edit-Modal */}
      {(editCategory || showNewCategory) && (
        <CategoryEditModal
          category={editCategory}
          onClose={() => {
            setEditCategory(null);
            setShowNewCategory(false);
          }}
          onSaved={refetchAll}
        />
      )}
    </>
  );
}

// ---- Exercise Edit Modal ----

function ExerciseEditModal(props: {
  exercise: ExerciseRow | null;
  categories: CategoryRow[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { exercise, categories, onClose, onSaved } = props;
  const isNew = !exercise;

  const [name, setName] = useState(exercise?.name ?? '');
  const [category, setCategory] = useState(exercise?.category ?? categories[0]?.slug ?? '');
  const [muscleGroupsText, setMuscleGroupsText] = useState(exercise?.muscleGroups.join(', ') ?? '');
  const [equipment, setEquipment] = useState(exercise?.equipment ?? '');
  const [instructions, setInstructions] = useState(exercise?.instructions ?? '');
  const [videoUrl, setVideoUrl] = useState(exercise?.videoUrl ?? '');
  const [saving, setSaving] = useState(false);

  const createMut = trpc.exercises.create.useMutation();
  const updateMut = trpc.exercises.update.useMutation();

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Fehler', 'Bitte einen Namen eingeben.');
      return;
    }
    if (!category) {
      Alert.alert('Fehler', 'Bitte eine Kategorie wählen.');
      return;
    }
    const muscleGroups = muscleGroupsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (muscleGroups.length === 0) {
      Alert.alert('Fehler', 'Bitte mindestens eine Muskelgruppe angeben (komma-getrennt).');
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        await createMut.mutateAsync({
          name: name.trim(),
          category,
          muscleGroups,
          equipment: equipment.trim() || undefined,
          instructions: instructions.trim() || undefined,
          videoUrl: videoUrl.trim() || undefined,
        });
      } else {
        await updateMut.mutateAsync({
          id: exercise!.id,
          patch: {
            name: name.trim(),
            category,
            muscleGroups,
            equipment: equipment.trim() || null,
            instructions: instructions.trim() || null,
            videoUrl: videoUrl.trim() || null,
          },
        });
      }
      await onSaved();
      onClose();
    } catch (err) {
      Alert.alert('Fehler', String((err as Error).message ?? err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isNew ? 'Neue Übung anlegen' : 'Übung bearbeiten'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
              <X size={20} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xl }}>
            <Field label="Name *" hint="z.B. Bankdrücken">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Name der Übung"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
              />
            </Field>

            <Field label="Kategorie *" hint="Wähle aus den vorhandenen Kategorien">
              <View style={styles.chipRow}>
                {categories.filter((c) => c.active).map((c) => (
                  <TouchableOpacity
                    key={c.slug}
                    onPress={() => setCategory(c.slug)}
                    style={[styles.chip, category === c.slug && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, category === c.slug && styles.chipTextActive]}>
                      {c.icon ? c.icon + ' ' : ''}{c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>

            <Field label="Muskelgruppen *" hint="Mehrere mit Komma trennen, z.B.: Brust, Trizeps, Schultern">
              <TextInput
                value={muscleGroupsText}
                onChangeText={setMuscleGroupsText}
                placeholder="Brust, Trizeps, Schultern"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
              />
            </Field>

            <Field label="Equipment" hint="Optional — z.B. Langhantel, Kurzhanteln, Kabelzug">
              <TextInput
                value={equipment}
                onChangeText={setEquipment}
                placeholder="Langhantel"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
              />
            </Field>

            <Field label="Anleitung" hint="Optional — kurze Ausführungshinweise">
              <TextInput
                value={instructions}
                onChangeText={setInstructions}
                placeholder="Lege dich auf die Bank…"
                placeholderTextColor={Colors.textMuted}
                style={[styles.input, styles.textarea]}
                multiline
                numberOfLines={4}
              />
            </Field>

            <Field label="YouTube-URL" hint="Optional — Link zum Demo-Video">
              <TextInput
                value={videoUrl}
                onChangeText={setVideoUrl}
                placeholder="https://youtube.com/watch?v=…"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={styles.input}
              />
            </Field>

            <TouchableOpacity
              style={[styles.primaryBtn, saving && { opacity: 0.6 }]}
              onPress={save}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.text} />
              ) : (
                <>
                  <Check size={18} color={Colors.text} />
                  <Text style={styles.primaryBtnText}>
                    {isNew ? 'Übung anlegen' : 'Änderungen speichern'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ---- Category Edit Modal ----

function CategoryEditModal(props: {
  category: CategoryRow | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { category, onClose, onSaved } = props;
  const isNew = !category;

  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? '');
  const [orderIndex, setOrderIndex] = useState(String(category?.orderIndex ?? 0));
  const [saving, setSaving] = useState(false);

  const createMut = trpc.exerciseCategories.create.useMutation();
  const updateMut = trpc.exerciseCategories.update.useMutation();

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Fehler', 'Bitte einen Namen eingeben.');
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        await createMut.mutateAsync({
          name: name.trim(),
          icon: icon.trim() || undefined,
          orderIndex: parseInt(orderIndex, 10) || 0,
        });
      } else {
        await updateMut.mutateAsync({
          slug: category!.slug,
          patch: {
            name: name.trim(),
            icon: icon.trim() || null,
            orderIndex: parseInt(orderIndex, 10) || 0,
          },
        });
      }
      await onSaved();
      onClose();
    } catch (err) {
      Alert.alert('Fehler', String((err as Error).message ?? err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isNew ? 'Neue Kategorie anlegen' : 'Kategorie bearbeiten'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
              <X size={20} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xl }}>
            <Field label="Name *" hint="z.B. Brust, Cardio, Aufwärmen">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Kategorie-Name"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
              />
            </Field>

            <Field label="Icon / Emoji" hint="Optional — z.B. 💪, 🏃, 🔥">
              <TextInput
                value={icon}
                onChangeText={setIcon}
                placeholder="💪"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
                maxLength={10}
              />
            </Field>

            <Field label="Sortier-Index" hint="Kleinere Zahl = weiter oben in der Liste">
              <TextInput
                value={orderIndex}
                onChangeText={setOrderIndex}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
                keyboardType="number-pad"
              />
            </Field>

            <TouchableOpacity
              style={[styles.primaryBtn, saving && { opacity: 0.6 }]}
              onPress={save}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.text} />
              ) : (
                <>
                  <Check size={18} color={Colors.text} />
                  <Text style={styles.primaryBtnText}>
                    {isNew ? 'Kategorie anlegen' : 'Änderungen speichern'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Field(props: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      {props.hint ? <Text style={styles.fieldHint}>{props.hint}</Text> : null}
      {props.children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  centeredText: { color: Colors.text, fontSize: 16 },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.md,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  tabBtnActive: { backgroundColor: Colors.accent },
  tabBtnText: { color: Colors.textSecondary, fontWeight: '600' },
  tabBtnTextActive: { color: Colors.text },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  searchInput: { flex: 1, color: Colors.text, paddingVertical: Spacing.sm },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  primaryBtnText: { color: Colors.text, fontWeight: '700' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: 8,
  },
  rowInactive: { opacity: 0.5 },
  rowTitle: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  rowSub: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  rowMuscles: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  iconBtn: { padding: 6 },

  empty: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.md,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' },

  fieldWrap: { marginBottom: Spacing.md },
  fieldLabel: { color: Colors.text, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  fieldHint: { color: Colors.textMuted, fontSize: 11, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surface,
    color: Colors.text,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  chipActive: { backgroundColor: Colors.accent },
  chipText: { color: Colors.textSecondary, fontSize: 13 },
  chipTextActive: { color: Colors.text, fontWeight: '700' },
});
