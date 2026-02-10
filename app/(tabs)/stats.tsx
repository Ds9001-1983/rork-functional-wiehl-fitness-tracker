import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { TrendingUp, Award, Target, Activity, Trophy, BarChart3 } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { useWorkouts } from '@/hooks/use-workouts';
import { StatsCard } from '@/components/StatsCard';
import { exercises as exerciseDatabase } from '@/data/exercises';

type StatsTab = 'overview' | 'records' | 'muscles';

export default function StatsScreen() {
  const { user } = useAuth();
  const { setCurrentUserId, getWorkoutHistory, getPersonalRecords, getDetailedRecords, getMuscleGroupVolume } = useWorkouts();
  const [activeTab, setActiveTab] = useState<StatsTab>('overview');

  useEffect(() => {
    if (user?.id) {
      setCurrentUserId(user.id);
    }
  }, [user?.id, setCurrentUserId]);

  const userWorkouts = getWorkoutHistory();
  const personalRecords = getPersonalRecords();
  const detailedRecords = getDetailedRecords();
  const muscleVolume = getMuscleGroupVolume();

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

  const getExerciseName = (exerciseId: string): string => {
    const exercise = exerciseDatabase.find(e => e.id === exerciseId);
    return exercise?.name || exerciseId;
  };

  const calculateStreak = () => {
    const completedDates = userWorkouts
      .filter(w => w.completed)
      .map(w => new Date(w.date).toDateString())
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let streak = 0;
    const today = new Date();

    for (let i = 0; i < completedDates.length; i++) {
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      if (completedDates[i] === expectedDate.toDateString()) {
        streak++;
      } else if (i === 0) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (completedDates[0] === yesterday.toDateString()) {
          streak++;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    return streak;
  };

  const sortedRecords = Object.entries(personalRecords)
    .sort(([, a], [, b]) => b - a);

  const sortedDetailedRecords = detailedRecords
    .sort((a, b) => b.estimated1RM - a.estimated1RM);

  const sortedMuscleVolume = Object.entries(muscleVolume)
    .sort(([, a], [, b]) => b - a);

  const maxMuscleVolume = sortedMuscleVolume.length > 0 ? sortedMuscleVolume[0][1] : 1;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Deine Statistiken</Text>
          <Text style={styles.subtitle}>Verfolge deinen Fortschritt</Text>
        </View>

        <View style={styles.tabBar}>
          {([
            { key: 'overview', label: 'Uebersicht' },
            { key: 'records', label: 'Rekorde' },
            { key: 'muscles', label: 'Muskeln' },
          ] as const).map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'overview' && (
          <>
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
                title="Aktuelle Serie"
                value={`${calculateStreak()} Tage`}
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
                      {dayWorkouts.length > 0 && (
                        <Text style={styles.dayCount}>{dayWorkouts.length}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Trophy size={20} color={Colors.accent} />
                <Text style={styles.sectionTitle}>Top Bestleistungen</Text>
              </View>
              {sortedRecords.length > 0 ? (
                <View style={styles.recordsList}>
                  {sortedRecords.slice(0, 5).map(([exerciseId, weight], index) => (
                    <View
                      key={exerciseId}
                      style={[styles.recordItem, index === Math.min(4, sortedRecords.length - 1) && styles.recordItemLast]}
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
                    Schliesse Workouts ab, um deine Rekorde zu tracken!
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {activeTab === 'records' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Trophy size={20} color={Colors.accent} />
              <Text style={styles.sectionTitle}>Alle Rekorde</Text>
            </View>
            <Text style={styles.recordsSubtext}>Geschaetztes 1RM (Epley-Formel)</Text>

            {sortedDetailedRecords.length > 0 ? (
              <View style={styles.recordsList}>
                {sortedDetailedRecords.map((record, index) => (
                  <View
                    key={record.exerciseId}
                    style={[styles.detailedRecord, index === sortedDetailedRecords.length - 1 && styles.recordItemLast]}
                  >
                    <View style={styles.detailedRecordLeft}>
                      <Text style={styles.recordRank}>#{index + 1}</Text>
                      <View style={styles.detailedRecordInfo}>
                        <Text style={styles.recordName}>{getExerciseName(record.exerciseId)}</Text>
                        <Text style={styles.recordDetail}>
                          {record.weight} kg x {record.reps} Wdh - {new Date(record.date).toLocaleDateString('de-DE')}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.detailedRecordRight}>
                      <Text style={styles.estimated1RM}>{record.estimated1RM}</Text>
                      <Text style={styles.estimated1RMLabel}>1RM kg</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyRecords}>
                <Trophy size={40} color={Colors.textMuted} />
                <Text style={styles.emptyText}>Noch keine Daten</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'muscles' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <BarChart3 size={20} color={Colors.accent} />
              <Text style={styles.sectionTitle}>Muskelgruppen (7 Tage)</Text>
            </View>

            {sortedMuscleVolume.length > 0 ? (
              <View style={styles.muscleList}>
                {sortedMuscleVolume.map(([muscle, sets]) => (
                  <View key={muscle} style={styles.muscleRow}>
                    <Text style={styles.muscleName}>{muscle}</Text>
                    <View style={styles.muscleBarContainer}>
                      <View
                        style={[
                          styles.muscleBar,
                          { width: `${(sets / maxMuscleVolume) * 100}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.muscleSets}>{sets} Saetze</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyRecords}>
                <BarChart3 size={40} color={Colors.textMuted} />
                <Text style={styles.emptyText}>Keine Daten fuer diese Woche</Text>
                <Text style={styles.emptySubtext}>
                  Trainiere, um deine Muskelgruppen-Verteilung zu sehen.
                </Text>
              </View>
            )}
          </View>
        )}

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
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  tabActive: {
    backgroundColor: Colors.accent,
  },
  tabText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  tabTextActive: {
    color: Colors.text,
    fontWeight: '600' as const,
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
  recordsSubtext: {
    fontSize: 13,
    color: Colors.textMuted,
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
  dayCount: {
    fontSize: 10,
    color: Colors.accent,
    fontWeight: '600' as const,
    marginTop: 2,
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
  detailedRecord: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailedRecordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailedRecordInfo: {
    flex: 1,
  },
  recordDetail: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  detailedRecordRight: {
    alignItems: 'center',
    marginLeft: Spacing.md,
  },
  estimated1RM: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.accent,
  },
  estimated1RMLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  muscleList: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  muscleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  muscleName: {
    width: 120,
    fontSize: 13,
    color: Colors.text,
  },
  muscleBarContainer: {
    flex: 1,
    height: 16,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.sm,
    marginHorizontal: Spacing.sm,
    overflow: 'hidden',
  },
  muscleBar: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.sm,
  },
  muscleSets: {
    width: 60,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'right',
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
