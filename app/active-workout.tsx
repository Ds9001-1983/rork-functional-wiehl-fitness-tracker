import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Save, Timer, MessageSquare } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { useWorkouts } from '@/hooks/use-workouts';
import { exercises } from '@/data/exercises';
import { WorkoutSetRow } from '@/components/WorkoutSetRow';
import { RestTimer } from '@/components/RestTimer';

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const { activeWorkout, updateSet, addSet, removeSet, saveWorkout, endWorkout, getWorkoutHistory, updateExerciseNotes } = useWorkouts();
  const [duration, setDuration] = useState(0);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>({});

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

  const handleFinishWorkout = async () => {
    Alert.alert(
      'Workout beenden',
      'Workout speichern und beenden?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Speichern',
          onPress: async () => {
            await saveWorkout();
            endWorkout();
            router.back();
          },
        },
      ]
    );
  };

  const handleDiscardWorkout = () => {
    Alert.alert(
      'Workout verwerfen',
      'Workout wirklich verwerfen? Alle Daten gehen verloren.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Verwerfen',
          style: 'destructive',
          onPress: () => {
            endWorkout();
            router.back();
          },
        },
      ]
    );
  };

  const handleAddExercise = () => {
    router.push('/exercises');
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
          <RestTimer defaultSeconds={90} />
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
                  <Text style={[styles.setsHeaderText, { flex: 0, width: 30 }]}>Satz</Text>
                  {previousSets && <Text style={[styles.setsHeaderText, { width: 44 }]}>Vorher</Text>}
                  <Text style={styles.setsHeaderText}>Gewicht</Text>
                  <Text style={[styles.setsHeaderText, { flex: 0, width: 24 }]}></Text>
                  <Text style={styles.setsHeaderText}>Wdh</Text>
                  <Text style={[styles.setsHeaderText, { flex: 0, width: 68 }]}></Text>
                </View>

                {exercise.sets.map((set, setIndex) => (
                  <WorkoutSetRow
                    key={set.id}
                    set={set}
                    setNumber={setIndex + 1}
                    onUpdate={(update) => updateSet(exerciseIndex, setIndex, update)}
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
});
