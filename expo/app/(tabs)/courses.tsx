import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useCourses, ScheduleItem } from '@/hooks/use-courses';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { AlertTriangle, ClipboardList, ShieldAlert, Settings, RefreshCw } from 'lucide-react-native';
import { confirmAlert, infoAlert } from '@/lib/alert';

const DAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const DAYS_VISIBLE = 3;
const DAY_GAP = 6;
const CONTAINER_HORIZONTAL_PADDING = Spacing.md;
const APP_MAX_WIDTH = 768;

function berlinDateKey(iso: string) {
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

function formatDayHeader(dateKey: string): { dow: string; date: string } {
  const [y, m, d] = dateKey.split('-').map(s => parseInt(s, 10));
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return {
    dow: DAY_LABELS[dt.getUTCDay()],
    date: `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.`,
  };
}

function getContrastColor(hex: string | null): string {
  if (!hex) return '#FFFFFF';
  const m = /^#([0-9A-Fa-f]{6})$/.exec(hex);
  if (!m) return '#FFFFFF';
  const h = m[1];
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // WCAG-relative luminance (vereinfacht)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#000000' : '#FFFFFF';
}

function CourseGridTile({ item, width, onPress }: { item: ScheduleItem; width: number; onPress: () => void }) {
  const isFull = item.available <= 0;
  const rawColor = (item.course as any).color ?? null;
  const bg = rawColor ?? Colors.surface;
  const fg = getContrastColor(rawColor);
  const fgMuted = fg === '#FFFFFF' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)';
  const overlay = fg === '#FFFFFF' ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.3)';

  const state = item.isBookedByMe ? 'booked' : item.onWaitlist ? 'waitlist' : isFull ? 'full' : 'free';
  const badgeText =
    state === 'booked' ? 'Gebucht' :
    state === 'waitlist' ? 'Warteliste' :
    state === 'full' ? 'Voll' : null;

  return (
    <Pressable
      style={[styles.gridTile, { backgroundColor: bg, width }]}
      onPress={onPress}
    >
      <Text style={[styles.gridTime, { color: fg }]} numberOfLines={1}>
        {formatTimeDe(item.instance.start_time)}
      </Text>
      <Text style={[styles.gridName, { color: fg }]} numberOfLines={2}>
        {item.course.name}
      </Text>
      <Text style={[styles.gridMeta, { color: fgMuted }]} numberOfLines={1}>
        {item.course.duration_minutes} Min
      </Text>
      <Text style={[styles.gridMeta, { color: fgMuted }]} numberOfLines={1}>
        {isFull ? 'Voll' : `${item.available}/${item.instance.max_participants} frei`}
      </Text>
      {badgeText && (
        <View style={[styles.gridBadge, { backgroundColor: overlay }]}>
          <Text style={[styles.gridBadgeText, { color: fg }]}>{badgeText}</Text>
        </View>
      )}
    </Pressable>
  );
}

