import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Play, ClipboardList, Dumbbell, Calendar } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { useWorkouts } from '@/hooks/use-workouts';
import { exercises as exerciseDb } from '@/data/exercises';

const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { workoutPlans, activeWorkout, startWorkout, endWorkout } = useWorkouts();
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const plan = workoutPlans.find(p => p.id === id);

  const getExerciseName = (exerciseId: string) => {
    return exerciseDb.find(e => e.id === exerciseId)?.name || exerciseId;
  };

  const getExerciseCategory = (exerciseId: string) => {
    const ex = exerciseDb.find(e => e.id === exerciseId);
    if (!ex) return '';
    const categories: Record<string, string> = {
      chest: 'Brust', back: 'Rücken', legs: 'Beine', shoulders: 'Schultern',
      arms: 'Arme', core: 'Core', cardio: 'Cardio', 'full-body': 'Ganzkörper',
    };
    return categories[ex.category] || ex.category;
  };

  const handleStart = () => {
    if (!plan) return;
    if (activeWorkout) {
      Alert.alert(
        'Aktives Workout',
        'Du hast bereits ein laufendes Workout. Möchtest du es verwerfen und diesen Plan starten?',
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Fortsetzen',
            onPress: () => router.push('/active-workout'),
          },
          {
            text: 'Neues Workout',
            style: 'destructive',
            onPress: () => {
              endWorkout();
              startWorkout(plan.id);
              router.push('/active-workout');
            },
          },
        ],
      );
      return;
    }
    startWorkout(plan.id);
    router.push('/active-workout');
  };

  if (!plan) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Trainingsplan' }} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Plan nicht gefunden</Text>
        </View>
      </View>
    );
  }

  const scheduleDays = plan.schedule?.map(s => dayNames[s.dayOfWeek]).join(', ');

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: plan.name }} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Plan Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <ClipboardList size={28} color={Colors.accent} />
          </View>
          <Text style={styles.planName}>{plan.name}</Text>
          {plan.description ? (
            <Text style={styles.planDescription}>{plan.description}</Text>
          ) : null}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Dumbbell size={14} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{plan.exercises.length} Übungen</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaText}>
                {plan.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)} Sätze
              </Text>
            </View>
            {scheduleDays ? (
              <View style={styles.metaItem}>
                <Calendar size={14} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{scheduleDays}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Exercises List */}
        <View style={styles.exercisesSection}>
          <Text style={styles.sectionTitle}>Übungen</Text>
          {plan.exercises.map((exercise, index) => (
            <View key={exercise.id || index} style={styles.exerciseCard}>
              <View style={styles.exerciseNumber}>
                <Text style={styles.exerciseNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{getExerciseName(exercise.exerciseId)}</Text>
                <Text style={styles.exerciseCategory}>{getExerciseCategory(exercise.exerciseId)}</Text>
                <View style={styles.setsInfo}>
                  {exercise.sets.map((set, setIdx) => (
                    <View key={set.id || setIdx} style={styles.setChip}>
                      <Text style={styles.setChipText}>
                        {set.weight > 0 ? `${set.weight}kg × ${set.reps}` : `${set.reps} Wdh.`}
                      </Text>
                    </View>
                  ))}
                </View>
                {exercise.notes ? (
                  <Text style={styles.exerciseNotes}>{exercise.notes}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Start Button */}
      <View style={styles.startButtonContainer}>
        <TouchableOpacity style={styles.startButton} onPress={handleStart}>
          <Play size={22} color="#FFFFFF" />
          <Text style={styles.startButtonText}>Workout starten</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (Colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: Spacing.lg,
    alignItems: 'center' as const,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent + '20',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: Spacing.md,
  },
  planName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    marginBottom: Spacing.xs,
  },
  planDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'center' as const,
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  exercisesSection: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  exerciseCard: {
    flexDirection: 'row' as const,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exerciseNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent + '20',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: Spacing.md,
    marginTop: 2,
  },
  exerciseNumberText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.accent,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  exerciseCategory: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  setsInfo: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  setChip: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  setChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  exerciseNotes: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic' as const,
    marginTop: Spacing.xs,
  },
  startButtonContainer: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  startButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.accent,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
});
