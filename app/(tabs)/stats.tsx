import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { TrendingUp, Award, Target, Activity, Trophy } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { useWorkouts } from '@/hooks/use-workouts';
import { StatsCard } from '@/components/StatsCard';
import { exercises as exerciseDatabase } from '@/data/exercises';

export default function StatsScreen() {
  const { user } = useAuth();
  const { setCurrentUserId, getWorkoutHistory, getPersonalRecords } = useWorkouts();

  useEffect(() => {
    if (user?.id) {
      setCurrentUserId(user.id);
    }
  }, [user?.id, setCurrentUserId]);

  const userWorkouts = getWorkoutHistory();
  const personalRecords = getPersonalRecords();

  const totalVolume = userWorkouts.reduce((total, workout) => {
    return total + workout.exercises.reduce((wTotal, exercise) => {
      return wTotal + exercise.sets.reduce((eTotal, set) => {
        return eTotal + (set.weight * set.reps);
      }, 0);
    }, 0);
  }, 0);

  const totalSets = userWorkouts.reduce((total, workout) => {
    return total + workout.exercises.reduce((wTotal, exercise) => {
      return wTotal + exercise.sets.length;
    }, 0);
  }, 0);

  const avgWorkoutDuration = userWorkouts.length > 0
    ? userWorkouts.reduce((total, w) => total + (w.duration || 0), 0) / userWorkouts.length / 60000
    : 0;

  // Map exercise IDs to German names
  const getExerciseName = (exerciseId: string): string => {
    const exercise = exerciseDatabase.find(e => e.id === exerciseId);
    return exercise?.name || exerciseId;
  };

  // Sort records by weight descending
  const sortedRecords = Object.entries(personalRecords)
    .sort(([, a], [, b]) => b - a);

  const hasRecords = sortedRecords.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Deine Statistiken</Text>
          <Text style={styles.subtitle}>Verfolge deinen Fortschritt</Text>
        </View>

        <View style={styles.statsGrid}>
          <StatsCard
            title="Gesamt Workouts"
            value={userWorkouts.length}
            icon={<Activity size={20} color={Colors.accent} />}
            color={Colors.accent}
          />
          <StatsCard
            title="Gesamt Volumen"
            value={`${(totalVolume / 1000).toFixed(1)}t`}
            icon={<TrendingUp size={20} color={Colors.success} />}
            color={Colors.success}
          />
          <StatsCard
            title="Gesamt Saetze"
            value={totalSets}
            icon={<Target size={20} color={Colors.warning} />}
            color={Colors.warning}
          />
          <StatsCard
            title="Durchschn. Dauer"
            value={`${avgWorkoutDuration.toFixed(0)}min`}
            icon={<Award size={20} color={Colors.error} />}
            color={Colors.error}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitleStandalone}>Woechentlicher Fortschritt</Text>
          <View style={styles.weekChart}>
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day, index) => {
              const dayWorkouts = userWorkouts.filter(w => {
                const workoutDay = new Date(w.date).getDay();
                return workoutDay === (index + 1) % 7;
              });
              const height = Math.min(100, dayWorkouts.length * 30);

              return (
                <View key={`${day}-${index}`} style={styles.dayColumn}>
                  <View style={styles.barContainer}>
                    <View style={[styles.bar, { height: Math.max(height, 2) }]} />
                  </View>
                  <Text style={styles.dayLabel}>{day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Trophy size={20} color={Colors.accent} />
            <Text style={styles.sectionTitle}>Persoenliche Bestleistungen</Text>
          </View>

          {hasRecords ? (
            <View style={styles.recordsList}>
              {sortedRecords.map(([exerciseId, weight], index) => (
                <View
                  key={exerciseId}
                  style={[
                    styles.recordItem,
                    index === sortedRecords.length - 1 && styles.recordItemLast,
                  ]}
                >
                  <View style={styles.recordLeft}>
                    <Text style={styles.recordRank}>#{index + 1}</Text>
                    <Text style={styles.recordName}>{getExerciseName(exerciseId)}</Text>
                  </View>
                  <Text style={styles.recordValue}>{weight} kg</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyRecords}>
              <Trophy size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Noch keine Bestleistungen</Text>
              <Text style={styles.emptySubtext}>
                Schliesse Workouts ab, um deine persoenlichen Rekorde zu tracken!
              </Text>
            </View>
          )}
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  sectionTitleStandalone: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  weekChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barContainer: {
    height: 100,
    justifyContent: 'flex-end',
    marginBottom: Spacing.sm,
  },
  bar: {
    width: 30,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.sm,
  },
  dayLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  recordsList: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  recordItemLast: {
    borderBottomWidth: 0,
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recordRank: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.accent,
    width: 30,
  },
  recordName: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  recordValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.accent,
  },
  emptyRecords: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
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
});
