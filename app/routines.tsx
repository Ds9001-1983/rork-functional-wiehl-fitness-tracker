import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Plus, Trash2, Play, X, Dumbbell, Edit3 } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { useWorkouts } from '@/hooks/use-workouts';
import { exercises as exerciseDb, exerciseCategories } from '@/data/exercises';
import { RoutineExercise } from '@/types/workout';
import ConfirmDialog from '@/components/ConfirmDialog';
import StatusBanner from '@/components/StatusBanner';

export default function RoutinesScreen() {
  const router = useRouter();
  const { routines, saveRoutine, deleteRoutine, startWorkoutFromRoutine } = useWorkouts();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [newRoutineExercises, setNewRoutineExercises] = useState<RoutineExercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{type: 'error' | 'success'; text: string} | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{id: string; name: string} | null>(null);

  // Edit state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRoutineId, setEditRoutineId] = useState('');
  const [editRoutineName, setEditRoutineName] = useState('');
  const [editRoutineExercises, setEditRoutineExercises] = useState<RoutineExercise[]>([]);
  const [showEditExercisePicker, setShowEditExercisePicker] = useState(false);
  const [editSearchQuery, setEditSearchQuery] = useState('');
  const [editSelectedCategory, setEditSelectedCategory] = useState<string | null>(null);

  const handleCreateRoutine = async () => {
    if (!newRoutineName.trim()) {
      setStatusMessage({ type: 'error', text: 'Bitte gib einen Namen ein.' });
      return;
    }
    if (newRoutineExercises.length === 0) {
      setStatusMessage({ type: 'error', text: 'Fuege mindestens eine Uebung hinzu.' });
      return;
    }

    await saveRoutine({
      name: newRoutineName.trim(),
      exercises: newRoutineExercises,
      createdBy: 'self',
    });

    setNewRoutineName('');
    setNewRoutineExercises([]);
    setShowCreateModal(false);
  };

  const handleDeleteRoutine = (routineId: string, name: string) => {
    setDeleteTarget({ id: routineId, name });
    setShowDeleteConfirm(true);
  };

  const handleStartRoutine = (routine: any) => {
    startWorkoutFromRoutine(routine);
    router.push('/active-workout');
  };

  const addExerciseToRoutine = (exerciseId: string) => {
    setNewRoutineExercises(prev => [
      ...prev,
      { exerciseId, sets: 3, reps: 10 },
    ]);
    setShowExercisePicker(false);
  };

  const removeExerciseFromRoutine = (index: number) => {
    setNewRoutineExercises(prev => prev.filter((_, i) => i !== index));
  };

  const updateRoutineExercise = (index: number, update: Partial<RoutineExercise>) => {
    setNewRoutineExercises(prev =>
      prev.map((e, i) => i === index ? { ...e, ...update } : e)
    );
  };

  const openEditRoutine = (routine: any) => {
    setEditRoutineId(routine.id);
    setEditRoutineName(routine.name);
    setEditRoutineExercises([...routine.exercises]);
    setEditSearchQuery('');
    setEditSelectedCategory(null);
    setShowEditModal(true);
  };

  const handleSaveEditRoutine = async () => {
    if (!editRoutineName.trim()) {
      setStatusMessage({ type: 'error', text: 'Bitte gib einen Namen ein.' });
      return;
    }
    if (editRoutineExercises.length === 0) {
      setStatusMessage({ type: 'error', text: 'Fuege mindestens eine Uebung hinzu.' });
      return;
    }

    // Delete old and save new (saveRoutine creates new)
    await deleteRoutine(editRoutineId);
    await saveRoutine({
      name: editRoutineName.trim(),
      exercises: editRoutineExercises,
      createdBy: 'self',
    });
    setShowEditModal(false);
    setStatusMessage({ type: 'success', text: 'Routine wurde aktualisiert.' });
  };

  const addExerciseToEdit = (exerciseId: string) => {
    setEditRoutineExercises(prev => [
      ...prev,
      { exerciseId, sets: 3, reps: 10 },
    ]);
    setShowEditExercisePicker(false);
  };

  const updateEditExercise = (index: number, update: Partial<RoutineExercise>) => {
    setEditRoutineExercises(prev =>
      prev.map((e, i) => i === index ? { ...e, ...update } : e)
    );
  };

  // Discard confirmation
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [discardAction, setDiscardAction] = useState<(() => void) | null>(null);

  const handleCloseCreateRoutine = () => {
    if (newRoutineName.trim().length > 0 || newRoutineExercises.length > 0) {
      setDiscardAction(() => () => {
        setNewRoutineName('');
        setNewRoutineExercises([]);
        setShowCreateModal(false);
      });
      setShowDiscardConfirm(true);
    } else {
      setShowCreateModal(false);
    }
  };

  const handleCloseEditRoutine = () => {
    const original = routines.find(r => r.id === editRoutineId);
    const hasChanges = original ? (editRoutineName !== original.name || editRoutineExercises.length !== original.exercises.length) : false;
    if (hasChanges) {
      setDiscardAction(() => () => setShowEditModal(false));
      setShowDiscardConfirm(true);
    } else {
      setShowEditModal(false);
    }
  };

  const filteredEditExercises = exerciseDb.filter(e => {
    const matchesSearch = !editSearchQuery ||
      e.name.toLowerCase().includes(editSearchQuery.toLowerCase()) ||
      e.muscleGroups.some(mg => mg.toLowerCase().includes(editSearchQuery.toLowerCase()));
    const matchesCategory = !editSelectedCategory || e.category === editSelectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredExercises = exerciseDb.filter(e => {
    const matchesSearch = !searchQuery ||
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.muscleGroups.some(mg => mg.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || e.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getExerciseName = (exerciseId: string) => {
    return exerciseDb.find(e => e.id === exerciseId)?.name || exerciseId;
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Routinen' }} />
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Meine Routinen</Text>
            <Text style={styles.subtitle}>Erstelle Vorlagen fuer deine Workouts</Text>
          </View>

          {statusMessage && (
            <View style={{ marginHorizontal: Spacing.lg }}>
              <StatusBanner
                type={statusMessage.type}
                text={statusMessage.text}
                onDismiss={() => setStatusMessage(null)}
              />
            </View>
          )}

          {routines.length === 0 ? (
            <View style={styles.emptyState}>
              <Dumbbell size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Keine Routinen vorhanden</Text>
              <Text style={styles.emptySubtext}>
                Erstelle deine erste Routine, um Workouts schneller zu starten.
              </Text>
            </View>
          ) : (
            routines.map((routine) => (
              <View key={routine.id} style={styles.routineCard}>
                <View style={styles.routineHeader}>
                  <Text style={styles.routineName}>{routine.name}</Text>
                  <View style={styles.routineActions}>
                    <TouchableOpacity onPress={() => openEditRoutine(routine)} style={styles.routineActionIcon}>
                      <Edit3 size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteRoutine(routine.id, routine.name)} style={styles.routineActionIcon}>
                      <Trash2 size={18} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.routineExercises}>
                  {routine.exercises.map((re, i) => (
                    <Text key={i} style={styles.routineExercise}>
                      {re.sets}x {getExerciseName(re.exerciseId)}
                      {re.reps ? ` - ${re.reps} Wdh` : ''}
                    </Text>
                  ))}
                </View>

                <View style={styles.routineFooter}>
                  <Text style={styles.routineUsage}>
                    {routine.timesUsed}x verwendet
                    {routine.lastUsed && ` - Zuletzt ${new Date(routine.lastUsed).toLocaleDateString('de-DE')}`}
                  </Text>
                  <TouchableOpacity
                    style={styles.startRoutineButton}
                    onPress={() => handleStartRoutine(routine)}
                  >
                    <Play size={16} color={Colors.text} />
                    <Text style={styles.startRoutineText}>Starten</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Plus size={20} color={Colors.text} />
            <Text style={styles.createButtonText}>Neue Routine erstellen</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Create Routine Modal */}
        <Modal visible={showCreateModal} animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleCloseCreateRoutine}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Neue Routine</Text>
              <TouchableOpacity onPress={handleCreateRoutine}>
                <Text style={styles.saveButton}>Speichern</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <TextInput
                style={styles.nameInput}
                placeholder="Routine-Name (z.B. Push Day)"
                placeholderTextColor={Colors.textMuted}
                value={newRoutineName}
                onChangeText={setNewRoutineName}
              />

              <Text style={styles.exercisesLabel}>
                Uebungen ({newRoutineExercises.length})
              </Text>

              {newRoutineExercises.map((re, index) => (
                <View key={index} style={styles.exerciseRow}>
                  <View style={styles.exerciseRowInfo}>
                    <Text style={styles.exerciseRowName}>
                      {getExerciseName(re.exerciseId)}
                    </Text>
                    <View style={styles.exerciseRowInputs}>
                      <View style={styles.miniInput}>
                        <Text style={styles.miniLabel}>Saetze</Text>
                        <TouchableOpacity
                          style={styles.miniInputBox}
                          onPress={() => {
                            const val = parseInt(String(re.sets)) || 3;
                            updateRoutineExercise(index, { sets: val === 5 ? 1 : val + 1 });
                          }}
                        >
                          <Text style={styles.miniInputText}>{re.sets}</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.miniInput}>
                        <Text style={styles.miniLabel}>Wdh</Text>
                        <TouchableOpacity
                          style={styles.miniInputBox}
                          onPress={() => {
                            const val = parseInt(String(re.reps)) || 10;
                            const options = [5, 8, 10, 12, 15, 20];
                            const nextIdx = (options.indexOf(val) + 1) % options.length;
                            updateRoutineExercise(index, { reps: options[nextIdx] });
                          }}
                        >
                          <Text style={styles.miniInputText}>{re.reps || '-'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => removeExerciseFromRoutine(index)}>
                    <X size={18} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={styles.addExerciseButton}
                onPress={() => setShowExercisePicker(true)}
              >
                <Plus size={18} color={Colors.accent} />
                <Text style={styles.addExerciseText}>Uebung hinzufuegen</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Exercise Picker */}
          <Modal visible={showExercisePicker} animationType="slide">
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowExercisePicker(false)}>
                  <X size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Uebung waehlen</Text>
                <View style={{ width: 24 }} />
              </View>

              <TextInput
                style={styles.searchInput}
                placeholder="Suchen..."
                placeholderTextColor={Colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                <TouchableOpacity
                  style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(null)}
                >
                  <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>
                    Alle
                  </Text>
                </TouchableOpacity>
                {exerciseCategories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <Text style={[styles.categoryChipText, selectedCategory === cat.id && styles.categoryChipTextActive]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <ScrollView style={styles.exercisePickerList}>
                {filteredExercises.map(exercise => (
                  <TouchableOpacity
                    key={exercise.id}
                    style={styles.exercisePickerItem}
                    onPress={() => addExerciseToRoutine(exercise.id)}
                  >
                    <Text style={styles.exercisePickerName}>{exercise.name}</Text>
                    <Text style={styles.exercisePickerMuscles}>
                      {exercise.muscleGroups.join(' / ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Modal>
        </Modal>

        {/* Edit Routine Modal */}
        <Modal visible={showEditModal} animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleCloseEditRoutine}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Routine bearbeiten</Text>
              <TouchableOpacity onPress={handleSaveEditRoutine}>
                <Text style={styles.saveButton}>Speichern</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <TextInput
                style={styles.nameInput}
                placeholder="Routine-Name"
                placeholderTextColor={Colors.textMuted}
                value={editRoutineName}
                onChangeText={setEditRoutineName}
              />

              <Text style={styles.exercisesLabel}>
                Uebungen ({editRoutineExercises.length})
              </Text>

              {editRoutineExercises.map((re, index) => (
                <View key={index} style={styles.exerciseRow}>
                  <View style={styles.exerciseRowInfo}>
                    <Text style={styles.exerciseRowName}>
                      {getExerciseName(re.exerciseId)}
                    </Text>
                    <View style={styles.exerciseRowInputs}>
                      <View style={styles.miniInput}>
                        <Text style={styles.miniLabel}>Saetze</Text>
                        <TouchableOpacity
                          style={styles.miniInputBox}
                          onPress={() => {
                            const val = parseInt(String(re.sets)) || 3;
                            updateEditExercise(index, { sets: val === 5 ? 1 : val + 1 });
                          }}
                        >
                          <Text style={styles.miniInputText}>{re.sets}</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.miniInput}>
                        <Text style={styles.miniLabel}>Wdh</Text>
                        <TouchableOpacity
                          style={styles.miniInputBox}
                          onPress={() => {
                            const val = parseInt(String(re.reps)) || 10;
                            const options = [5, 8, 10, 12, 15, 20];
                            const nextIdx = (options.indexOf(val) + 1) % options.length;
                            updateEditExercise(index, { reps: options[nextIdx] });
                          }}
                        >
                          <Text style={styles.miniInputText}>{re.reps || '-'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setEditRoutineExercises(prev => prev.filter((_, i) => i !== index))}>
                    <X size={18} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={styles.addExerciseButton}
                onPress={() => setShowEditExercisePicker(true)}
              >
                <Plus size={18} color={Colors.accent} />
                <Text style={styles.addExerciseText}>Uebung hinzufuegen</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Exercise Picker for Edit */}
          <Modal visible={showEditExercisePicker} animationType="slide">
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowEditExercisePicker(false)}>
                  <X size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Uebung waehlen</Text>
                <View style={{ width: 24 }} />
              </View>

              <TextInput
                style={styles.searchInput}
                placeholder="Suchen..."
                placeholderTextColor={Colors.textMuted}
                value={editSearchQuery}
                onChangeText={setEditSearchQuery}
              />

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                <TouchableOpacity
                  style={[styles.categoryChip, !editSelectedCategory && styles.categoryChipActive]}
                  onPress={() => setEditSelectedCategory(null)}
                >
                  <Text style={[styles.categoryChipText, !editSelectedCategory && styles.categoryChipTextActive]}>
                    Alle
                  </Text>
                </TouchableOpacity>
                {exerciseCategories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryChip, editSelectedCategory === cat.id && styles.categoryChipActive]}
                    onPress={() => setEditSelectedCategory(cat.id)}
                  >
                    <Text style={[styles.categoryChipText, editSelectedCategory === cat.id && styles.categoryChipTextActive]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <ScrollView style={styles.exercisePickerList}>
                {filteredEditExercises.map(exercise => (
                  <TouchableOpacity
                    key={exercise.id}
                    style={styles.exercisePickerItem}
                    onPress={() => addExerciseToEdit(exercise.id)}
                  >
                    <Text style={styles.exercisePickerName}>{exercise.name}</Text>
                    <Text style={styles.exercisePickerMuscles}>
                      {exercise.muscleGroups.join(' / ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Modal>
        </Modal>

        <ConfirmDialog
          visible={showDeleteConfirm}
          title="Routine loeschen"
          message={deleteTarget ? `"${deleteTarget.name}" wirklich loeschen?` : ''}
          confirmText="Loeschen"
          cancelText="Abbrechen"
          destructive
          onConfirm={() => {
            if (deleteTarget) {
              deleteRoutine(deleteTarget.id);
            }
            setShowDeleteConfirm(false);
            setDeleteTarget(null);
          }}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setDeleteTarget(null);
          }}
        />

        <ConfirmDialog
          visible={showDiscardConfirm}
          title="Nicht gespeicherte Aenderungen"
          message="Willst du die Aenderungen verwerfen?"
          confirmText="Verwerfen"
          cancelText="Weiter bearbeiten"
          destructive
          onConfirm={() => {
            setShowDiscardConfirm(false);
            if (discardAction) discardAction();
            setDiscardAction(null);
          }}
          onCancel={() => {
            setShowDiscardConfirm(false);
            setDiscardAction(null);
          }}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xxl,
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  routineCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  routineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  routineActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  routineActionIcon: {
    padding: Spacing.xs,
  },
  routineName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  routineExercises: {
    marginBottom: Spacing.sm,
  },
  routineExercise: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  routineFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  routineUsage: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  startRoutineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  startRoutineText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  createButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
    marginLeft: Spacing.sm,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  saveButton: {
    fontSize: 16,
    color: Colors.accent,
    fontWeight: '600' as const,
  },
  modalBody: {
    flex: 1,
    padding: Spacing.lg,
  },
  nameInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  exercisesLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exerciseRowInfo: {
    flex: 1,
  },
  exerciseRowName: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  exerciseRowInputs: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  miniInput: {
    alignItems: 'center',
  },
  miniLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  miniInputBox: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    minWidth: 44,
    alignItems: 'center',
  },
  miniInputText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.accent,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.accent,
    borderStyle: 'dashed',
    marginTop: Spacing.sm,
  },
  addExerciseText: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '500' as const,
    marginLeft: Spacing.sm,
  },
  searchInput: {
    backgroundColor: Colors.surface,
    margin: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryScroll: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    maxHeight: 40,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  categoryChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  categoryChipTextActive: {
    color: Colors.text,
    fontWeight: '600' as const,
  },
  exercisePickerList: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  exercisePickerItem: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  exercisePickerName: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  exercisePickerMuscles: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});
