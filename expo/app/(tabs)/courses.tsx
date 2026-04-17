import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useCourses, ScheduleItem } from '@/hooks/use-courses';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { Clock, Users, AlertTriangle, ClipboardList, ShieldAlert, Settings } from 'lucide-react-native';
import { confirmAlert, infoAlert } from '@/lib/alert';

const DAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

function berlinDateKey(iso: string) {
  // YYYY-MM-DD in Berlin-TZ als Key für Tages-Gruppierung
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  const y = parts.find(p => p.type === 'year')?.value ?? '';
  const m = parts.find(p => p.type === 'month')?.value ?? '';
  const day = parts.find(p => p.type === 'day')?.value ?? '';
  return `${y}-${m}-${day}`;
}

function formatTimeDe(iso: string) {
  return new Date(iso).toLocaleTimeString('de-DE', {
    timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit',
  });
}

function formatDayHeader(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(s => parseInt(s, 10));
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dow = DAY_LABELS[dt.getUTCDay()];
  return `${dow} ${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.`;
}

function hexToRgba(hex: string | null, alpha: number): string {
  if (!hex) return `rgba(255, 255, 255, ${alpha * 0.1})`;
  const m = /^#([0-9A-Fa-f]{6})$/.exec(hex);
  if (!m) return `rgba(255, 255, 255, ${alpha * 0.1})`;
  const h = m[1];
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function CourseTile({ item, onPress }: { item: ScheduleItem; onPress: () => void }) {
  const isFull = item.available <= 0;
  const color = (item.course as any).color ?? null;
  const state = item.isBookedByMe ? 'booked' : item.onWaitlist ? 'waitlist' : isFull ? 'full' : 'free';
  const badgeText =
    state === 'booked' ? 'Gebucht' :
    state === 'waitlist' ? 'Warteliste' :
    state === 'full' ? 'Voll' : null;
  const badgeColor =
    state === 'booked' ? Colors.accent :
    state === 'waitlist' ? Colors.warning :
    state === 'full' ? Colors.error : Colors.success;
  return (
    <Pressable
      style={[styles.tile, { backgroundColor: hexToRgba(color, 0.1) }]}
      onPress={onPress}
    >
      <View style={[styles.tileColorBar, { backgroundColor: color ?? Colors.border }]} />
      <View style={{ flex: 1, paddingVertical: Spacing.xs, paddingRight: Spacing.sm }}>
        <View style={styles.tileHeaderRow}>
          <Text style={styles.tileTime}>{formatTimeDe(item.instance.start_time)}</Text>
          <Text style={styles.tileName} numberOfLines={1}>{item.course.name}</Text>
        </View>
        <View style={styles.tileMetaRow}>
          <View style={styles.chip}>
            <Clock size={12} color={Colors.textMuted} />
            <Text style={styles.chipText}>{item.course.duration_minutes} min</Text>
          </View>
          <View style={styles.chip}>
            <Users size={12} color={Colors.textMuted} />
            <Text style={styles.chipText}>
              {item.booked}/{item.instance.max_participants} · {isFull ? 'voll' : `${item.available} frei`}
            </Text>
          </View>
          {badgeText && (
            <View style={[styles.badge, { backgroundColor: badgeColor }]}>
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function CoursesScreen() {
  const { user } = useAuth();
  const { schedule, isBlocked, noShowCount, noShowLimit, isLoading, refresh, book, cancelBooking, joinWaitlist, leaveWaitlist } = useCourses();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await refresh(); setRefreshing(false);
  }, [refresh]);

  // Rolling 7 Tage ab heute (Berlin) — jeder Tag bekommt eine Sektion, auch leere.
  const days = useMemo(() => {
    const result: { key: string; header: string; items: ScheduleItem[] }[] = [];
    const todayKey = berlinDateKey(new Date().toISOString());
    const [y0, m0, d0] = todayKey.split('-').map(s => parseInt(s, 10));
    for (let offset = 0; offset < 7; offset++) {
      const dt = new Date(Date.UTC(y0, m0 - 1, d0 + offset, 12, 0, 0));
      const key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
      result.push({ key, header: formatDayHeader(key), items: [] });
    }
    for (const item of schedule) {
      const key = berlinDateKey(item.instance.start_time);
      const section = result.find(d => d.key === key);
      if (section) section.items.push(item);
    }
    for (const sec of result) {
      sec.items.sort((a, b) => a.instance.start_time.localeCompare(b.instance.start_time));
    }
    return result;
  }, [schedule]);

  const openAction = useCallback((item: ScheduleItem) => {
    const state = item.isBookedByMe ? 'booked' : item.onWaitlist ? 'waitlist' : item.available <= 0 ? 'full' : 'free';
    const timeStr = formatTimeDe(item.instance.start_time);
    if (state === 'booked') {
      confirmAlert(
        'Buchung stornieren?',
        `${item.course.name} · ${timeStr}\n\nStornos unter 2h vor Start werden als No-Show gewertet.`,
        async () => {
          if (!item.myBookingId) return;
          try {
            const r = await cancelBooking(item.myBookingId);
            if (r.lateCancelled) infoAlert('Als No-Show gewertet', 'Stornierung < 2h vor Start.');
          } catch (e: any) { infoAlert('Fehler', e?.message); }
        },
        { confirmLabel: 'Stornieren', destructive: true },
      );
      return;
    }
    if (state === 'waitlist') {
      confirmAlert(
        'Warteliste verlassen?',
        `${item.course.name} · ${timeStr}`,
        () => leaveWaitlist(item.instance.id).catch(e => infoAlert('Fehler', e?.message)),
        { confirmLabel: 'Verlassen' },
      );
      return;
    }
    if (state === 'full') {
      confirmAlert(
        'Auf Warteliste setzen?',
        `${item.course.name} · ${timeStr}\n\nDu rückst automatisch nach, wenn ein Platz frei wird.`,
        () => joinWaitlist(item.instance.id).catch(e => infoAlert('Fehler', e?.message)),
        { confirmLabel: 'Auf Warteliste' },
      );
      return;
    }
    confirmAlert(
      'Kurs buchen?',
      `${item.course.name} · ${timeStr}\n\nHinweis: Stornierung bis 2 Stunden vor Start möglich. Spätere Stornos werden als No-Show gewertet.`,
      () => book(item.instance.id).catch(e => infoAlert('Fehler', e?.message || 'Unbekannt')),
      { confirmLabel: 'Buchen' },
    );
  }, [book, cancelBooking, joinWaitlist, leaveWaitlist]);

  // Trainer/Admin: Verwaltungs-Menü beibehalten (der bestehende Quick-Access).
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
          <Text style={styles.header}>Kurs-Kalender</Text>
          <Pressable onPress={() => router.push('/my-bookings')}>
            <Text style={styles.link}>Meine Buchungen</Text>
          </Pressable>
        </View>
        <Text style={styles.subHeader}>7 Tage ab heute · Buchung max. 7 Tage im Voraus</Text>

        {isBlocked && (
          <View style={styles.blockedBanner}>
            <AlertTriangle size={20} color={Colors.error} />
            <Text style={styles.blockedText}>
              Deine Buchungsmöglichkeit ist aktuell gesperrt. Bitte wende dich an das Studio.
            </Text>
          </View>
        )}
        {!isBlocked && noShowCount > 0 && (
          <View style={styles.warnBanner}>
            <Text style={styles.warnText}>No-Shows: {noShowCount}/{noShowLimit}</Text>
          </View>
        )}

        {days.map(day => (
          <View key={day.key} style={styles.daySection}>
            <Text style={styles.dayHeader}>{day.header}</Text>
            {day.items.length === 0 ? (
              <Text style={styles.emptyDay}>Keine Kurse an diesem Tag</Text>
            ) : (
              day.items.map(item => (
                <CourseTile key={item.instance.id} item={item} onPress={() => openAction(item)} />
              ))
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.xxl + Spacing.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  header: { color: Colors.text, fontSize: 20, fontWeight: '700' },
  subHeader: { color: Colors.textMuted, fontSize: 12, marginBottom: Spacing.md, marginTop: 2 },
  link: { color: Colors.accent, fontWeight: '600' },

  daySection: { marginBottom: Spacing.lg },
  dayHeader: {
    color: Colors.text, fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  emptyDay: {
    color: Colors.textMuted, fontSize: 12, fontStyle: 'italic',
    paddingVertical: Spacing.sm,
  },

  tile: {
    flexDirection: 'row',
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
    overflow: 'hidden',
    minHeight: 56,
  },
  tileColorBar: { width: 4 },
  tileHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.sm, paddingTop: Spacing.xs,
  },
  tileTime: { color: Colors.text, fontSize: 15, fontWeight: '700', minWidth: 46 },
  tileName: { color: Colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
  tileMetaRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.sm, paddingBottom: Spacing.xs, paddingTop: 4,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4,
  },
  chipText: { color: Colors.textSecondary, fontSize: 11 },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: Colors.text, fontSize: 11, fontWeight: '700' },

  blockedBanner: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: '#3a1515', padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md, alignItems: 'center' },
  blockedText: { color: Colors.text, flex: 1 },
  warnBanner: { backgroundColor: '#3a2f15', padding: Spacing.sm, borderRadius: BorderRadius.sm, marginBottom: Spacing.md },
  warnText: { color: Colors.warning, textAlign: 'center' },

  trainerMenu: { padding: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xxl + Spacing.lg, gap: Spacing.md },
  menuTitle: { color: Colors.text, fontSize: 22, fontWeight: '700', marginBottom: Spacing.md },
  menuBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, padding: Spacing.lg, borderRadius: BorderRadius.md },
  menuBtnText: { color: Colors.text, fontSize: 16, fontWeight: '600' },
});
