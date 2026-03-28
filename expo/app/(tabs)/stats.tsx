import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { TrendingUp, Award, Target, Activity } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { useWorkouts } from '@/hooks/use-workouts';
import { StatsCard } from '@/components/StatsCard';

export default function StatsScreen() {
  const { user } = useAuth();
  const { setCurrentUserId, getWorkoutHistory } = useWorkouts();

  useEffect(() => {
    if (user?.id) {
      setCurrentUserId(user.id);
    }
  }, [user?.id, setCurrentUserId]);

  const userWorkouts = getWorkoutHistory();
  
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
            title="Gesamt Sätze"
            value={totalSets}
            icon={<Target size={20} color={Colors.warning} />}
            color={Colors.warning}
          />
          <StatsCard
            title="Ø Dauer"
            value={`${avgWorkoutDuration.toFixed(0)}min`}
            icon={<Award size={20} color={Colors.error} />}
            color={Colors.error}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wöchentlicher Fortschritt</Text>
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
                    <View style={[styles.bar, { height }]} />
                  </View>
                  <Text style={styles.dayLabel}>{day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Persönliche Bestleistungen</Text>
          <View style={styles.recordsList}>
            <View style={styles.recordItem}>
              <Text style={styles.recordName}>Bankdrücken</Text>
              <Text style={styles.recordValue}>100 kg</Text>
            </View>
            <View style={styles.recordItem}>
              <Text style={styles.recordName}>Kniebeuge</Text>
              <Text style={styles.recordValue}>120 kg</Text>
            </View>
            <View style={styles.recordItem}>
              <Text style={styles.recordName}>Kreuzheben</Text>
              <Text style={styles.recordValue}>140 kg</Text>
            </View>
          </View>
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
  sectionTitle: {
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
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  recordName: {
    fontSize: 16,
    color: Colors.text,
  },
  recordValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.accent,
  },
});