function DayColumn({
  day, columnWidth, onPress,
}: {
  day: { key: string; header: { dow: string; date: string }; items: ScheduleItem[] };
  columnWidth: number;
  onPress: (item: ScheduleItem) => void;
}) {
  // Gruppiere nach exakter Startzeit (HH:mm). Mehrere gleichzeitige Kurse → nebeneinander.
  const groups = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    for (const it of day.items) {
      const t = formatTimeDe(it.instance.start_time);
      if (!map.has(t)) map.set(t, []);
      map.get(t)!.push(it);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [day.items]);

  return (
    <View style={{ width: columnWidth, marginRight: DAY_GAP }}>
      <View style={styles.colHeader}>
        <Text style={styles.colHeaderDow}>{day.header.dow}</Text>
        <Text style={styles.colHeaderDate}>{day.header.date}</Text>
      </View>
      {day.items.length === 0 ? (
        <Text style={styles.emptyColText}>Keine Kurse</Text>
      ) : (
        <View style={{ gap: 4 }}>
          {groups.map(([time, items]) => {
            if (items.length === 1) {
              return (
                <CourseGridTile
                  key={items[0].instance.id}
                  item={items[0]}
                  width={columnWidth}
                  onPress={() => onPress(items[0])}
                />
              );
            }
            // Mehrere gleichzeitige Kurse → nebeneinander
            const tileW = (columnWidth - 4 * (items.length - 1)) / items.length;
            return (
              <View key={time} style={{ flexDirection: 'row', gap: 4 }}>
                {items.map(it => (
                  <CourseGridTile
                    key={it.instance.id}
                    item={it}
                    width={tileW}
                    onPress={() => onPress(it)}
                  />
                ))}
              </View>
            );
          })}
        </View>
      )}
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

  // Rolling 7 Tage ab heute (Berlin) — jeder Tag bekommt eine Sektion, auch leere.
  const days = useMemo(() => {
    const result: { key: string; header: { dow: string; date: string }; items: ScheduleItem[] }[] = [];
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

  const columnWidth = useMemo(() => {
    const screenW = Math.min(Dimensions.get('window').width, APP_MAX_WIDTH);
    const usable = screenW - 2 * CONTAINER_HORIZONTAL_PADDING;
    return (usable - DAY_GAP * (DAYS_VISIBLE - 1)) / DAYS_VISIBLE;
  }, []);

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
      <View style={styles.headerWrap}>
        <View style={styles.headerRow}>
          <Text style={styles.header}>Kurs-Kalender</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <Pressable onPress={onRefresh} hitSlop={8}>
              {refreshing ? (
                <ActivityIndicator size="small" color={Colors.accent} />
              ) : (
                <RefreshCw size={18} color={Colors.accent} />
              )}
            </Pressable>
            <Pressable onPress={() => router.push('/my-bookings')}>
              <Text style={styles.link}>Meine Buchungen</Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.subHeader}>7 Tage ab heute · zum Scrollen wischen</Text>

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
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hScrollContent}
      >
        {days.map(day => (
          <DayColumn
            key={day.key}
            day={day}
            columnWidth={columnWidth}
            onPress={openAction}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  headerWrap: { paddingHorizontal: CONTAINER_HORIZONTAL_PADDING, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  header: { color: Colors.text, fontSize: 20, fontWeight: '700' },
  subHeader: { color: Colors.textMuted, fontSize: 12, marginTop: 2, marginBottom: Spacing.md },
  link: { color: Colors.accent, fontWeight: '600' },

  hScrollContent: {
    paddingHorizontal: CONTAINER_HORIZONTAL_PADDING,
    paddingBottom: Spacing.xxl + Spacing.lg,
    paddingTop: Spacing.sm,
  },

  colHeader: {
    marginBottom: Spacing.sm,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  colHeaderDow: { color: Colors.text, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  colHeaderDate: { color: Colors.textMuted, fontSize: 11, marginTop: 1 },

  emptyColText: { color: Colors.textMuted, fontSize: 11, fontStyle: 'italic', paddingVertical: Spacing.sm },

  gridTile: {
    borderRadius: BorderRadius.sm,
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 78,
    gap: 2,
  },
  gridTime: { fontSize: 13, fontWeight: '800' },
  gridName: { fontSize: 13, fontWeight: '700', lineHeight: 15 },
  gridMeta: { fontSize: 10, fontWeight: '500' },
  gridBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    marginTop: 2,
  },
  gridBadgeText: { fontSize: 9, fontWeight: '700' },

  blockedBanner: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: '#3a1515', padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md, alignItems: 'center' },
  blockedText: { color: Colors.text, flex: 1 },
  warnBanner: { backgroundColor: '#3a2f15', padding: Spacing.sm, borderRadius: BorderRadius.sm, marginBottom: Spacing.md },
  warnText: { color: Colors.warning, textAlign: 'center' },

  trainerMenu: { padding: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xxl + Spacing.lg, gap: Spacing.md },
  menuTitle: { color: Colors.text, fontSize: 22, fontWeight: '700', marginBottom: Spacing.md },
  menuBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, padding: Spacing.lg, borderRadius: BorderRadius.md },
  menuBtnText: { color: Colors.text, fontSize: 16, fontWeight: '600' },
});
