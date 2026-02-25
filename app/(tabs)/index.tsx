import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Play, Plus, Clock, TrendingUp, Dumbbell, ChevronRight, Repeat, Target, Flame, Calendar, ClipboardList, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { useWorkouts } from '@/hooks/use-workouts';
import { useGamification } from '@/hooks/use-gamification';
import { StatsCard } from '@/components/StatsCard';
import { InstallBanner } from '@/components/InstallBanner';
import { exercises as exerciseDb } from '@/data/exercises';

export default function WorkoutScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const {
    activeWorkout,
    routines,
    workoutPlans,
    startWorkout,
    startWorkoutFromRoutine,
    setCurrentUserId,
    getWorkoutHistory,
    getMuscleGroupVolume,
  } = useWorkouts();
  const { gamification } = useGamification();
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('welcomeDismissed').then(val => {
      if (val === 'true') setShowWelcome(false);
    });
  }, []);

  const dismissWelcome = () => {
    setShowWelcome(false);
    AsyncStorage.setItem('welcomeDismissed', 'true');
  };

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

  // Weekly progress: how many days this week had workouts
  const weekProgress = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
    startOfWeek.setHours(0, 0, 0, 0);

    const daysWithWorkouts = new Set<string>();
    for (const w of userWorkouts) {
      if (w.completed && new Date(w.date) >= startOfWeek) {
        daysWithWorkouts.add(new Date(w.date).toDateString());
      }
    }
    return daysWithWorkouts.size;
  }, [userWorkouts]);

  // Assigned plans for this user (plan instances or direct assignments)
  const myPlans = useMemo(() => {
    if (!user?.id) return [];
    return workoutPlans.filter(p =>
      p.assignedTo?.includes(user.id) || p.assignedUserId === user.id
    );
  }, [workoutPlans, user?.id]);

  // Today's scheduled plans based on dayOfWeek
  const todaysPlans = useMemo(() => {
    const todayDow = new Date().getDay(); // 0=Sun, 1=Mon...
    return myPlans.filter(p =>
      p.schedule?.some(s => s.dayOfWeek === todayDow)
    );
  }, [myPlans]);

  // Muscle group volume from last 7 days
  const muscleVolume = getMuscleGroupVolume();
  const topMuscleGroups = useMemo(() => {
    return Object.entries(muscleVolume)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6);
  }, [muscleVolume]);

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
        <InstallBanner />
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

        {userWorkouts.length === 0 && routines.length === 0 && showWelcome && (
          <View style={styles.welcomeCard}>
            <TouchableOpacity
              style={styles.welcomeDismiss}
              onPress={dismissWelcome}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color={Colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.welcomeHeader}>
              <Target size={20} color={Colors.accent} />
              <Text style={styles.welcomeTitle}>Willkommen bei Functional Wiehl!</Text>
            </View>
            <Text style={styles.welcomeSubtitle}>So startest du in 3 Schritten:</Text>
            {[
              { num: '1', text: 'Workout starten - Tippe auf den Button unten' },
              { num: '2', text: 'Übungen hinzufügen - Wähle aus 80+ Übungen' },
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
            title="Heute"
            value={todayWorkouts.length}
            subtitle={todayWorkouts.length === 1 ? 'Workout' : 'Workouts'}
            icon={<Clock size={20} color={Colors.accent} />}
            color={Colors.accent}
          />
          <StatsCard
            title="Streak"
            value={gamification.currentStreak}
            subtitle={gamification.currentStreak === 1 ? 'Tag' : 'Tage'}
            icon={<Flame size={20} color={Colors.warning} />}
            color={Colors.warning}
          />
        </View>
        <View style={styles.statsRow}>
          <StatsCard
            title="Diese Woche"
            value={weekProgress}
            subtitle={`Tag${weekProgress !== 1 ? 'e' : ''} trainiert`}
            icon={<Calendar size={20} color={Colors.success} />}
            color={Colors.success}
          />
          <StatsCard
            title="Volumen"
            value={`${(totalVolume / 1000).toFixed(1)}t`}
            subtitle="Gesamt"
            icon={<TrendingUp size={20} color={Colors.accent} />}
            color={Colors.accent}
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
                  {activeWorkout.exercises.length} Übungen
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

        {/* Meine Trainingspläne - IMMER sichtbar wenn Pläne vorhanden */}
        {myPlans.length > 0 && (
          <View style={styles.myPlansSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Meine Trainingspläne</Text>
            </View>
            {myPlans.map(plan => {
              const isToday = todaysPlans.some(tp => tp.id === plan.id);
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[styles.planCard, isToday && styles.planCardToday]}
                  onPress={() => router.push(`/plan-detail/${plan.id}` as any)}
                >
                  <View style={[styles.planCardIcon, isToday && styles.planCardIconToday]}>
                    <ClipboardList size={20} color={Colors.accent} />
                  </View>
                  <View style={styles.planCardInfo}>
                    <View style={styles.planCardNameRow}>
                      <Text style={styles.planCardName}>{plan.name}</Text>
                      {isToday && (
                        <View style={styles.todayBadge}>
                          <Text style={styles.todayBadgeText}>Heute</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.planCardDetails}>
                      {plan.exercises.length} Übungen · {plan.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)} Sätze
                    </Text>
                  </View>
                  <ChevronRight size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Muscle Group Recovery */}
        {topMuscleGroups.length > 0 && (
          <View style={styles.muscleSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Muskelgruppen (7 Tage)</Text>
            </View>
            <View style={styles.muscleGrid}>
              {topMuscleGroups.map(([group, sets]) => {
                const maxSets = topMuscleGroups[0]?.[1] || 1;
                const fillPercent = Math.min(100, Math.round((sets / maxSets) * 100));
                return (
                  <View key={group} style={styles.muscleItem}>
                    <View style={styles.muscleBarContainer}>
                      <View style={[styles.muscleBar, { width: `${fillPercent}%` }]} />
                    </View>
                    <Text style={styles.muscleLabel}>{group}</Text>
                    <Text style={styles.muscleSets}>{sets}</Text>
                  </View>
                );
              })}
            </View>
          </View>
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
                    {routine.exercises.length} Übungen
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

const createStyles = (Colors: any) => StyleSheet.create({
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
  myPlansSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  planCardToday: {
    backgroundColor: Colors.accent + '12',
    borderColor: Colors.accent + '40',
  },
  planCardIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  planCardIconToday: {
    backgroundColor: Colors.accent + '25',
  },
  planCardInfo: {
    flex: 1,
  },
  planCardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 2,
  },
  planCardName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  planCardDetails: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  todayBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  todayBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  muscleSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  muscleGrid: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  muscleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  muscleBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 4,
    marginRight: Spacing.sm,
    overflow: 'hidden',
  },
  muscleBar: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 4,
  },
  muscleLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    width: 80,
    textAlign: 'right',
    marginRight: Spacing.xs,
    textTransform: 'capitalize',
  },
  muscleSets: {
    fontSize: 12,
    color: Colors.textMuted,
    width: 24,
    textAlign: 'right',
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
    position: 'relative' as const,
  },
  welcomeDismiss: {
    position: 'absolute' as const,
    top: Spacing.sm,
    right: Spacing.sm,
    zIndex: 1,
    padding: 4,
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
