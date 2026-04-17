import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { trpcClient } from '@/lib/trpc';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { infoAlert } from '@/lib/alert';
import { Users, ChevronRight, Calendar } from 'lucide-react-native';
import { TrainerOnly } from '@/components/TrainerOnly';

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function formatDe(iso: string) {
  return new Date(iso).toLocaleString('de-DE', {
    timeZone: 'Europe/Berlin',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type UpcomingInstance = {
  id: string;
  start_time: string;
  status: string;
  booked: number;
  available: number;
  max_participants: number;
};

type Schedule = {
  id: string;
  day_of_week: number;
  start_time: string;
  valid_from: string;
  valid_until: string | null;
  recurrence_weeks: 1 | 2;
};

type Course = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  duration_minutes: number;
  max_participants: number;
};

type CourseGroup = {
  course: Course;
  schedules: Schedule[];
  upcomingInstances: UpcomingInstance[];
};

export default function TrainerCoursesScreen() {
  const [groups, setGroups] = useState<CourseGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await trpcClient.courses.trainer.listMyCourses.query();
      setGroups(data as CourseGroup[]);
    } catch (e: any) {
      console.error('[TrainerCourses] load failed:', e);
      infoAlert('Fehler', e?.message ?? 'Kurse konnten nicht geladen werden.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  if (loading) {
    return (
      <TrainerOnly>
        <View style={styles.center}><ActivityIndicator color={Colors.accent} /></View>
      </TrainerOnly>
    );
  }

  return (
    <TrainerOnly>
      <SafeAreaView edges={['bottom']} style={styles.container}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
          contentContainerStyle={{ padding: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.xxl + Spacing.lg }}
        >
          {groups.length === 0 && (
            <Text style={styles.empty}>
              Noch keine Kurse zugeordnet. Sobald der Admin einen Kurs erstellt, erscheint er hier.
            </Text>
          )}

          {groups.map(g => (
            <View key={g.course.id} style={styles.card}>
              <View style={styles.courseHeader}>
                <Text style={styles.courseName}>{g.course.name}</Text>
                {g.course.category ? <Text style={styles.badge}>{g.course.category}</Text> : null}
              </View>
              {g.course.description ? (
                <Text style={styles.courseDesc}>{g.course.description}</Text>
              ) : null}
              <Text style={styles.courseMeta}>
                {g.course.duration_minutes} min · max {g.course.max_participants} Teilnehmer
              </Text>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Calendar size={14} color={Colors.textSecondary} />
                  <Text style={styles.sectionTitle}>Wochenplan</Text>
                </View>
                {g.schedules.length === 0 ? (
                  <Text style={styles.emptyInline}>Kein Wochenplan hinterlegt.</Text>
                ) : (
                  g.schedules.map(s => (
                    <Text key={s.id} style={styles.scheduleLine}>
                      · {DAYS[s.day_of_week]} {s.start_time} · {s.recurrence_weeks === 2 ? 'alle 2 Wochen' : 'wöchentlich'}
                      {s.valid_until ? `  (bis ${s.valid_until})` : ''}
                    </Text>
                  ))
                )}
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Users size={14} color={Colors.textSecondary} />
                  <Text style={styles.sectionTitle}>Nächste Termine</Text>
                </View>
                {g.upcomingInstances.length === 0 ? (
                  <Text style={styles.emptyInline}>Keine anstehenden Termine in den nächsten 14 Tagen.</Text>
                ) : (
                  g.upcomingInstances.map(i => {
                    const fillPct = Math.round((i.booked / i.max_participants) * 100);
                    const isFull = fillPct >= 100;
                    return (
                      <Pressable
                        key={i.id}
                        style={styles.instanceRow}
                        onPress={() => router.push(`/trainer-course-participants?id=${i.id}`)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.instanceTime}>{formatDe(i.start_time)}</Text>
                          <View style={styles.fillBar}>
                            <View style={[styles.fillInner, {
                              width: `${Math.min(fillPct, 100)}%`,
                              backgroundColor: isFull ? Colors.error : Colors.accent,
                            }]} />
                          </View>
                          <Text style={styles.instanceMeta}>
                            {i.booked}/{i.max_participants} · {i.available} frei
                            {i.status !== 'scheduled' ? ` · ${i.status}` : ''}
                          </Text>
                        </View>
                        <ChevronRight size={18} color={Colors.textMuted} />
                      </Pressable>
                    );
                  })
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </TrainerOnly>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  empty: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl, paddingHorizontal: Spacing.md },

  card: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  courseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  courseName: { color: Colors.text, fontSize: 17, fontWeight: '700', flex: 1 },
  badge: {
    color: Colors.textSecondary,
    fontSize: 11,
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    textTransform: 'uppercase',
  },
  courseDesc: { color: Colors.textSecondary, marginTop: 4, fontSize: 13 },
  courseMeta: { color: Colors.textMuted, marginTop: 4, fontSize: 12 },

  section: { marginTop: Spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.xs },
  sectionTitle: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyInline: { color: Colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  scheduleLine: { color: Colors.text, fontSize: 14, marginBottom: 2 },

  instanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  instanceTime: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  instanceMeta: { color: Colors.textSecondary, fontSize: 12, marginTop: 4 },
  fillBar: { height: 4, backgroundColor: Colors.border, borderRadius: 2, marginVertical: 4, overflow: 'hidden' },
  fillInner: { height: '100%', borderRadius: 2 },
});
