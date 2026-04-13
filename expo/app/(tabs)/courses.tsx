import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useCourses, ScheduleItem } from '@/hooks/use-courses';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { Clock, Users, AlertTriangle, ClipboardList, ShieldAlert, Settings } from 'lucide-react-native';
import { confirmAlert, infoAlert } from '@/lib/alert';

function formatDe(iso: string) {
  return new Date(iso).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function CourseCard({ item, onBook, onJoinWaitlist, onCancel }: {
  item: ScheduleItem;
  onBook: () => void;
  onJoinWaitlist: () => void;
  onCancel: () => void;
}) {
  const isFull = item.available <= 0;
  const state = item.isBookedByMe ? 'booked' : item.onWaitlist ? 'waitlist' : isFull ? 'full' : 'free';
  const colorMap = { booked: Colors.accent, waitlist: Colors.warning, full: Colors.error, free: Colors.success };
  return (
    <View style={[styles.card, { borderLeftColor: colorMap[state] }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.courseName}>{item.course.name}</Text>
        <Text style={styles.courseTime}>{formatDe(item.instance.start_time)}</Text>
      </View>
      {item.course.description ? <Text style={styles.desc}>{item.course.description}</Text> : null}
      <View style={styles.row}>
        <View style={styles.chip}><Clock size={14} color={Colors.textSecondary} /><Text style={styles.chipText}>{item.course.duration_minutes} min</Text></View>
        <View style={styles.chip}><Users size={14} color={Colors.textSecondary} /><Text style={styles.chipText}>{item.booked}/{item.instance.max_participants}</Text></View>
        {item.course.trainer_name ? <Text style={styles.trainer}>{item.course.trainer_name}</Text> : null}
      </View>
      <View style={styles.row}>
        {state === 'booked' ? (
          <Pressable style={[styles.btn, styles.btnCancel]} onPress={onCancel}><Text style={styles.btnText}>Stornieren</Text></Pressable>
        ) : state === 'waitlist' ? (
          <Pressable style={[styles.btn, styles.btnWaitlist]} onPress={onJoinWaitlist}><Text style={styles.btnText}>Warteliste verlassen</Text></Pressable>
        ) : state === 'full' ? (
          <Pressable style={[styles.btn, styles.btnWaitlist]} onPress={onJoinWaitlist}><Text style={styles.btnText}>Auf Warteliste</Text></Pressable>
        ) : (
          <Pressable style={[styles.btn, styles.btnBook]} onPress={onBook}><Text style={styles.btnText}>Buchen</Text></Pressable>
        )}
      </View>
    </View>
  );
}

export default function CoursesScreen() {
  const { user } = useAuth();
  const { schedule, isBlocked, noShowCount, noShowLimit, isLoading, refresh, book, cancelBooking, joinWaitlist, leaveWaitlist } = useCourses();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await refresh(); setRefreshing(false);
  }, [refresh]);

  // Trainer view: show menu
  if (user?.role === 'trainer' || user?.role === 'admin') {
    return (
      <SafeAreaView edges={['bottom']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.trainerMenu}>
          <Text style={styles.menuTitle}>Kursverwaltung</Text>
          <Pressable style={styles.menuBtn} onPress={() => router.push('/trainer-courses')}>
            <ClipboardList size={22} color={Colors.text} />
            <Text style={styles.menuBtnText}>Meine Kurse (Trainer)</Text>
          </Pressable>
          <Pressable style={styles.menuBtn} onPress={() => router.push('/admin-courses')}>
            <Settings size={22} color={Colors.text} />
            <Text style={styles.menuBtnText}>Kurse verwalten (Admin)</Text>
          </Pressable>
          <Pressable style={styles.menuBtn} onPress={() => router.push('/admin-penalties')}>
            <ShieldAlert size={22} color={Colors.text} />
            <Text style={styles.menuBtnText}>No-Show Verwaltung</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (isLoading && !schedule.length) {
    return <View style={styles.center}><ActivityIndicator color={Colors.accent} /></View>;
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.headerRow}>
          <Text style={styles.header}>Kursplan (nächste 7 Tage)</Text>
          <Pressable onPress={() => router.push('/my-bookings')}>
            <Text style={styles.link}>Meine Buchungen</Text>
          </Pressable>
        </View>

        {isBlocked && (
          <View style={styles.blockedBanner}>
            <AlertTriangle size={20} color={Colors.error} />
            <Text style={styles.blockedText}>Deine Buchungsmöglichkeit ist aktuell gesperrt. Bitte wende dich an das Studio.</Text>
          </View>
        )}

        {!isBlocked && noShowCount > 0 && (
          <View style={styles.warnBanner}>
            <Text style={styles.warnText}>No-Shows: {noShowCount}/{noShowLimit}</Text>
          </View>
        )}

        {schedule.length === 0 ? (
          <Text style={styles.empty}>Keine Kurse in den nächsten 7 Tagen.</Text>
        ) : (
          schedule.map(item => (
            <CourseCard
              key={item.instance.id}
              item={item}
              onBook={() => {
                confirmAlert(
                  'Kurs buchen?',
                  `${item.course.name}\n${formatDe(item.instance.start_time)}\n\nHinweis: Stornierung bis 2 Stunden vor Start möglich. Spätere Stornos werden als No-Show gewertet.`,
                  () => book(item.instance.id).catch(e => infoAlert('Fehler', e?.message || 'Unbekannt')),
                  { confirmLabel: 'Buchen' }
                );
              }}
              onJoinWaitlist={() => {
                if (item.onWaitlist) {
                  leaveWaitlist(item.instance.id).catch(e => infoAlert('Fehler', e?.message));
                } else {
                  joinWaitlist(item.instance.id).catch(e => infoAlert('Fehler', e?.message));
                }
              }}
              onCancel={() => {
                if (!item.myBookingId) return;
                confirmAlert('Buchung stornieren?', 'Stornos unter 2h vor Start werden als No-Show gewertet.', async () => {
                  try {
                    const r = await cancelBooking(item.myBookingId!);
                    if (r.lateCancelled) infoAlert('Als No-Show gewertet', 'Stornierung < 2h vor Start.');
                  } catch (e: any) { infoAlert('Fehler', e?.message); }
                }, { confirmLabel: 'Stornieren', destructive: true });
              }}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.xxl + Spacing.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  header: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  link: { color: Colors.accent, fontWeight: '600' },
  empty: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, borderLeftWidth: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  courseName: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  courseTime: { color: Colors.textSecondary, fontSize: 13 },
  desc: { color: Colors.textSecondary, fontSize: 13, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surfaceLight, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  chipText: { color: Colors.textSecondary, fontSize: 12 },
  trainer: { color: Colors.textMuted, fontSize: 12 },
  btn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.sm, flex: 1, alignItems: 'center' },
  btnBook: { backgroundColor: Colors.accent },
  btnCancel: { backgroundColor: Colors.error },
  btnWaitlist: { backgroundColor: Colors.warning },
  btnText: { color: Colors.text, fontWeight: '700' },
  blockedBanner: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: '#3a1515', padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md, alignItems: 'center' },
  blockedText: { color: Colors.text, flex: 1 },
  warnBanner: { backgroundColor: '#3a2f15', padding: Spacing.sm, borderRadius: BorderRadius.sm, marginBottom: Spacing.md },
  warnText: { color: Colors.warning, textAlign: 'center' },
  trainerMenu: { padding: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xxl + Spacing.lg, gap: Spacing.md },
  menuTitle: { color: Colors.text, fontSize: 22, fontWeight: '700', marginBottom: Spacing.md },
  menuBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, padding: Spacing.lg, borderRadius: BorderRadius.md },
  menuBtnText: { color: Colors.text, fontSize: 16, fontWeight: '600' },
});
