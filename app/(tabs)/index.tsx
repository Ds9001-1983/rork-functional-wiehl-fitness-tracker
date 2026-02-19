import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Play, Plus, Clock, TrendingUp, Dumbbell, ChevronRight, Repeat, Target } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { useWorkouts } from '@/hooks/use-workouts';
import { StatsCard } from '@/components/StatsCard';
import { exercises as exerciseDb } from '@/data/exercises';

export default function WorkoutScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const {
    activeWorkout,
    routines,
    startWorkout,
    startWorkoutFromRoutine,
    setCurrentUserId,
    getWorkoutHistory,
  } = useWorkouts();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (user?.id) {
      setCurrentUserId(user.id);
    }
  }, [user?.id, setCurrentUserId]);

  const handleStartWorkout = () => {
    if (activeWorkout) {
      router.push('/active-workout');
    } else {
      startWorkout();
      router.push('/active-workout');
    }
  };

  const handleStartFromRoutine = (routine: any) => {
    startWorkoutFromRoutine(routine);
    router.push('/active-workout');
  };

  const userWorkouts = getWorkoutHistory();

  const todayWorkouts = userWorkouts.filter(w => {
    const today = new Date().toDateString();
    return new Date(w.date).toDateString() === today;
  });

  const totalVolume = userWorkouts.reduce((total, workout) => {
    return total + workout.exercises.reduce((wTotal, exercise) => {
      return wTotal + exercise.sets.reduce((eTotal, set) => {
        return eTotal + (set.weight * set.reps);
      }, 0);
    }, 0);
  }, 0);

  const getExerciseName = (exerciseId: string) => {
    return exerciseDb.find(e => e.id === exerciseId)?.name || exerciseId;
  };

  const formatDuration = (ms: number) => {
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins} Min.`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Daten werden geladen...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Hallo, {user?.name || 'Athlet'}!
          </Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('de-DE', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
        </View>

        {userWorkouts.length === 0 && routines.length === 0 && (
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeHeader}>
              <Target size={20} color={Colors.accent} />
              <Text style={styles.welcomeTitle}>Willkommen bei Functional Wiehl!</Text>
            </View>
            <Text style={styles.welcomeSubtitle}>So startest du in 3 Schritten:</Text>
            {[
              { num: '1', text: 'Workout starten - Tippe auf den Button unten' },
              { num: '2', text: 'Uebungen hinzufuegen - Waehle aus 80+ Uebungen' },
              { num: '3', text: 'Fortschritt tracken - Sieh deine Statistiken im Stats-Tab' },
            ].map(step => (
              <View key={step.num} style={styles.welcomeStep}>
                <View style={styles.welcomeStepNumber}>
                  <Text style={styles.welcomeStepNumberText}>{step.num}</Text>
                </View>
                <Text style={styles.welcomeStepText}>{step.text}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.statsRow}>
          <StatsCard
            title="Workouts Heute"
            value={todayWorkouts.length}
            icon={<Clock size={20} color={Colors.accent} />}
            color={Colors.accent}
          />
          <StatsCard
            title="Gesamt Volumen"
            value={`${(totalVolume / 1000).toFixed(1)}t`}
            icon={<TrendingUp size={20} color={Colors.success} />}
            color={Colors.success}
          />
        </View>

        {/* Start Workout Buttons */}
        {activeWorkout ? (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleStartWorkout}
          >
            <View style={styles.continueContent}>
              <Play size={24} color={Colors.text} />
              <View style={styles.continueText}>
                <Text style={styles.continueTitle}>Workout fortsetzen</Text>
                <Text style={styles.continueSubtitle}>
                  {activeWorkout.exercises.length} Uebungen
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartWorkout}
          >
            <Plus size={24} color={Colors.text} />
            <Text style={styles.startButtonText}>Leeres Workout starten</Text>
          </TouchableOpacity>
        )}

        {/* Routines Section */}
        <View style={styles.routinesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Meine Routinen</Text>
            <TouchableOpacity onPress={() => router.push('/routines' as never)}>
              <Text style={styles.seeAllText}>Alle</Text>
            </TouchableOpacity>
          </View>

          {routines.length > 0 ? (
            routines.slice(0, 3).map((routine) => (
              <TouchableOpacity
                key={routine.id}
                style={styles.routineCard}
                onPress={() => handleStartFromRoutine(routine)}
              >
                <View style={styles.routineIcon}>
                  <Repeat size={20} color={Colors.accent} />
                </View>
                <View style={styles.routineInfo}>
                  <Text style={styles.routineName}>{routine.name}</Text>
                  <Text style={styles.routineDetails}>
                    {routine.exercises.length} Uebungen
                    {routine.timesUsed > 0 && ` - ${routine.timesUsed}x verwendet`}
                  </Text>
                </View>
                <ChevronRight size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            ))
          ) : (
            <TouchableOpacity
              style={styles.createRoutineButton}
              onPress={() => router.push('/routines' as never)}
            >
              <Plus size={18} color={Colors.accent} />
              <Text style={styles.createRoutineText}>Routine erstellen</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Recent Workouts */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Letzte Workouts</Text>
            {userWorkouts.length > 3 && (
              <TouchableOpacity onPress={() => router.push('/(tabs)/calendar' as never)}>
                <Text style={styles.seeAllText}>Alle</Text>
              </TouchableOpacity>
            )}
          </View>

          {userWorkouts.length === 0 ? (
            <View style={styles.emptyState}>
              <Dumbbell size={40} color={Colors.textMuted} />
              <Text style={styles.emptyStateText}>Noch keine Workouts</Text>
              <Text style={styles.emptyStateSubtext}>Starte dein erstes Workout!</Text>
            </View>
          ) : (
            userWorkouts.slice(-5).reverse().map((workout) => (
              <TouchableOpacity
                key={workout.id}
                style={styles.recentWorkout}
                onPress={() => router.push(`/workout-detail/${workout.id}` as never)}
              >
                <View style={styles.recentWorkoutLeft}>
                  <Text style={styles.recentWorkoutName}>{workout.name}</Text>
                  <Text style={styles.recentWorkoutDate}>
                    {new Date(workout.date).toLocaleDateString('de-DE', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                    {workout.duration && ` - ${formatDuration(workout.duration)}`}
                  </Text>
                  <Text style={styles.recentWorkoutExercises} numberOfLines={1}>
                    {workout.exercises.map(e => getExerciseName(e.exerciseId)).join(', ')}
                  </Text>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  header: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  startButtonText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600' as const,
    marginLeft: Spacing.sm,
  },
  continueButton: {
    backgroundColor: Colors.success,
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  continueContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  continueText: {
    marginLeft: Spacing.md,
  },
  continueTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600' as const,
  },
  continueSubtitle: {
    color: Colors.text,
    fontSize: 14,
    opacity: 0.8,
  },
  routinesSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '500' as const,
  },
  routineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  routineIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  routineInfo: {
    flex: 1,
  },
  routineName: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  routineDetails: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  createRoutineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  createRoutineText: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '500' as const,
    marginLeft: Spacing.sm,
  },
  recentSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  recentWorkout: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recentWorkoutLeft: {
    flex: 1,
  },
  recentWorkoutName: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  recentWorkoutDate: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  recentWorkoutExercises: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  welcomeCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  welcomeTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  welcomeStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  welcomeStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeStepNumberText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.background,
  },
  welcomeStepText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
});
