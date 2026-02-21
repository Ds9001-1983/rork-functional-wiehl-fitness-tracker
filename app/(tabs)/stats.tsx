import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { TrendingUp, Award, Target, Activity, Trophy, BarChart3, Zap, Shield, HelpCircle, X, Dumbbell, Plus } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { useWorkouts } from '@/hooks/use-workouts';
import { useGamification } from '@/hooks/use-gamification';
import { StatsCard } from '@/components/StatsCard';
import { exercises as exerciseDatabase } from '@/data/exercises';
import { LEVEL_NAMES } from '@/types/gamification';

type StatsTab = 'overview' | 'records' | 'muscles' | 'achievements';
type TimePeriod = '7d' | '30d' | '90d' | 'all';

export default function StatsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { setCurrentUserId, getWorkoutHistory, getPersonalRecords, getDetailedRecords, getMuscleGroupVolume, workouts, startWorkout } = useWorkouts();
  const { gamification, unlockedBadges, level, levelName, xpProgress, allBadges, recalculateFromWorkouts } = useGamification();
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [activeTab, setActiveTab] = useState<StatsTab>('overview');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
  const [muscleTimePeriod, setMuscleTimePeriod] = useState<TimePeriod>('7d');
  const [showXPInfo, setShowXPInfo] = useState(false);
  const [chartMode, setChartMode] = useState<'count' | 'volume'>('count');

  useEffect(() => {
    if (user?.id) {
      setCurrentUserId(user.id);
    }
  }, [user?.id, setCurrentUserId]);

  // Recalculate gamification data when workouts change
  useEffect(() => {
    if (user?.id && workouts.length > 0) {
      recalculateFromWorkouts(workouts, user.id);
    }
  }, [user?.id, workouts.length]);

  const userWorkouts = getWorkoutHistory();
  const personalRecords = getPersonalRecords();
  const detailedRecords = getDetailedRecords();
  const muscleVolume = getMuscleGroupVolume();

  const filteredWorkouts = useMemo(() => {
    if (timePeriod === 'all') return userWorkouts;
    const days = timePeriod === '7d' ? 7 : timePeriod === '30d' ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return userWorkouts.filter(w => new Date(w.date) >= cutoff);
  }, [userWorkouts, timePeriod]);

  const totalVolume = filteredWorkouts.reduce((total, workout) => {
    return total + workout.exercises.reduce((wTotal, exercise) => {
      return wTotal + exercise.sets.reduce((eTotal, set) => {
        return eTotal + (set.weight * set.reps);
      }, 0);
    }, 0);
  }, 0);

  const totalSets = filteredWorkouts.reduce((total, workout) => {
    return total + workout.exercises.reduce((wTotal, exercise) => {
      return wTotal + exercise.sets.length;
    }, 0);
  }, 0);

  // Previous period for trend comparison
  const previousPeriodWorkouts = useMemo(() => {
    if (timePeriod === 'all') return [];
    const days = timePeriod === '7d' ? 7 : timePeriod === '30d' ? 30 : 90;
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - days);
    const prevStart = new Date(periodStart);
    prevStart.setDate(prevStart.getDate() - days);
    return userWorkouts.filter(w => {
      const d = new Date(w.date);
      return d >= prevStart && d < periodStart;
    });
  }, [userWorkouts, timePeriod]);

  const previousVolume = previousPeriodWorkouts.reduce((total, workout) => {
    return total + workout.exercises.reduce((wTotal, exercise) => {
      return wTotal + exercise.sets.reduce((eTotal, set) => {
        return eTotal + (set.weight * set.reps);
      }, 0);
    }, 0);
  }, 0);

  const getTrend = (current: number, previous: number) => {
    if (previous === 0 || timePeriod === 'all') return null;
    const pct = Math.round(((current - previous) / previous) * 100);
    if (pct === 0) return null;
    return { pct, up: pct > 0 };
  };

  const workoutTrend = getTrend(filteredWorkouts.length, previousPeriodWorkouts.length);
  const volumeTrend = getTrend(totalVolume, previousVolume);

  // Muscle volume with configurable time period
  const filteredMuscleVolume = useMemo(() => {
    const volume: Record<string, number> = {};
    const mDays = muscleTimePeriod === '7d' ? 7 : muscleTimePeriod === '30d' ? 30 : muscleTimePeriod === '90d' ? 90 : 9999;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - mDays);
    const mWorkouts = userWorkouts.filter(w => w.completed && (muscleTimePeriod === 'all' || new Date(w.date) >= cutoff));

    for (const workout of mWorkouts) {
      for (const exercise of workout.exercises) {
        const exData = exerciseDatabase.find(e => e.id === exercise.exerciseId);
        if (!exData) continue;
        const completedSets = exercise.sets.filter(s => s.completed).length;
        for (const mg of exData.muscleGroups) {
          volume[mg] = (volume[mg] || 0) + completedSets;
        }
      }
    }
    return volume;
  }, [userWorkouts, muscleTimePeriod]);

  const sortedFilteredMuscleVolume = Object.entries(filteredMuscleVolume).sort(([, a], [, b]) => b - a);
  const maxFilteredMuscleVolume = sortedFilteredMuscleVolume.length > 0 ? sortedFilteredMuscleVolume[0][1] : 1;

  const musclePeriodLabel = muscleTimePeriod === '7d' ? '7 Tage' : muscleTimePeriod === '30d' ? '30 Tage' : muscleTimePeriod === '90d' ? '90 Tage' : 'Gesamt';

  const getExerciseName = (exerciseId: string): string => {
    const exercise = exerciseDatabase.find(e => e.id === exerciseId);
    return exercise?.name || exerciseId;
  };

  const sortedRecords = Object.entries(personalRecords)
    .sort(([, a], [, b]) => b - a);

  const sortedDetailedRecords = detailedRecords
    .sort((a, b) => b.estimated1RM - a.estimated1RM);

  const sortedMuscleVolume = Object.entries(muscleVolume)
    .sort(([, a], [, b]) => b - a);

  const maxMuscleVolume = sortedMuscleVolume.length > 0 ? sortedMuscleVolume[0][1] : 1;

  const hasNoWorkouts = userWorkouts.length === 0;

  const unlockedIds = new Set(unlockedBadges.map(b => b.badgeId));

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Deine Statistiken</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.levelBadge}>
              <Zap size={14} color={Colors.warning} />
              <Text style={styles.levelText}>Lvl {level}</Text>
              <Text style={styles.xpText}>{gamification.xp} XP</Text>
            </View>
            <TouchableOpacity onPress={() => setShowXPInfo(true)} style={styles.helpButton}>
              <HelpCircle size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* XP Progress Bar */}
        <View style={styles.xpBarContainer}>
          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill, { width: `${xpProgress.progress * 100}%` }]} />
          </View>
          <Text style={styles.xpBarLabel}>{levelName} - {xpProgress.current} / {xpProgress.needed} XP</Text>
        </View>

        <View style={styles.tabBar}>
          {([
            { key: 'overview', label: 'Übersicht' },
            { key: 'achievements', label: 'Erfolge' },
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
            {hasNoWorkouts ? (
              <View style={styles.emptyOverview}>
                <Dumbbell size={56} color={Colors.textMuted} />
                <Text style={styles.emptyOverviewTitle}>Keine Statistiken vorhanden</Text>
                <Text style={styles.emptyOverviewSubtext}>
                  Starte dein erstes Workout, um deine Statistiken zu füllen! Hier siehst du dann deinen Fortschritt, deine Serie und deine Bestleistungen.
                </Text>
                <TouchableOpacity
                  style={styles.emptyOverviewButton}
                  onPress={() => {
                    startWorkout();
                    router.push('/active-workout' as never);
                  }}
                >
                  <Plus size={18} color={Colors.background} />
                  <Text style={styles.emptyOverviewButtonText}>Erstes Workout starten</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.filterRow}>
                  {([
                    { key: '7d', label: '7 Tage' },
                    { key: '30d', label: '30 Tage' },
                    { key: '90d', label: '90 Tage' },
                    { key: 'all', label: 'Gesamt' },
                  ] as const).map(filter => (
                    <TouchableOpacity
                      key={filter.key}
                      style={[styles.filterChip, timePeriod === filter.key && styles.filterChipActive]}
                      onPress={() => setTimePeriod(filter.key)}
                    >
                      <Text style={[styles.filterChipText, timePeriod === filter.key && styles.filterChipTextActive]}>
                        {filter.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.statsGrid}>
                  <StatsCard
                    title="Gesamt Workouts"
                    value={filteredWorkouts.length}
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
                    title="Aktuelle Serie"
                    value={`${gamification.currentStreak} Tage`}
                    icon={<Award size={20} color={Colors.error} />}
                    color={Colors.error}
                  />
                </View>

                {/* Trend indicators */}
                {timePeriod !== 'all' && (workoutTrend || volumeTrend) && (
                  <View style={styles.trendRow}>
                    {workoutTrend && (
                      <Text style={[styles.trendText, workoutTrend.up ? styles.trendUp : styles.trendDown]}>
                        Workouts: {workoutTrend.up ? '↑' : '↓'} {Math.abs(workoutTrend.pct)}% vs Vorperiode
                      </Text>
                    )}
                    {volumeTrend && (
                      <Text style={[styles.trendText, volumeTrend.up ? styles.trendUp : styles.trendDown]}>
                        Volumen: {volumeTrend.up ? '↑' : '↓'} {Math.abs(volumeTrend.pct)}% vs Vorperiode
                      </Text>
                    )}
                  </View>
                )}

                {/* Streak Info Card */}
                <View style={styles.section}>
                  <View style={styles.streakCard}>
                    <View style={styles.streakRow}>
                      <View style={styles.streakItem}>
                        <Text style={styles.streakValue}>{gamification.currentStreak}</Text>
                        <Text style={styles.streakLabel}>Aktuelle Serie</Text>
                      </View>
                      <View style={styles.streakDivider} />
                      <View style={styles.streakItem}>
                        <Text style={styles.streakValue}>{gamification.longestStreak}</Text>
                        <Text style={styles.streakLabel}>Längste Serie</Text>
                      </View>
                      <View style={styles.streakDivider} />
                      <View style={styles.streakItem}>
                        <View style={styles.freezeRow}>
                          <Shield size={16} color="#42A5F5" />
                          <Text style={styles.streakValue}>{gamification.streakFreezes}</Text>
                        </View>
                        <Text style={styles.streakLabel}>Streak Freeze</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.section}>
                  <View style={styles.chartHeader}>
                    <Text style={styles.sectionTitleStandalone}>Wöchentlicher Fortschritt</Text>
                    <View style={styles.chartToggle}>
                      <TouchableOpacity
                        style={[styles.chartToggleBtn, chartMode === 'count' && styles.chartToggleBtnActive]}
                        onPress={() => setChartMode('count')}
                      >
                        <Text style={[styles.chartToggleText, chartMode === 'count' && styles.chartToggleTextActive]}>Anzahl</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.chartToggleBtn, chartMode === 'volume' && styles.chartToggleBtnActive]}
                        onPress={() => setChartMode('volume')}
                      >
                        <Text style={[styles.chartToggleText, chartMode === 'volume' && styles.chartToggleTextActive]}>Volumen</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.weekChart}>
                    {(() => {
                      const dayData = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day, index) => {
                        const dayWorkouts = filteredWorkouts.filter(w => {
                          const workoutDay = new Date(w.date).getDay();
                          return workoutDay === (index + 1) % 7;
                        });
                        const vol = dayWorkouts.reduce((sum, w) =>
                          sum + w.exercises.reduce((eSum, ex) =>
                            eSum + ex.sets.reduce((sSum, s) => sSum + s.weight * s.reps, 0), 0), 0);
                        return { day, count: dayWorkouts.length, volume: vol };
                      });
                      const maxVal = chartMode === 'count'
                        ? Math.max(...dayData.map(d => d.count), 1)
                        : Math.max(...dayData.map(d => d.volume), 1);
                      return dayData.map((d, i) => {
                        const val = chartMode === 'count' ? d.count : d.volume;
                        const height = Math.min(100, (val / maxVal) * 100);
                        const label = chartMode === 'count' ? (d.count > 0 ? `${d.count}` : '') : (d.volume > 0 ? `${(d.volume / 1000).toFixed(1)}t` : '');
                        return (
                          <View key={`${d.day}-${i}`} style={styles.dayColumn}>
                            <View style={styles.barContainer}>
                              <View style={[styles.bar, { height: Math.max(height, 2) }]} />
                            </View>
                            <Text style={styles.dayLabel}>{d.day}</Text>
                            {label ? <Text style={styles.dayCount}>{label}</Text> : null}
                          </View>
                        );
                      });
                    })()}
                  </View>
                </View>

                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Trophy size={20} color={Colors.accent} />
                    <Text style={styles.sectionTitle}>Top Bestleistungen</Text>
                  </View>
                  {sortedDetailedRecords.length > 0 ? (
                    <View style={styles.recordsList}>
                      {sortedDetailedRecords.slice(0, 5).map((record, index) => (
                        <View
                          key={record.exerciseId}
                          style={[styles.recordItem, index === Math.min(4, sortedDetailedRecords.length - 1) && styles.recordItemLast]}
                        >
                          <View style={styles.recordLeft}>
                            <Text style={styles.recordRank}>#{index + 1}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.recordName}>{getExerciseName(record.exerciseId)}</Text>
                              <Text style={styles.recordDate}>
                                {new Date(record.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.recordValue}>{record.weight} kg</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyRecords}>
                      <Trophy size={40} color={Colors.textMuted} />
                      <Text style={styles.emptyText}>Noch keine Bestleistungen</Text>
                      <Text style={styles.emptySubtext}>
                        Schließe Workouts ab, um deine Rekorde zu tracken!
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </>
        )}

        {activeTab === 'achievements' && (
          <>
            {/* Summary */}
            <View style={styles.achievementSummary}>
              <View style={styles.achievementSummaryCard}>
                <Text style={styles.achievementSummaryValue}>{unlockedBadges.length}</Text>
                <Text style={styles.achievementSummaryLabel}>Freigeschaltet</Text>
              </View>
              <View style={styles.achievementSummaryCard}>
                <Text style={styles.achievementSummaryValue}>{allBadges.length - unlockedBadges.length}</Text>
                <Text style={styles.achievementSummaryLabel}>Offen</Text>
              </View>
            </View>

            {/* Badge Categories */}
            {(['consistency', 'milestone', 'performance', 'special'] as const).map(category => {
              const categoryNames: Record<string, string> = {
                consistency: 'Konsistenz',
                milestone: 'Meilensteine',
                performance: 'Leistung',
                special: 'Spezial',
              };
              const categoryBadges = allBadges.filter(b => b.category === category);

              return (
                <View key={category} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Award size={20} color={Colors.accent} />
                    <Text style={styles.sectionTitle}>{categoryNames[category]}</Text>
                  </View>
                  <View style={styles.badgeGrid}>
                    {categoryBadges.map(badge => {
                      const isUnlocked = unlockedIds.has(badge.id);
                      const userBadge = unlockedBadges.find(b => b.badgeId === badge.id);
                      return (
                        <View
                          key={badge.id}
                          style={[styles.badgeCard, !isUnlocked && styles.badgeCardLocked]}
                        >
                          <Text style={[styles.badgeIcon, !isUnlocked && styles.badgeIconLocked]}>
                            {badge.icon}
                          </Text>
                          <Text style={[styles.badgeName, !isUnlocked && styles.badgeNameLocked]}>
                            {badge.name}
                          </Text>
                          <Text style={[styles.badgeDesc, !isUnlocked && styles.badgeDescLocked]}>
                            {badge.description}
                          </Text>
                          {isUnlocked && userBadge && (
                            <Text style={styles.badgeDate}>
                              {new Date(userBadge.unlockedAt).toLocaleDateString('de-DE')}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </>
        )}

        {activeTab === 'records' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Trophy size={20} color={Colors.accent} />
              <Text style={styles.sectionTitle}>Alle Rekorde</Text>
            </View>
            <Text style={styles.recordsSubtext}>Geschätztes 1RM (Epley-Formel)</Text>

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
                <Text style={styles.emptyText}>Noch keine Rekorde</Text>
                <Text style={styles.emptySubtext}>
                  Schließe Workouts mit Gewichten ab, um deine persönlichen Rekorde zu sehen.
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'muscles' && (
          <>
            <View style={styles.filterRow}>
              {([
                { key: '7d', label: '7 Tage' },
                { key: '30d', label: '30 Tage' },
                { key: '90d', label: '90 Tage' },
                { key: 'all', label: 'Gesamt' },
              ] as const).map(filter => (
                <TouchableOpacity
                  key={filter.key}
                  style={[styles.filterChip, muscleTimePeriod === filter.key && styles.filterChipActive]}
                  onPress={() => setMuscleTimePeriod(filter.key)}
                >
                  <Text style={[styles.filterChipText, muscleTimePeriod === filter.key && styles.filterChipTextActive]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <BarChart3 size={20} color={Colors.accent} />
                <Text style={styles.sectionTitle}>Muskelgruppen ({musclePeriodLabel})</Text>
              </View>

              {sortedFilteredMuscleVolume.length > 0 ? (
                <View style={styles.muscleList}>
                  {sortedFilteredMuscleVolume.map(([muscle, sets]) => (
                    <View key={muscle} style={styles.muscleRow}>
                      <Text style={styles.muscleName}>{muscle}</Text>
                      <View style={styles.muscleBarContainer}>
                        <View
                          style={[
                            styles.muscleBar,
                            { width: `${(sets / maxFilteredMuscleVolume) * 100}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.muscleSets}>{sets} Sätze</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyRecords}>
                  <BarChart3 size={40} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>Keine Daten für diesen Zeitraum</Text>
                  <Text style={styles.emptySubtext}>
                    Trainiere, um deine Muskelgruppen-Verteilung zu sehen.
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* XP Info Modal */}
      <Modal visible={showXPInfo} transparent animationType="fade" onRequestClose={() => setShowXPInfo(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>So funktioniert das XP-System</Text>
              <TouchableOpacity onPress={() => setShowXPInfo(false)}>
                <X size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.xpTable}>
              <View style={styles.xpRow}>
                <Text style={styles.xpAction}>Workout abschließen</Text>
                <Text style={styles.xpValue}>+50 XP</Text>
              </View>
              <View style={styles.xpRow}>
                <Text style={styles.xpAction}>Persönlicher Rekord</Text>
                <Text style={styles.xpValue}>+100 XP</Text>
              </View>
              <View style={styles.xpRow}>
                <Text style={styles.xpAction}>Trainings-Serie (pro Tag)</Text>
                <Text style={styles.xpValue}>+25 XP</Text>
              </View>
            </View>

            <View style={styles.xpLevelInfo}>
              <Zap size={16} color={Colors.warning} />
              <Text style={styles.xpLevelText}>
                Level-Aufstieg: alle 500 XP
              </Text>
            </View>

            <Text style={styles.xpCurrentInfo}>
              Dein Fortschritt: {gamification.xp} XP (Level {level} - {levelName})
            </Text>

            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowXPInfo(false)}>
              <Text style={styles.modalCloseButtonText}>Verstanden</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing.lg, paddingTop: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  helpButton: { padding: 4 },
  title: { fontSize: 28, fontWeight: 'bold' as const, color: Colors.text },
  levelBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.warning, gap: 4 },
  levelText: { fontSize: 12, fontWeight: '600' as const, color: Colors.warning },
  xpText: { fontSize: 11, color: Colors.textMuted },
  xpBarContainer: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  xpBarBg: { height: 6, backgroundColor: Colors.surfaceLight, borderRadius: 3, overflow: 'hidden' },
  xpBarFill: { height: '100%', backgroundColor: Colors.warning, borderRadius: 3 },
  xpBarLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2, textAlign: 'right' },
  tabBar: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 3, borderWidth: 1, borderColor: Colors.border },
  tab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: BorderRadius.sm },
  tabActive: { backgroundColor: Colors.accent },
  tabText: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' as const },
  tabTextActive: { color: Colors.text, fontWeight: '600' as const },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, gap: Spacing.md, marginBottom: Spacing.xl },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sectionTitle: { fontSize: 20, fontWeight: '600' as const, color: Colors.text },
  sectionTitleStandalone: { fontSize: 20, fontWeight: '600' as const, color: Colors.text, marginBottom: Spacing.md },
  recordsSubtext: { fontSize: 13, color: Colors.textMuted, marginBottom: Spacing.md },
  streakCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  streakRow: { flexDirection: 'row', alignItems: 'center' },
  streakItem: { flex: 1, alignItems: 'center' },
  streakDivider: { width: 1, height: 40, backgroundColor: Colors.border },
  streakValue: { fontSize: 24, fontWeight: '700' as const, color: Colors.accent },
  streakLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  freezeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  weekChart: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  dayColumn: { flex: 1, alignItems: 'center' },
  barContainer: { height: 100, justifyContent: 'flex-end', marginBottom: Spacing.sm },
  bar: { width: 30, backgroundColor: Colors.accent, borderRadius: BorderRadius.sm },
  dayLabel: { fontSize: 12, color: Colors.textMuted },
  dayCount: { fontSize: 10, color: Colors.accent, fontWeight: '600' as const, marginTop: 2 },
  recordsList: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  recordItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  recordItemLast: { borderBottomWidth: 0 },
  recordLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  recordRank: { fontSize: 14, fontWeight: '700' as const, color: Colors.accent, width: 30 },
  recordName: { fontSize: 16, color: Colors.text, flex: 1 },
  recordValue: { fontSize: 16, fontWeight: '600' as const, color: Colors.accent },
  detailedRecord: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailedRecordLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  detailedRecordInfo: { flex: 1 },
  recordDetail: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  detailedRecordRight: { alignItems: 'center', marginLeft: Spacing.md },
  estimated1RM: { fontSize: 18, fontWeight: '700' as const, color: Colors.accent },
  estimated1RMLabel: { fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase' },
  muscleList: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  muscleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  muscleName: { width: 120, fontSize: 13, color: Colors.text },
  muscleBarContainer: { flex: 1, height: 16, backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.sm, marginHorizontal: Spacing.sm, overflow: 'hidden' },
  muscleBar: { height: '100%', backgroundColor: Colors.accent, borderRadius: BorderRadius.sm },
  muscleSets: { width: 60, fontSize: 12, color: Colors.textMuted, textAlign: 'right' },
  achievementSummary: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.md, marginBottom: Spacing.lg },
  achievementSummaryCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  achievementSummaryValue: { fontSize: 28, fontWeight: '700' as const, color: Colors.accent },
  achievementSummaryLabel: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  badgeCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.accent, flexGrow: 0, flexShrink: 0, flexBasis: '47%' },
  badgeCardLocked: { borderColor: Colors.border, opacity: 0.5 },
  badgeIcon: { fontSize: 28, marginBottom: 4 },
  badgeIconLocked: { opacity: 0.4 },
  badgeName: { fontSize: 14, fontWeight: '600' as const, color: Colors.text, marginBottom: 2 },
  badgeNameLocked: { color: Colors.textMuted },
  badgeDesc: { fontSize: 11, color: Colors.textSecondary },
  badgeDescLocked: { color: Colors.textMuted },
  badgeDate: { fontSize: 10, color: Colors.accent, marginTop: 4 },
  emptyOverview: { marginHorizontal: Spacing.lg, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  emptyOverviewTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text, marginTop: Spacing.lg },
  emptyOverviewSubtext: { fontSize: 14, color: Colors.textMuted, marginTop: Spacing.sm, textAlign: 'center', lineHeight: 20, paddingHorizontal: Spacing.md },
  emptyOverviewButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.accent, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.lg },
  emptyOverviewButtonText: { color: Colors.background, fontSize: 16, fontWeight: '600' as const },
  emptyRecords: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  emptyText: { fontSize: 16, fontWeight: '600' as const, color: Colors.textSecondary, marginTop: Spacing.md },
  emptySubtext: { fontSize: 14, color: Colors.textMuted, marginTop: Spacing.sm, textAlign: 'center' },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  chartToggle: { flexDirection: 'row', borderRadius: BorderRadius.sm, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  chartToggleBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 4, backgroundColor: Colors.surface },
  chartToggleBtnActive: { backgroundColor: Colors.accent },
  chartToggleText: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' as const },
  chartToggleTextActive: { color: Colors.background, fontWeight: '600' as const },
  trendRow: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md, gap: 4 },
  trendText: { fontSize: 12, fontWeight: '600' as const },
  trendUp: { color: Colors.success },
  trendDown: { color: Colors.error },
  recordDate: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  filterRow: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.md, gap: Spacing.xs },
  filterChip: { flex: 1, paddingVertical: Spacing.xs, alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterChipText: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' as const },
  filterChipTextActive: { color: Colors.background, fontWeight: '600' as const },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  modalCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: Colors.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text },
  xpTable: { marginBottom: Spacing.lg },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  xpAction: { fontSize: 14, color: Colors.text },
  xpValue: { fontSize: 14, fontWeight: '700' as const, color: Colors.accent },
  xpLevelInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  xpLevelText: { fontSize: 14, color: Colors.textSecondary },
  xpCurrentInfo: { fontSize: 13, color: Colors.textMuted, marginBottom: Spacing.lg },
  modalCloseButton: { backgroundColor: Colors.accent, padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center' },
  modalCloseButtonText: { color: Colors.background, fontSize: 16, fontWeight: '600' as const },
});
