import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Save, Timer } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { useWorkouts } from '@/hooks/use-workouts';
import { exercises } from '@/data/exercises';
import { WorkoutSetRow } from '@/components/WorkoutSetRow';

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const { activeWorkout, updateSet, addSet, removeSet, saveWorkout, endWorkout } = useWorkouts();
  const [, forceUpdate] = useState(0);

  // Timer aus Workout-Startzeit ableiten - überlebt App-Backgrounding/Crash
  const duration = activeWorkout
    ? Math.floor((Date.now() - new Date(activeWorkout.date).getTime()) / 1000)
    : 0;

  React.useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Pulsierender Punkt
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinishWorkout = async () => {
    Alert.alert(
      'Workout beenden',
      'Möchtest du das Workout speichern und beenden?',
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

  const handleAddExercise = () => {
    router.push('/exercises');
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
              <Save size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.workoutName}>{activeWorkout.name}</Text>
          <View style={styles.timerContainer}>
            <Animated.View style={[styles.timerDot, { opacity: pulseAnim }]} />
            <Timer size={18} color={Colors.accent} />
            <Text style={styles.duration}>{formatDuration(duration)}</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {activeWorkout.exercises.map((exercise, exerciseIndex) => {
            const exerciseData = exercises.find(e => e.id === exercise.exerciseId);
            if (!exerciseData) return null;

            return (
              <View key={exercise.id} style={styles.exerciseContainer}>
                <Text style={styles.exerciseName}>{exerciseData.name}</Text>
                
                <View style={styles.setsHeader}>
                  <Text style={styles.setsHeaderText}>Satz</Text>
                  <Text style={styles.setsHeaderText}>Gewicht</Text>
                  <Text style={styles.setsHeaderText}>×</Text>
                  <Text style={styles.setsHeaderText}>Wdh</Text>
                  <Text style={styles.setsHeaderText}>Aktionen</Text>
                </View>

                {exercise.sets.map((set, setIndex) => (
                  <WorkoutSetRow
                    key={set.id}
                    set={set}
                    setNumber={setIndex + 1}
                    onUpdate={(update) => updateSet(exerciseIndex, setIndex, update)}
                    onRemove={() => removeSet(exerciseIndex, setIndex)}
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
          })}

          <TouchableOpacity style={styles.addExerciseButton} onPress={handleAddExercise}>
            <Plus size={20} color={Colors.text} />
            <Text style={styles.addExerciseButtonText}>Übung hinzufügen</Text>
          </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workoutName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.accent,
    gap: 6,
  },
  timerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
  },
  duration: {
    fontSize: 18,
    color: Colors.accent,
    fontWeight: '700' as const,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  exerciseContainer: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: Spacing.md,
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
  emptyText: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
});