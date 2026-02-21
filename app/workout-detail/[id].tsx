import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Clock, Dumbbell, TrendingUp, Trophy, ChevronLeft, Repeat, Trash2, Edit3, Check } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { useWorkouts } from '@/hooks/use-workouts';
import { exercises as exerciseDb } from '@/data/exercises';
import { calculate1RM } from '@/types/workout';
import ConfirmDialog from '@/components/ConfirmDialog';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { workouts, deleteWorkout, repeatWorkout, updateWorkout } = useWorkouts();
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  const workout = useMemo(() => {
    return workouts.find(w => w.id === id);
  }, [workouts, id]);

  if (!workout) {
    return (
      <>
        <Stack.Screen options={{ title: 'Workout Details' }} />
        <View style={styles.centered}>
          <Text style={styles.centeredText}>Workout nicht gefunden</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Zurück</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const getExerciseName = (exerciseId: string) => {
    return exerciseDb.find(e => e.id === exerciseId)?.name || exerciseId;
  };

  const getExerciseEquipment = (exerciseId: string) => {
    return exerciseDb.find(e => e.id === exerciseId)?.equipment || '';
  };

  const formatDuration = (ms: number) => {
    const totalMins = Math.round(ms / 60000);
    if (totalMins < 60) return `${totalMins} Min.`;
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hrs}h ${mins}m`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  // Calculate stats
  const totalSets = workout.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0
  );
  const totalVolume = workout.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce(
      (sSum, s) => sSum + (s.completed ? s.weight * s.reps : 0), 0
    ), 0
  );
  const bestSet = workout.exercises.reduce<{ exerciseId: string; weight: number; reps: number; e1rm: number } | null>(
    (best, ex) => {
      for (const set of ex.sets) {
        if (!set.completed || set.weight <= 0) continue;
        const e1rm = calculate1RM(set.weight, set.reps);
        if (!best || e1rm > best.e1rm) {
          best = { exerciseId: ex.exerciseId, weight: set.weight, reps: set.reps, e1rm };
        }
      }
      return best;
    }, null
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: workout.name,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ padding: Spacing.xs }}>
              <ChevronLeft size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
        {/* Header info */}
        <View style={styles.header}>
          <View style={styles.nameRow}>
            {editingName ? (
              <>
                <TextInput
                  style={styles.nameInput}
                  value={editName}
                  onChangeText={setEditName}
                  autoFocus
                  onSubmitEditing={() => {
                    if (editName.trim()) {
                      updateWorkout(workout.id, { name: editName.trim() });
                    }
                    setEditingName(false);
                  }}
                />
                <TouchableOpacity onPress={() => {
                  if (editName.trim()) {
                    updateWorkout(workout.id, { name: editName.trim() });
                  }
                  setEditingName(false);
                }}>
                  <Check size={20} color={Colors.success} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.workoutName}>{workout.name}</Text>
                <TouchableOpacity onPress={() => { setEditName(workout.name); setEditingName(true); }}>
                  <Edit3 size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              </>
            )}
          </View>
          <Text style={styles.dateText}>{formatDate(workout.date)}</Text>
          <Text style={styles.timeText}>Gestartet um {formatTime(workout.date)}</Text>
          {!workout.completed && (
            <View style={styles.scheduledBadge}>
              <Text style={styles.scheduledBadgeText}>Geplant</Text>
            </View>
          )}
        </View>

        {/* Stats overview */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Clock size={18} color={Colors.accent} />
            <Text style={styles.statValue}>
              {workout.duration ? formatDuration(workout.duration) : '--'}
            </Text>
            <Text style={styles.statLabel}>Dauer</Text>
          </View>
          <View style={styles.statCard}>
            <Dumbbell size={18} color={Colors.accent} />
            <Text style={styles.statValue}>{totalSets}</Text>
            <Text style={styles.statLabel}>Sätze</Text>
          </View>
          <View style={styles.statCard}>
            <TrendingUp size={18} color={Colors.accent} />
            <Text style={styles.statValue}>
              {totalVolume >= 1000
                ? `${(totalVolume / 1000).toFixed(1)}t`
                : `${totalVolume}kg`}
            </Text>
            <Text style={styles.statLabel}>Volumen</Text>
          </View>
        </View>

        {/* Best set */}
        {bestSet && (
          <View style={styles.bestSetCard}>
            <Trophy size={18} color={Colors.warning} />
            <View style={styles.bestSetInfo}>
              <Text style={styles.bestSetTitle}>Bester Satz</Text>
              <Text style={styles.bestSetText}>
                {getExerciseName(bestSet.exerciseId)}: {bestSet.weight}kg x {bestSet.reps} (Est. 1RM: {bestSet.e1rm}kg)
              </Text>
            </View>
          </View>
        )}

        {/* Exercise breakdown */}
        <Text style={styles.sectionTitle}>Übungen</Text>

        {workout.exercises.map((exercise, exerciseIndex) => {
          const name = getExerciseName(exercise.exerciseId);
          const equipment = getExerciseEquipment(exercise.exerciseId);
          const completedSets = exercise.sets.filter(s => s.completed).length;
          const exerciseVolume = exercise.sets.reduce(
            (sum, s) => sum + (s.completed ? s.weight * s.reps : 0), 0
          );
          const maxWeight = Math.max(...exercise.sets.filter(s => s.completed).map(s => s.weight), 0);

          return (
            <View key={exercise.id || exerciseIndex} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseHeaderLeft}>
                  <Text style={styles.exerciseName}>{name}</Text>
                  {equipment ? (
                    <Text style={styles.exerciseEquipment}>{equipment}</Text>
                  ) : null}
                </View>
                <View style={styles.exerciseHeaderRight}>
                  <Text style={styles.exerciseSummary}>
                    {completedSets}/{exercise.sets.length} Sätze
                  </Text>
                  {exerciseVolume > 0 && (
                    <Text style={styles.exerciseVolume}>{exerciseVolume}kg Vol.</Text>
                  )}
                </View>
              </View>

              {/* Sets table */}
              <View style={styles.setsTable}>
                <View style={styles.setsHeaderRow}>
                  <Text style={[styles.setsHeaderCell, { width: 40 }]}>Satz</Text>
                  <Text style={styles.setsHeaderCell}>Gewicht</Text>
                  <Text style={styles.setsHeaderCell}>Wdh</Text>
                  <Text style={[styles.setsHeaderCell, { width: 50 }]}>Status</Text>
                </View>

                {exercise.sets.map((set, setIndex) => {
                  const setTypeLabel = set.type === 'warmup' ? 'W' : set.type === 'dropset' ? 'D' : set.type === 'failure' ? 'F' : '';
                  const setTypeColor = set.type === 'warmup' ? Colors.warning : set.type === 'dropset' ? Colors.error : set.type === 'failure' ? '#E040FB' : Colors.textMuted;

                  return (
                    <View
                      key={set.id || setIndex}
                      style={[
                        styles.setRow,
                        set.type === 'warmup' && styles.warmupSetRow,
                      ]}
                    >
                      <View style={{ width: 40, alignItems: 'center' }}>
                        {setTypeLabel ? (
                          <Text style={[styles.setTypeText, { color: setTypeColor }]}>{setTypeLabel}</Text>
                        ) : (
                          <Text style={styles.setNumber}>{setIndex + 1}</Text>
                        )}
                      </View>
                      <Text style={styles.setCell}>{set.weight} kg</Text>
                      <Text style={styles.setCell}>{set.reps}</Text>
                      <View style={{ width: 50, alignItems: 'center' }}>
                        <View style={[styles.statusDot, set.completed && styles.statusDotComplete]} />
                      </View>
                    </View>
                  );
                })}
              </View>

              {exercise.notes ? (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesText}>{exercise.notes}</Text>
                </View>
              ) : null}
            </View>
          );
        })}

        {workout.exercises.length === 0 && (
          <View style={styles.emptyExercises}>
            <Text style={styles.emptyExercisesText}>Keine Übungen in diesem Workout</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.repeatButton}
            onPress={() => {
              repeatWorkout(workout);
              router.push('/active-workout' as never);
            }}
          >
            <Repeat size={18} color={Colors.background} />
            <Text style={styles.repeatButtonText}>Workout wiederholen</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => setShowDeleteConfirm(true)}
          >
            <Trash2 size={18} color={Colors.error} />
            <Text style={styles.deleteButtonText}>Löschen</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Workout löschen"
        message={`Möchtest du "${workout.name}" wirklich löschen? Dies kann nicht rückgängig gemacht werden.`}
        confirmText="Löschen"
        cancelText="Abbrechen"
        destructive
        onConfirm={async () => {
          setShowDeleteConfirm(false);
          await deleteWorkout(workout.id);
          router.back();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}

const createStyles = (Colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  centeredText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  backBtn: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
  },
  backBtnText: {
    color: Colors.text,
    fontWeight: '600' as const,
  },
  header: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  scheduledBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.warning + '30',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  scheduledBadgeText: {
    color: Colors.warning,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  statsRow: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  bestSetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.warning + '40',
    marginBottom: Spacing.md,
  },
  bestSetInfo: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  bestSetTitle: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  bestSetText: {
    fontSize: 14,
    color: Colors.text,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  exerciseCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  exerciseHeaderLeft: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.accent,
  },
  exerciseEquipment: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  exerciseHeaderRight: {
    alignItems: 'flex-end',
  },
  exerciseSummary: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  exerciseVolume: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  setsTable: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  setsHeaderRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  setsHeaderCell: {
    flex: 1,
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginVertical: 1,
  },
  warmupSetRow: {
    backgroundColor: 'rgba(255, 193, 7, 0.08)',
  },
  setNumber: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '600' as const,
  },
  setTypeText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  setCell: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border,
  },
  statusDotComplete: {
    backgroundColor: Colors.success,
  },
  notesContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  notesText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  emptyExercises: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyExercisesText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  actionsSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
  },
  repeatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  repeatButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  deleteButtonText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  workoutName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  nameInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
});
