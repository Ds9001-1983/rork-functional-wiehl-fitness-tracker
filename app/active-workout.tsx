import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Save, Timer, MessageSquare, Zap } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { useWorkouts } from '@/hooks/use-workouts';
import { useGamification } from '@/hooks/use-gamification';
import { exercises } from '@/data/exercises';
import { WorkoutSetRow } from '@/components/WorkoutSetRow';
import { RestTimer } from '@/components/RestTimer';
import ConfirmDialog from '@/components/ConfirmDialog';
import { getRandomMessage, workoutCompleteMessages } from '@/data/coaching-messages';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const { activeWorkout, updateSet, addSet, removeSet, saveWorkout, endWorkout, getWorkoutHistory, updateExerciseNotes } = useWorkouts();
  const { processWorkoutComplete, coachingTone } = useGamification();
  const [duration, setDuration] = useState(0);
  const [showRestTimer, setShowRestTimer] = useState(true);
  const [restTimerKey, setRestTimerKey] = useState(0);
  const [restTimerDefault, setRestTimerDefault] = useState(90);

  useEffect(() => {
    AsyncStorage.getItem('restTimerDefault').then(val => {
      if (val) setRestTimerDefault(parseInt(val, 10));
    });
  }, []);

  const handleRestTimerDefaultChange = useCallback((newDefault: number) => {
    setRestTimerDefault(newDefault);
    AsyncStorage.setItem('restTimerDefault', newDefault.toString());
  }, []);
  const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>({});
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [completionResult, setCompletionResult] = useState<{ notifications: string[]; message: string } | null>(null);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get previous performance for an exercise
  const getPreviousPerformance = useCallback((exerciseId: string) => {
    const history = getWorkoutHistory();
    for (let i = history.length - 1; i >= 0; i--) {
      const workout = history[i];
      if (!workout.completed) continue;
      const prevExercise = workout.exercises.find(e => e.exerciseId === exerciseId);
      if (prevExercise && prevExercise.sets.length > 0) {
        return prevExercise.sets.map(s => ({ weight: s.weight, reps: s.reps }));
      }
    }
    return null;
  }, [getWorkoutHistory]);

  const handleFinishWorkout = () => {
    setShowFinishConfirm(true);
  };

  const handleDiscardWorkout = () => {
    setShowDiscardConfirm(true);
  };

  const handleAddExercise = () => {
    router.push('/exercise-select');
  };

  const toggleNotes = (index: number) => {
    setExpandedNotes(prev => ({ ...prev, [index]: !prev[index] }));
  };

  if (!activeWorkout) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.emptyText}>Kein aktives Workout</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Aktives Workout',
          headerRight: () => (
            <TouchableOpacity onPress={handleFinishWorkout}>
              <Save size={24} color={Colors.accent} />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.workoutName}>{activeWorkout.name}</Text>
              <Text style={styles.duration}>{formatDuration(duration)}</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.timerToggle, showRestTimer && styles.timerToggleActive]}
                onPress={() => setShowRestTimer(!showRestTimer)}
              >
                <Timer size={20} color={showRestTimer ? Colors.text : Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {showRestTimer && (
          <RestTimer key={restTimerKey} defaultSeconds={restTimerDefault} autoStart={restTimerKey > 0} onDefaultChange={handleRestTimerDefaultChange} />
        )}

        <ScrollView showsVerticalScrollIndicator={false}>
          {activeWorkout.exercises.map((exercise, exerciseIndex) => {
            const exerciseData = exercises.find(e => e.id === exercise.exerciseId);
            if (!exerciseData) return null;

            const previousSets = getPreviousPerformance(exercise.exerciseId);
            const notesExpanded = expandedNotes[exerciseIndex];

            return (
              <View key={exercise.id} style={styles.exerciseContainer}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseName}>{exerciseData.name}</Text>
                  <TouchableOpacity onPress={() => toggleNotes(exerciseIndex)} style={styles.notesToggle}>
                    <MessageSquare size={16} color={exercise.notes ? Colors.accent : Colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {notesExpanded && (
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Notizen zur Uebung..."
                    placeholderTextColor={Colors.textMuted}
                    value={exercise.notes || ''}
                    onChangeText={(text) => updateExerciseNotes?.(exerciseIndex, text)}
                    multiline
                  />
                )}

                {previousSets && (
                  <Text style={styles.previousLabel}>Letztes Mal</Text>
                )}

                <View style={styles.setsHeader}>
                  <Text style={[styles.setsHeaderText, { flex: 0, width: 30 }]}>#</Text>
                  {previousSets && <Text style={[styles.setsHeaderText, { width: 44 }]}>Vorher</Text>}
                  <Text style={styles.setsHeaderText}>kg</Text>
                  <Text style={[styles.setsHeaderText, { flex: 0, width: 24 }]}></Text>
                  <Text style={styles.setsHeaderText}>Wdh</Text>
                  <Text style={[styles.setsHeaderText, { flex: 0, width: 68 }]}></Text>
                </View>

                {exercise.sets.map((set, setIndex) => (
                  <WorkoutSetRow
                    key={set.id}
                    set={set}
                    setNumber={setIndex + 1}
                    onUpdate={(update) => {
                      updateSet(exerciseIndex, setIndex, update);
                      if (update.completed === true) {
                        setShowRestTimer(true);
                        setRestTimerKey(prev => prev + 1);
                      }
                    }}
                    onRemove={() => removeSet(exerciseIndex, setIndex)}
                    previousWeight={previousSets?.[setIndex]?.weight}
                    previousReps={previousSets?.[setIndex]?.reps}
                  />
                ))}

                <TouchableOpacity
                  style={styles.addSetButton}
                  onPress={() => addSet(exerciseIndex)}
                >
                  <Plus size={16} color={Colors.text} />
                  <Text style={styles.addSetButtonText}>Satz hinzufuegen</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          <TouchableOpacity style={styles.addExerciseButton} onPress={handleAddExercise}>
            <Plus size={20} color={Colors.text} />
            <Text style={styles.addExerciseButtonText}>Uebung hinzufuegen</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.discardButton} onPress={handleDiscardWorkout}>
            <Text style={styles.discardButtonText}>Workout verwerfen</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>

        <ConfirmDialog
          visible={showFinishConfirm}
          title="Workout beenden"
          message="Workout speichern und beenden?"
          confirmText="Speichern"
          cancelText="Abbrechen"
          onConfirm={async () => {
            setShowFinishConfirm(false);
            if (!activeWorkout) return;

            const completedWorkout = {
              ...activeWorkout,
              completed: true as const,
              duration: Date.now() - new Date(activeWorkout.date).getTime(),
            };

            await saveWorkout();

            // Process gamification
            try {
              const existingCompleted = getWorkoutHistory().filter(w => w.completed);
              const allWorkouts = [...existingCompleted, completedWorkout];
              const records: Record<string, number> = {};
              for (const w of allWorkouts) {
                for (const ex of w.exercises) {
                  for (const s of ex.sets) {
                    if (s.completed && s.weight > 0) {
                      if (!records[ex.exerciseId] || s.weight > records[ex.exerciseId]) {
                        records[ex.exerciseId] = s.weight;
                      }
                    }
                  }
                }
              }
              const notifications = await processWorkoutComplete(completedWorkout, allWorkouts, Object.keys(records).length);
              const tone = (coachingTone || 'motivator') as keyof typeof workoutCompleteMessages;
              const message = getRandomMessage(workoutCompleteMessages[tone] || workoutCompleteMessages.motivator);

              if (notifications.length > 0 || message) {
                setCompletionResult({ notifications, message });
                return; // Show completion overlay before navigating back
              }
            } catch (e) {
              // Gamification errors shouldn't block workout save
            }

            endWorkout();
            router.back();
          }}
          onCancel={() => setShowFinishConfirm(false)}
        />

        <ConfirmDialog
          visible={showDiscardConfirm}
          title="Workout verwerfen"
          message="Workout wirklich verwerfen? Alle Daten gehen verloren."
          confirmText="Verwerfen"
          cancelText="Abbrechen"
          destructive
          onConfirm={() => {
            setShowDiscardConfirm(false);
            endWorkout();
            router.back();
          }}
          onCancel={() => setShowDiscardConfirm(false)}
        />

        {/* Workout Completion Overlay */}
        {completionResult && (
          <View style={styles.completionOverlay}>
            <View style={styles.completionCard}>
              <Zap size={36} color={Colors.warning} style={{ marginBottom: Spacing.sm }} />
              <Text style={styles.completionTitle}>Workout abgeschlossen!</Text>
              <Text style={styles.completionMessage}>{completionResult.message}</Text>
              {completionResult.notifications.map((n, i) => (
                <Text key={i} style={styles.completionNotification}>{n}</Text>
              ))}
              <TouchableOpacity
                style={styles.completionButton}
                onPress={() => {
                  setCompletionResult(null);
                  endWorkout();
                  router.back();
                }}
              >
                <Text style={styles.completionButtonText}>Weiter</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutName: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  duration: {
    fontSize: 18,
    color: Colors.accent,
    fontWeight: '700' as const,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  timerToggle: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timerToggleActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  exerciseContainer: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.accent,
    flex: 1,
  },
  notesToggle: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    color: Colors.text,
    fontSize: 14,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 40,
  },
  previousLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
  },
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  setsHeaderText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addSetButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginLeft: Spacing.xs,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    margin: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  addExerciseButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
    marginLeft: Spacing.sm,
  },
  discardButton: {
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  discardButtonText: {
    color: Colors.error,
    fontSize: 14,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
  completionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    zIndex: 100,
  },
  completionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  completionTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.accent,
    marginBottom: Spacing.sm,
  },
  completionMessage: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  completionNotification: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
    fontWeight: '500' as const,
  },
  completionButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  completionButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
