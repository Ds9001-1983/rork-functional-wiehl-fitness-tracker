import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  CheckCircle,
  Clock,
  Calendar as CalendarIcon,
  Plus,
} from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { useWorkouts } from '@/hooks/use-workouts';
import { useAuth } from '@/hooks/use-auth';
import { useExercises } from '@/hooks/use-exercises';

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export default function CalendarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { workouts, workoutPlans, startWorkout } = useWorkouts();
  const { exercises: exerciseDb } = useExercises();
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(
    new Date().toISOString().split('T')[0]
  );

  // Get all workouts for the current user
  const userWorkouts = useMemo(() => {
    if (!user?.id) return [];
    return workouts.filter(w => w.userId === user.id);
  }, [workouts, user?.id]);

  // Build a map: dateStr -> workouts[]
  const workoutsByDate = useMemo(() => {
    const map: Record<string, typeof userWorkouts> = {};
    for (const w of userWorkouts) {
      const dateKey = new Date(w.date).toISOString().split('T')[0];
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(w);
    }
    return map;
  }, [userWorkouts]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday = 0, Sunday = 6 (ISO week)
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;

    const days: Array<{ date: Date | null; dateStr: string; isToday: boolean }> = [];

    // Empty cells before first day
    for (let i = 0; i < startDay; i++) {
      days.push({ date: null, dateStr: '', isToday: false });
    }

    const today = new Date().toISOString().split('T')[0];
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const dateStr = date.toISOString().split('T')[0];
      days.push({ date, dateStr, isToday: dateStr === today });
    }

    return days;
  }, [currentMonth]);

  const prevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const monthLabel = currentMonth.toLocaleDateString('de-DE', {
    month: 'long',
    year: 'numeric',
  });

  const selectedWorkouts = selectedDate ? workoutsByDate[selectedDate] || [] : [];

  const getExerciseName = (exerciseId: string) => {
    return exerciseDb.find(e => e.id === exerciseId)?.name || exerciseId;
  };

  const formatDuration = (ms: number) => {
    const totalMins = Math.round(ms / 60000);
    if (totalMins < 60) return `${totalMins} Min.`;
    const hrs = Math.floor(totalMins / 60);
    return `${hrs}h ${totalMins % 60}m`;
  };

  // Count training days this month
  const monthStats = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    let completed = 0;
    let scheduled = 0;

    for (const w of userWorkouts) {
      const wDate = new Date(w.date);
      if (wDate.getFullYear() === year && wDate.getMonth() === month) {
        if (w.completed) completed++;
        else scheduled++;
      }
    }

    return { completed, scheduled };
  }, [userWorkouts, currentMonth]);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Month navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.navButton}>
            <ChevronLeft size={28} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
            <ChevronRight size={28} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Month stats */}
        <View style={styles.monthStats}>
          <View style={styles.monthStatItem}>
            <CheckCircle size={14} color={Colors.success} />
            <Text style={styles.monthStatText}>{monthStats.completed} absolviert</Text>
          </View>
          {monthStats.scheduled > 0 && (
            <View style={styles.monthStatItem}>
              <Clock size={14} color={Colors.warning} />
              <Text style={styles.monthStatText}>{monthStats.scheduled} geplant</Text>
            </View>
          )}
        </View>

        {/* Weekday headers */}
        <View style={styles.weekdayRow}>
          {WEEKDAY_LABELS.map(label => (
            <View key={label} style={styles.weekdayCell}>
              <Text style={styles.weekdayText}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calendarGrid}>
          {calendarDays.map((day, i) => {
            if (!day.date) {
              return <View key={`empty-${i}`} style={styles.dayCell} />;
            }

            const dayWorkouts = workoutsByDate[day.dateStr] || [];
            const hasCompleted = dayWorkouts.some(w => w.completed);
            const hasScheduled = dayWorkouts.some(w => !w.completed);
            const isSelected = selectedDate === day.dateStr;

            return (
              <TouchableOpacity
                key={day.dateStr}
                style={[
                  styles.dayCell,
                  day.isToday && styles.todayCell,
                  isSelected && styles.selectedCell,
                ]}
                onPress={() => setSelectedDate(day.dateStr)}
              >
                <Text
                  style={[
                    styles.dayText,
                    day.isToday && styles.todayText,
                    isSelected && styles.selectedDayText,
                  ]}
                >
                  {day.date.getDate()}
                </Text>
                {/* Dots */}
                <View style={styles.dotRow}>
                  {hasCompleted && <View style={[styles.dot, styles.completedDot]} />}
                  {hasScheduled && <View style={[styles.dot, styles.scheduledDot]} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected date details */}
        <View style={styles.detailSection}>
          {selectedDate && (
            <Text style={styles.detailDate}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('de-DE', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
          )}

          {selectedWorkouts.length === 0 ? (
            <View style={styles.emptyDay}>
              <CalendarIcon size={40} color={Colors.textMuted} />
              <Text style={styles.emptyDayTitle}>Noch kein Training an diesem Tag</Text>
              <Text style={styles.emptyDaySubtext}>
                Jeder Trainingstag zählt — starte jetzt und fülle deinen Kalender!
              </Text>
              <TouchableOpacity
                style={styles.startWorkoutButton}
                onPress={() => {
                  startWorkout();
                  router.push('/active-workout' as never);
                }}
              >
                <Plus size={16} color={Colors.background} />
                <Text style={styles.startWorkoutButtonText}>Workout starten</Text>
              </TouchableOpacity>
            </View>
          ) : (
            selectedWorkouts.map(workout => {
              const exerciseNames = workout.exercises
                .slice(0, 3)
                .map(e => getExerciseName(e.exerciseId));
              const totalSets = workout.exercises.reduce(
                (sum, e) => sum + e.sets.filter(s => s.completed).length, 0
              );

              return (
                <TouchableOpacity
                  key={workout.id}
                  style={styles.workoutCard}
                  onPress={() => router.push(`/workout-detail/${workout.id}` as never)}
                >
                  <View style={styles.workoutCardLeft}>
                    <View style={[
                      styles.statusIndicator,
                      workout.completed ? styles.statusCompleted : styles.statusScheduled,
                    ]} />
                    <View style={styles.workoutCardInfo}>
                      <Text style={styles.workoutCardName}>{workout.name}</Text>
                      <Text style={styles.workoutCardExercises} numberOfLines={1}>
                        {exerciseNames.join(', ')}
                        {workout.exercises.length > 3 && ` +${workout.exercises.length - 3}`}
                      </Text>
                      <View style={styles.workoutCardMeta}>
                        {workout.completed && workout.duration && (
                          <View style={styles.metaItem}>
                            <Clock size={12} color={Colors.textMuted} />
                            <Text style={styles.metaText}>{formatDuration(workout.duration)}</Text>
                          </View>
                        )}
                        {workout.completed && totalSets > 0 && (
                          <View style={styles.metaItem}>
                            <Dumbbell size={12} color={Colors.textMuted} />
                            <Text style={styles.metaText}>{totalSets} Sätze</Text>
                          </View>
                        )}
                        {!workout.completed && (
                          <View style={styles.metaItem}>
                            <Clock size={12} color={Colors.warning} />
                            <Text style={[styles.metaText, { color: Colors.warning }]}>Geplant</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  <ChevronRight size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              );
            })
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
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  monthLabel: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
    textTransform: 'capitalize',
  },
  monthStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  monthStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  monthStatText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  weekdayText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.sm,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  todayCell: {
    // visual handled by todayText
  },
  selectedCell: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.sm,
  },
  dayText: {
    fontSize: 15,
    color: Colors.text,
  },
  todayText: {
    color: Colors.accent,
    fontWeight: '700' as const,
  },
  selectedDayText: {
    fontWeight: '700' as const,
    color: Colors.background,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 3,
    height: 6,
    marginTop: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  completedDot: {
    backgroundColor: Colors.success,
  },
  scheduledDot: {
    backgroundColor: Colors.warning,
  },
  detailSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  detailDate: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  emptyDay: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyDayTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: Spacing.md,
  },
  emptyDaySubtext: {
    color: Colors.textMuted,
    fontSize: 14,
    marginTop: Spacing.xs,
    textAlign: 'center',
    lineHeight: 20,
  },
  startWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  startWorkoutButtonText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  workoutCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statusIndicator: {
    width: 4,
    height: '100%',
    minHeight: 40,
    borderRadius: 2,
    marginRight: Spacing.sm,
  },
  statusCompleted: {
    backgroundColor: Colors.success,
  },
  statusScheduled: {
    backgroundColor: Colors.warning,
  },
  workoutCardInfo: {
    flex: 1,
  },
  workoutCardName: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  workoutCardExercises: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  workoutCardMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
