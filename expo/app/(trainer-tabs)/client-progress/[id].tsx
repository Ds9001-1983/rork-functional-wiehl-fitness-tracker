import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { TrendingUp, Calendar, Target, Flame, Dumbbell, BarChart3, ClipboardList, ChevronRight, History, Plus, X, Search } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { trpcClient } from '@/lib/trpc';
import StatusBanner from '@/components/StatusBanner';
import { confirmAlert, infoAlert } from '@/lib/alert';

interface WorkoutListItem {
  id: string;
  name: string;
  date: string;
  duration?: number;
  exercises?: unknown[];
}

interface PlanListItem {
  id: string;
  name: string;
  description?: string;
  exercises?: unknown[];
  isInstance?: boolean;
  templateId?: string | null;
  assignedUserId?: string | null;
}

export default function ClientProgressScreen() {
  const { id: clientId } = useLocalSearchParams<{ id: string }>();
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<any>(null);
  const [clientName, setClientName] = useState('');
  const [realUserId, setRealUserId] = useState<string | null>(null);
  const [clientWorkouts, setClientWorkouts] = useState<WorkoutListItem[]>([]);
  const [clientPlans, setClientPlans] = useState<PlanListItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Plan-zuweisen Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [templates, setTemplates] = useState<PlanListItem[]>([]);
  const [templateSearch, setTemplateSearch] = useState('');
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async () => {
    if (!clientId) return;
    try {
      const [progressData, clients] = await Promise.all([
        trpcClient.clients.progress.query({ clientId }),
        trpcClient.clients.list.query(),
      ]);
      setProgress(progressData);
      const client = (clients as any[]).find((c: any) => c.id === clientId || c.userId === clientId);
      const userId = client?.userId || clientId;
      setRealUserId(userId);
      if (client) setClientName(client.name);

      const [workouts, plans] = await Promise.all([
        trpcClient.workouts.list.query({ userId }).catch((err) => {
          console.error('[ClientProgress] Workouts-Load fehlgeschlagen:', err);
          return [];
        }),
        trpcClient.plans.list.query({ userId }).catch((err) => {
          console.error('[ClientProgress] Plans-Load fehlgeschlagen:', err);
          return [];
        }),
      ]);
      setClientWorkouts((workouts as WorkoutListItem[]) || []);
      setClientPlans((plans as PlanListItem[]) || []);
    } catch (err) {
      console.error('[ClientProgress] Ladefehler:', err);
      setLoadError('Die Kundendaten konnten nicht geladen werden. Bitte Verbindung prüfen und erneut versuchen.');
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const openAssignModal = useCallback(async () => {
    setShowAssignModal(true);
    setTemplateSearch('');
    try {
      // Eigene Plans des Trainers (Templates und Instances), filtern auf Templates
      const all = (await trpcClient.plans.list.query({})) as PlanListItem[];
      setTemplates(all.filter(p => !p.isInstance));
    } catch (err) {
      console.error('[ClientProgress] Templates-Load fehlgeschlagen:', err);
      setTemplates([]);
    }
  }, []);

  const filteredTemplates = useMemo(() => {
    const q = templateSearch.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(t => t.name.toLowerCase().includes(q));
  }, [templates, templateSearch]);

  const assignTemplate = useCallback((templateId: string, templateName: string) => {
    if (!realUserId) return;
    confirmAlert(
      'Plan zuweisen?',
      `"${templateName}" wird ${clientName} als persönliche Kopie zugewiesen. Du kannst sie danach individuell anpassen, ohne das Original zu verändern.`,
      async () => {
        setAssigning(true);
        try {
          await trpcClient.plans.instantiate.mutate({ templateId, userIds: [realUserId] });
          setShowAssignModal(false);
          await load();
          infoAlert('Zugewiesen', `${clientName} hat den Plan "${templateName}" erhalten.`);
        } catch (e: any) {
          infoAlert('Fehler', e?.message || 'Zuweisung fehlgeschlagen.');
        } finally {
          setAssigning(false);
        }
      },
      { confirmLabel: 'Zuweisen' },
    );
  }, [realUserId, clientName, load]);

  const getComplianceColor = (rate: number) => {
    if (rate >= 80) return Colors.success;
    if (rate >= 50) return Colors.warning;
    return Colors.error;
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Fortschritt' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      </>
    );
  }

  if (!progress) {
    return (
      <>
        <Stack.Screen options={{ title: 'Fortschritt' }} />
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>Keine Daten verfügbar</Text>
        </View>
      </>
    );
  }

  const maxVolume = Math.max(...progress.weeklyData.map((w: any) => w.volume), 1);
  const recentWorkoutsSorted = [...clientWorkouts]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <>
      <Stack.Screen options={{ title: clientName || 'Fortschritt' }} />
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {loadError && (
            <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
              <StatusBanner type="error" text={loadError} onDismiss={() => setLoadError(null)} />
            </View>
          )}
          <View style={styles.header}>
            <Text style={styles.title}>{clientName}</Text>
            <Text style={styles.subtitle}>Letzte 4 Wochen</Text>
          </View>

          {/* Tiles: Workouts + Pläne — prominent oben */}
          <View style={styles.tilesRow}>
            <View style={styles.tileCard}>
              <View style={styles.tileHeader}>
                <History size={18} color={Colors.accent} />
                <Text style={styles.tileTitle}>Letzte Workouts</Text>
                <Text style={styles.tileBadge}>{clientWorkouts.length}</Text>
              </View>
              {recentWorkoutsSorted.length === 0 ? (
                <Text style={styles.tileEmpty}>Noch keine Workouts.</Text>
              ) : (
                recentWorkoutsSorted.slice(0, 3).map((w) => (
                  <TouchableOpacity
                    key={w.id}
                    style={styles.tileItem}
                    onPress={() => router.push(`/workout-detail/${w.id}` as any)}
                  >
                    <Dumbbell size={14} color={Colors.accent} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tileItemTitle} numberOfLines={1}>{w.name}</Text>
                      <Text style={styles.tileItemMeta}>{new Date(w.date).toLocaleDateString('de-DE')}</Text>
                    </View>
                    <ChevronRight size={14} color={Colors.textMuted} />
                  </TouchableOpacity>
                ))
              )}
              {clientWorkouts.length > 3 && (
                <Text style={styles.tileMore}>+ {clientWorkouts.length - 3} weitere</Text>
              )}
            </View>

            <View style={styles.tileCard}>
              <View style={styles.tileHeader}>
                <ClipboardList size={18} color={Colors.accent} />
                <Text style={styles.tileTitle}>Trainingspläne</Text>
                <Text style={styles.tileBadge}>{clientPlans.length}</Text>
              </View>
              {clientPlans.length === 0 ? (
                <Text style={styles.tileEmpty}>Keine Pläne zugewiesen.</Text>
              ) : (
                clientPlans.slice(0, 3).map((p) => {
                  const exCount = p.exercises ? (p.exercises as unknown[]).length : 0;
                  const tag = p.isInstance ? 'Persönlich' : 'Vorlage';
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={styles.tileItem}
                      onPress={() => router.push(`/trainer-plan-edit/${p.id}` as any)}
                    >
                      <ClipboardList size={14} color={Colors.accent} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tileItemTitle} numberOfLines={1}>{p.name}</Text>
                        <Text style={styles.tileItemMeta}>
                          {exCount} Übungen · {tag}
                        </Text>
                      </View>
                      <ChevronRight size={14} color={Colors.textMuted} />
                    </TouchableOpacity>
                  );
                })
              )}
              {clientPlans.length > 3 && (
                <Text style={styles.tileMore}>+ {clientPlans.length - 3} weitere</Text>
              )}
              <TouchableOpacity style={styles.assignBtn} onPress={openAssignModal}>
                <Plus size={14} color={Colors.text} />
                <Text style={styles.assignBtnText}>Plan zuweisen</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Key Metrics */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={styles.metricIcon}>
                <Target size={20} color={getComplianceColor(progress.complianceRate)} />
              </View>
              <Text style={[styles.metricValue, { color: getComplianceColor(progress.complianceRate) }]}>
                {progress.complianceRate}%
              </Text>
              <Text style={styles.metricLabel}>Compliance</Text>
            </View>
            <View style={styles.metricCard}>
              <View style={styles.metricIcon}>
                <Dumbbell size={20} color={Colors.accent} />
              </View>
              <Text style={styles.metricValue}>{progress.recentWorkouts}</Text>
              <Text style={styles.metricLabel}>Workouts (4W)</Text>
            </View>
            <View style={styles.metricCard}>
              <View style={styles.metricIcon}>
                <Flame size={20} color={Colors.warning} />
              </View>
              <Text style={styles.metricValue}>{progress.currentStreak}</Text>
              <Text style={styles.metricLabel}>Streak</Text>
            </View>
            <View style={styles.metricCard}>
              <View style={styles.metricIcon}>
                <Calendar size={20} color={Colors.textSecondary} />
              </View>
              <Text style={styles.metricValue}>{progress.assignedPlans}</Text>
              <Text style={styles.metricLabel}>Pläne</Text>
            </View>
          </View>

          {/* Weekly Chart */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <BarChart3 size={20} color={Colors.accent} />
              <Text style={styles.sectionTitle}>Wöchentliches Volumen</Text>
            </View>
            <View style={styles.weekChart}>
              {progress.weeklyData.map((week: any, i: number) => (
                <View key={i} style={styles.weekColumn}>
                  <View style={styles.weekBarContainer}>
                    <View style={[styles.weekBar, { height: Math.max((week.volume / maxVolume) * 80, 2) }]} />
                  </View>
                  <Text style={styles.weekLabel}>{week.weekLabel}</Text>
                  <Text style={styles.weekValue}>{week.workoutCount}x</Text>
                  {week.volume > 0 && (
                    <Text style={styles.weekVolume}>{(week.volume / 1000).toFixed(1)}t</Text>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Last Activity */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={20} color={Colors.accent} />
              <Text style={styles.sectionTitle}>Zusammenfassung</Text>
            </View>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Gesamt Workouts</Text>
                <Text style={styles.summaryValue}>{progress.totalWorkouts}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Letztes Training</Text>
                <Text style={styles.summaryValue}>
                  {progress.lastWorkoutDate
                    ? new Date(progress.lastWorkoutDate).toLocaleDateString('de-DE')
                    : 'Noch nie'}
                </Text>
              </View>
            </View>
          </View>

          {/* Alle Workouts (Details, erweitert) — nur wenn mehr als 3 vorhanden */}
          {clientWorkouts.length > 3 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <History size={20} color={Colors.accent} />
              <Text style={styles.sectionTitle}>Alle Workouts</Text>
            </View>
            {recentWorkoutsSorted.map((w) => (
                <TouchableOpacity
                  key={w.id}
                  style={styles.listCard}
                  onPress={() => router.push(`/workout-detail/${w.id}` as any)}
                >
                  <Dumbbell size={18} color={Colors.accent} />
                  <View style={styles.listCardInfo}>
                    <Text style={styles.listCardTitle}>{w.name}</Text>
                    <Text style={styles.listCardMeta}>
                      {new Date(w.date).toLocaleDateString('de-DE')}
                      {w.exercises ? ` · ${(w.exercises as unknown[]).length} Übungen` : ''}
                      {w.duration ? ` · ${w.duration} min` : ''}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
          </View>
          )}

          {/* Alle Pläne (erweitert) — nur wenn mehr als 3 */}
          {clientPlans.length > 3 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ClipboardList size={20} color={Colors.accent} />
              <Text style={styles.sectionTitle}>Alle Trainingspläne</Text>
            </View>
            {clientPlans.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.listCard}
                  onPress={() => router.push(`/trainer-plan-edit/${p.id}` as any)}
                >
                  <ClipboardList size={18} color={Colors.accent} />
                  <View style={styles.listCardInfo}>
                    <Text style={styles.listCardTitle}>{p.name}</Text>
                    <Text style={styles.listCardMeta}>
                      {p.exercises ? `${(p.exercises as unknown[]).length} Übungen` : ''}
                      {p.isInstance ? ' · Persönliche Instanz' : ' · Template'}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
          </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Plan zuweisen Modal */}
        <Modal visible={showAssignModal} animationType="slide" transparent onRequestClose={() => setShowAssignModal(false)}>
          <View style={styles.modalBg}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Plan zuweisen</Text>
                <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                  <X size={22} color={Colors.text} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalHint}>Wähle eine Vorlage. Sie wird als persönliche Kopie für {clientName} erstellt.</Text>
              <View style={styles.searchRow}>
                <Search size={18} color={Colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  value={templateSearch}
                  onChangeText={setTemplateSearch}
                  placeholder="Vorlage suchen…"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <ScrollView style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">
                {filteredTemplates.length === 0 ? (
                  <Text style={styles.emptyCardText}>Keine Vorlagen gefunden.</Text>
                ) : (
                  filteredTemplates.map((t) => {
                    const exCount = t.exercises ? (t.exercises as unknown[]).length : 0;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        style={styles.pickRow}
                        onPress={() => assignTemplate(t.id, t.name)}
                        disabled={assigning}
                      >
                        <ClipboardList size={16} color={Colors.accent} />
                        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                          <Text style={styles.pickName}>{t.name}</Text>
                          <Text style={styles.pickMeta}>{exCount} Übungen</Text>
                        </View>
                        <Plus size={16} color={Colors.textSecondary} />
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
              {assigning && (
                <View style={{ paddingTop: Spacing.sm, alignItems: 'center' }}>
                  <ActivityIndicator color={Colors.accent} />
                </View>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const createStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, color: Colors.textMuted },
  header: { padding: Spacing.lg, paddingTop: Spacing.md },
  title: { fontSize: 24, fontWeight: '700' as const, color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  metricCard: { flexBasis: '47%', flexGrow: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  metricIcon: { marginBottom: Spacing.xs },
  metricValue: { fontSize: 24, fontWeight: '700' as const, color: Colors.accent },
  metricLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  section: { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: '600' as const, color: Colors.text },
  weekChart: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  weekColumn: { flex: 1, alignItems: 'center' },
  weekBarContainer: { height: 80, justifyContent: 'flex-end', marginBottom: Spacing.xs },
  weekBar: { width: 30, backgroundColor: Colors.accent, borderRadius: BorderRadius.sm },
  weekLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' as const },
  weekValue: { fontSize: 12, color: Colors.accent, fontWeight: '600' as const, marginTop: 2 },
  weekVolume: { fontSize: 10, color: Colors.textMuted },
  summaryCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  summaryLabel: { fontSize: 14, color: Colors.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '600' as const, color: Colors.text },
  listCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm },
  listCardInfo: { flex: 1 },
  listCardTitle: { fontSize: 15, fontWeight: '600' as const, color: Colors.text },
  listCardMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  emptyCard: { backgroundColor: Colors.surface, padding: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  emptyCardText: { color: Colors.textMuted, fontSize: 14 },
  tilesRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, gap: Spacing.md, marginTop: Spacing.md },
  tileCard: { flex: 1, minWidth: 220, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  tileHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tileTitle: { flex: 1, fontSize: 15, fontWeight: '600' as const, color: Colors.text },
  tileBadge: { backgroundColor: Colors.accent, color: Colors.text, fontSize: 12, fontWeight: '700' as const, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full, minWidth: 24, textAlign: 'center' as const },
  tileEmpty: { color: Colors.textMuted, fontSize: 12, fontStyle: 'italic' as const, paddingVertical: Spacing.sm },
  tileItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  tileItemTitle: { fontSize: 13, fontWeight: '500' as const, color: Colors.text },
  tileItemMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  tileMore: { fontSize: 11, color: Colors.accent, marginTop: Spacing.xs, fontStyle: 'italic' as const },
  assignBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: Spacing.sm, paddingVertical: Spacing.sm, backgroundColor: Colors.accent, borderRadius: BorderRadius.sm },
  assignBtnText: { color: Colors.text, fontSize: 13, fontWeight: '700' as const },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: Spacing.md },
  modal: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, maxWidth: 560, alignSelf: 'center' as const, width: '100%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  modalTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text },
  modalHint: { fontSize: 12, color: Colors.textSecondary, marginBottom: Spacing.sm, lineHeight: 16 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, marginBottom: Spacing.sm, gap: Spacing.sm },
  searchInput: { flex: 1, padding: Spacing.sm, color: Colors.text, fontSize: 14 },
  pickRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pickName: { color: Colors.text, fontSize: 14, fontWeight: '500' as const },
  pickMeta: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
});
