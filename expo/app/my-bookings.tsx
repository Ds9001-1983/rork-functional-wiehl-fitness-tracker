import React, { useCallback, useEffect, useState } from 'react';
import { Text, StyleSheet, ScrollView, Pressable, RefreshControl, Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCourses } from '@/hooks/use-courses';
import { trpcClient } from '@/lib/trpc';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { confirmAlert, infoAlert } from '@/lib/alert';

function formatDe(iso: string) {
  return new Date(iso).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function MyBookingsScreen() {
  const { myBookings, refresh, cancelBooking, leaveWaitlist } = useCourses();
  const [refreshing, setRefreshing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!showHistory) return;
    trpcClient.courses.customer.myBookings.query({ includeHistory: true })
      .then(r => setHistory(r.bookings.filter((b: any) => {
        const future = new Date(b.instance.start_time).getTime() > Date.now();
        return !future || b.booking.status !== 'booked';
      })))
      .catch(() => {});
  }, [showHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await refresh(); setRefreshing(false);
  }, [refresh]);

  const handleCancel = (bookingId: string, startIso: string) => {
    const late = new Date(startIso).getTime() - Date.now() < 2 * 60 * 60 * 1000;
    confirmAlert(
      'Buchung stornieren?',
      late ? '⚠️ Weniger als 2h vor Start — wird als No-Show gewertet!' : 'Du kannst stornieren.',
      async () => { try { await cancelBooking(bookingId); } catch (e: any) { infoAlert('Fehler', e?.message); } },
      { confirmLabel: 'Stornieren', destructive: true }
    );
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        contentContainerStyle={{ padding: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.xxl + Spacing.lg }}
      >
        <Text style={styles.sectionHeader}>Aktive Buchungen</Text>
        {!myBookings?.bookings.length && <Text style={styles.empty}>Keine aktiven Buchungen.</Text>}
        {myBookings?.bookings.map(({ booking, instance, course }) => (
          <View key={booking.id} style={styles.card}>
            <Text style={styles.name}>{course?.name ?? 'Kurs'}</Text>
            <Text style={styles.time}>{formatDe(instance.start_time)}</Text>
            <Pressable style={styles.cancelBtn} onPress={() => handleCancel(booking.id, instance.start_time)}>
              <Text style={styles.cancelText}>Stornieren</Text>
            </Pressable>
          </View>
        ))}

        <Text style={styles.sectionHeader}>Warteliste</Text>
        {!myBookings?.waitlist.length && <Text style={styles.empty}>Keine Wartelisten-Einträge.</Text>}
        {myBookings?.waitlist.map(({ entry, instance, course }) => (
          <View key={entry.id} style={[styles.card, { borderLeftColor: Colors.warning, borderLeftWidth: 4 }]}>
            <Text style={styles.name}>{course?.name ?? 'Kurs'}</Text>
            <Text style={styles.time}>{formatDe(instance.start_time)}</Text>
            {entry.last_notified_at && <Text style={styles.notified}>✓ Du wurdest benachrichtigt — jetzt buchen!</Text>}
            <Pressable style={styles.cancelBtn} onPress={async () => {
              try { await leaveWaitlist(instance.id); } catch (e: any) { infoAlert('Fehler', e?.message); }
            }}>
              <Text style={styles.cancelText}>Warteliste verlassen</Text>
            </Pressable>
          </View>
        ))}

        <Pressable onPress={() => setShowHistory(s => !s)} style={styles.historyToggle}>
          <Text style={styles.historyToggleText}>{showHistory ? '▾' : '▸'} Historie</Text>
        </Pressable>
        {showHistory && (
          history.length === 0
            ? <Text style={styles.empty}>Keine vergangenen Buchungen.</Text>
            : history.map(({ booking, instance, course }) => (
              <View key={booking.id} style={[styles.card, { opacity: 0.7 }]}>
                <Text style={styles.name}>{course?.name ?? 'Kurs'}</Text>
                <Text style={styles.time}>{formatDe(instance.start_time)}</Text>
                <Text style={[styles.notified, { color: booking.status === 'no_show' ? Colors.error : Colors.textMuted }]}>
                  Status: {booking.status}
                </Text>
              </View>
            ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  sectionHeader: { color: Colors.text, fontSize: 18, fontWeight: '700', marginTop: Spacing.lg, marginBottom: Spacing.sm },
  empty: { color: Colors.textSecondary, marginBottom: Spacing.md },
  card: { backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.sm },
  name: { color: Colors.text, fontWeight: '700', fontSize: 16 },
  time: { color: Colors.textSecondary, marginTop: 4 },
  notified: { color: Colors.warning, marginTop: Spacing.sm, fontWeight: '600' },
  cancelBtn: { backgroundColor: Colors.error, padding: Spacing.sm, borderRadius: BorderRadius.sm, marginTop: Spacing.sm, alignItems: 'center' },
  cancelText: { color: Colors.text, fontWeight: '700' },
  historyToggle: { marginTop: Spacing.lg, padding: Spacing.sm },
  historyToggleText: { color: Colors.accent, fontWeight: '600' },
});
