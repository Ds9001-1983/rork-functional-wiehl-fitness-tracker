import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Play, Plus, Clock, TrendingUp } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { useWorkouts } from '@/hooks/use-workouts';
import { StatsCard } from '@/components/StatsCard';

export default function WorkoutScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { activeWorkout, workouts, startWorkout, setCurrentUserId, getWorkoutHistory } = useWorkouts();

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

  const handleQuickStart = () => {
    startWorkout();
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

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Hallo, {user?.name || 'Athlet'}! 💪
          </Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('de-DE', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
        </View>

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
                  {activeWorkout.exercises.length} Übungen
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleQuickStart}
          >
            <Plus size={24} color={Colors.text} />
            <Text style={styles.startButtonText}>Neues Workout starten</Text>
          </TouchableOpacity>
        )}

        {user?.role === 'trainer' && (
          <View style={styles.trainerSection}>
            <Text style={styles.sectionTitle}>Trainer Bereich</Text>
            <TouchableOpacity
              testID="open-trainer-center"
              style={styles.trainerButton}
              onPress={() => router.push('/trainer' as never)}
            >
              <Text style={styles.trainerButtonText}>Trainer Center</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Letzte Workouts</Text>
          {userWorkouts.slice(-3).reverse().map((workout) => (
            <TouchableOpacity
              key={workout.id}
              style={styles.recentWorkout}
              onPress={() => Alert.alert('Workout Details', `${workout.name}\n${workout.exercises.length} Übungen`)}
            >
              <View>
                <Text style={styles.recentWorkoutName}>{workout.name}</Text>
                <Text style={styles.recentWorkoutDate}>
                  {new Date(workout.date).toLocaleDateString('de-DE')}
                </Text>
              </View>
              <Text style={styles.recentWorkoutExercises}>
                {workout.exercises.length} Übungen
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  trainerSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  trainerButton: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  trainerButtonText: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: '500' as const,
    textAlign: 'center',
  },
  recentSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  recentWorkout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recentWorkoutName: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  recentWorkoutDate: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  recentWorkoutExercises: {
    fontSize: 14,
    color: Colors.textMuted,
  },
});