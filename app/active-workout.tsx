import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import { Plus, Save, Timer, MessageSquare, Zap, Smile, Dumbbell, Calculator } from 'lucide-react-native';
import { ExerciseGroup } from '@/components/ExerciseGroup';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { useWorkouts } from '@/hooks/use-workouts';
import { useGamification } from '@/hooks/use-gamification';
import { exercises } from '@/data/exercises';
import { WorkoutSetRow } from '@/components/WorkoutSetRow';
import { RestTimer } from '@/components/RestTimer';
import ConfirmDialog from '@/components/ConfirmDialog';
import StatusBanner from '@/components/StatusBanner';
import { getRandomMessage, workoutCompleteMessages } from '@/data/coaching-messages';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const { activeWorkout, updateSet, addSet, removeSet, saveWorkout, endWorkout, getWorkoutHistory, updateExerciseNotes } = useWorkouts();
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
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
  const [completionResult, setCompletionResult] = useState<{ notifications: string[]; message: string; stats: { totalSets: number; totalVolume: number; exerciseCount: number; duration: number } } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [mood, setMood] = useState<'great' | 'good' | 'okay' | 'tired' | 'bad' | null>(null);
  const [showMoodPicker, setShowMoodPicker] = useState(false);

  const MOOD_OPTIONS: { key: 'great' | 'good' | 'okay' | 'tired' | 'bad'; emoji: string; label: string }[] = [
    { key: 'great', emoji: '💪', label: 'Super' },
    { key: 'good', emoji: '😊', label: 'Gut' },
    { key: 'okay', emoji: '😐', label: 'Okay' },
    { key: 'tired', emoji: '😴', label: 'Müde' },
    { key: 'bad', emoji: '😩', label: 'Schlecht' },
  ];

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
        return prevExercise.sets.map(s => ({ weight: s.weight, reps: s.reps, completed: s.completed }));
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
        <View style={styles.emptyContainer}>
          <Dumbbell size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Kein aktives Workout</Text>
          <Text style={styles.emptySubtext}>Starte ein neues Workout auf der Startseite.</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.emptyButtonText}>Zur Startseite</Text>
          </TouchableOpacity>
        </View>
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
                style={styles.timerToggle}
                onPress={() => router.push('/plate-calculator' as any)}
              >
                <Calculator size={20} color={Colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.moodToggle, mood && styles.moodToggleActive]}
                onPress={() => setShowMoodPicker(!showMoodPicker)}
              >
                {mood ? (
                  <Text style={styles.moodEmoji}>{MOOD_OPTIONS.find(m => m.key === mood)?.emoji}</Text>
                ) : (
                  <Smile size={20} color={Colors.textMuted} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timerToggle, showRestTimer && styles.timerToggleActive]}
                onPress={() => setShowRestTimer(!showRestTimer)}
              >
                <Timer size={20} color={showRestTimer ? Colors.text : Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {showMoodPicker && (
          <View style={styles.moodPickerRow}>
            <Text style={styles.moodPickerLabel}>Wie fühlst du dich?</Text>
            <View style={styles.moodOptions}>
              {MOOD_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.moodOption, mood === option.key && styles.moodOptionActive]}
                  onPress={() => { setMood(option.key); setShowMoodPicker(false); }}
                >
                  <Text style={styles.moodOptionEmoji}>{option.emoji}</Text>
                  <Text style={[styles.moodOptionLabel, mood === option.key && styles.moodOptionLabelActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {statusMessage && (
          <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm }}>
            <StatusBanner type={statusMessage.type} text={statusMessage.text} onDismiss={() => setStatusMessage(null)} />
          </View>
        )}

        {showRestTimer && (
          <RestTimer key={restTimerKey} defaultSeconds={restTimerDefault} autoStart={restTimerKey > 0} onDefaultChange={handleRestTimerDefaultChange} />
        )}

        <ScrollView showsVerticalScrollIndicator={false}>
          {activeWorkout.exercises.map((exercise, exerciseIndex) => {
            const exerciseData = exercises.find(e => e.id === exercise.exerciseId);
            if (!exerciseData) return null;

            const previousSets = getPreviousPerformance(exercise.exerciseId);
            const notesExpanded = expandedNotes[exerciseIndex];

            // Check if this exercise starts a new group
            const isGroupStart = exercise.groupId && (
              exerciseIndex === 0 || activeWorkout.exercises[exerciseIndex - 1]?.groupId !== exercise.groupId
            );
            const isGroupEnd = exercise.groupId && (
              exerciseIndex === activeWorkout.exercises.length - 1 || activeWorkout.exercises[exerciseIndex + 1]?.groupId !== exercise.groupId
            );

            const content = (
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
                    placeholder="Notizen zur Übung..."
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
                  {previousSets && <Text style={[styles.setsHeaderText, { width: 52 }]}>Vorher</Text>}
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
                    previousCompleted={previousSets?.[setIndex]?.completed}
                  />
                ))}

                <TouchableOpacity
                  style={styles.addSetButton}
                  onPress={() => addSet(exerciseIndex)}
                >
                  <Plus size={16} color={Colors.text} />
                  <Text style={styles.addSetButtonText}>Satz hinzufügen</Text>
                </TouchableOpacity>
              </View>
            );

            if (exercise.groupId && exercise.groupType && isGroupStart) {
              // Collect all exercises in this group
              const groupExercises: React.ReactNode[] = [content];
              let nextIdx = exerciseIndex + 1;
              while (nextIdx < activeWorkout.exercises.length && activeWorkout.exercises[nextIdx]?.groupId === exercise.groupId) {
                nextIdx++;
              }
              return (
                <ExerciseGroup key={`group-${exercise.groupId}`} groupType={exercise.groupType}>
                  {content}
                </ExerciseGroup>
              );
            }

            // Skip rendering if part of a group but not the start
            if (exercise.groupId && exerciseIndex > 0 && activeWorkout.exercises[exerciseIndex - 1]?.groupId === exercise.groupId) {
              return content; // Still render, the group wrapper is on the first element
            }

            return content;
          })}

          <TouchableOpacity style={styles.addExerciseButton} onPress={handleAddExercise}>
            <Plus size={20} color={Colors.text} />
            <Text style={styles.addExerciseButtonText}>Übung hinzufügen</Text>
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

            const workoutDuration = Date.now() - new Date(activeWorkout.date).getTime();
            const completedWorkout = {
              ...activeWorkout,
              completed: true as const,
              duration: workoutDuration,
              mood: mood || undefined,
            };

            await saveWorkout();

            // Compute workout stats
            let totalSets = 0;
            let totalVolume = 0;
            for (const ex of activeWorkout.exercises) {
              for (const s of ex.sets) {
                if (s.completed) {
                  totalSets++;
                  totalVolume += s.weight * s.reps;
                }
              }
            }
            const stats = {
              totalSets,
              totalVolume: Math.round(totalVolume),
              exerciseCount: activeWorkout.exercises.length,
              duration: Math.round(workoutDuration / 1000),
            };

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
                setCompletionResult({ notifications, message, stats });
                return; // Show completion overlay before navigating back
              }
            } catch (e) {
              // Gamification errors shouldn't block workout save
              setStatusMessage({ type: 'error', text: 'Gamification-Daten konnten nicht verarbeitet werden.' });
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
            router.replace('/(tabs)');
          }}
          onCancel={() => setShowDiscardConfirm(false)}
        />

        {/* Workout Completion Overlay */}
        {completionResult && (
          <View style={styles.completionOverlay}>
            <View style={styles.completionCard}>
              <Zap size={36} color={Colors.warning} style={{ marginBottom: Spacing.sm }} />
              <Text style={styles.completionTitle}>Workout abgeschlossen!</Text>

              {/* Workout Stats */}
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatDuration(completionResult.stats.duration)}</Text>
                  <Text style={styles.statLabel}>Dauer</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{completionResult.stats.exerciseCount}</Text>
                  <Text style={styles.statLabel}>Übungen</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{completionResult.stats.totalSets}</Text>
                  <Text style={styles.statLabel}>Sätze</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {completionResult.stats.totalVolume >= 1000
                      ? `${(completionResult.stats.totalVolume / 1000).toFixed(1)}t`
                      : `${completionResult.stats.totalVolume}kg`}
                  </Text>
                  <Text style={styles.statLabel}>Volumen</Text>
                </View>
              </View>

              {mood && (
                <Text style={styles.moodSummary}>
                  Stimmung: {MOOD_OPTIONS.find(m => m.key === mood)?.emoji} {MOOD_OPTIONS.find(m => m.key === mood)?.label}
                </Text>
              )}

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

const createStyles = (Colors: any) => StyleSheet.create({
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  emptyButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
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
  moodToggle: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  moodToggleActive: {
    backgroundColor: Colors.accent + '30',
    borderColor: Colors.accent,
  },
  moodEmoji: {
    fontSize: 20,
  },
  moodPickerRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  moodPickerLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  moodOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  moodOption: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  moodOptionActive: {
    backgroundColor: Colors.accent + '20',
    borderColor: Colors.accent,
  },
  moodOptionEmoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  moodOptionLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  moodOptionLabelActive: {
    color: Colors.accent,
    fontWeight: '600' as const,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  moodSummary: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
});
