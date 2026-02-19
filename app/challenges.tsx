import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { Trophy, Plus, X, Users, Target, Flame, TrendingUp } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { trpcClient } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';
import StatusBanner from '@/components/StatusBanner';

const CHALLENGE_TYPES = [
  { id: 'workout_count', label: 'Workout-Anzahl', icon: Target, unit: 'Workouts' },
  { id: 'total_volume', label: 'Gesamtvolumen (kg)', icon: TrendingUp, unit: 'kg' },
  { id: 'streak', label: 'Streak-Laenge', icon: Flame, unit: 'Tage' },
];

export default function ChallengesScreen() {
  const { user } = useAuth();
  const isTrainer = user?.role === 'trainer' || user?.role === 'admin';
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Create form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('workout_count');
  const [target, setTarget] = useState('');
  const [endDays, setEndDays] = useState('7');

  const loadChallenges = useCallback(async () => {
    try {
      const data = await trpcClient.challenges.list.query();
      setChallenges(data);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadChallenges(); }, [loadChallenges]);

  const handleCreate = async () => {
    if (!name.trim() || !target) return;
    try {
      const now = new Date();
      const end = new Date(now.getTime() + parseInt(endDays) * 86400000);
      await trpcClient.challenges.create.mutate({
        name: name.trim(),
        description: description.trim(),
        type,
        target: parseInt(target),
        startDate: now.toISOString(),
        endDate: end.toISOString(),
      });
      setShowCreate(false);
      setName(''); setDescription(''); setTarget('');
      setStatusMessage({ type: 'success', text: 'Challenge erstellt!' });
      loadChallenges();
    } catch {
      setStatusMessage({ type: 'error', text: 'Fehler beim Erstellen.' });
    }
  };

  const handleJoin = async (challengeId: string) => {
    try {
      await trpcClient.challenges.join.mutate({ challengeId });
      setStatusMessage({ type: 'success', text: 'Du bist dabei!' });
      loadChallenges();
    } catch {
      setStatusMessage({ type: 'error', text: 'Fehler beim Beitreten.' });
    }
  };

  const getDaysLeft = (endDate: string) => {
    const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
    return days > 0 ? `${days} Tage uebrig` : 'Beendet';
  };

  const typeInfo = (t: string) => CHALLENGE_TYPES.find(ct => ct.id === t) || CHALLENGE_TYPES[0];

  return (
    <>
      <Stack.Screen options={{ title: 'Challenges' }} />
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Trophy size={32} color={Colors.accent} />
            <Text style={styles.title}>Studio-Challenges</Text>
            <Text style={styles.subtitle}>Tritt gegen andere Mitglieder an!</Text>
          </View>

          {statusMessage && (
            <View style={{ marginHorizontal: Spacing.lg }}>
              <StatusBanner type={statusMessage.type} text={statusMessage.text} onDismiss={() => setStatusMessage(null)} />
            </View>
          )}

          {loadError && !loading && (
            <View style={{ marginHorizontal: Spacing.lg }}>
              <StatusBanner type="info" text="Verbindungsfehler — Challenges konnten nicht geladen werden." autoDismiss={0} />
            </View>
          )}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.accent} />
              <Text style={styles.loadingText}>Challenges werden geladen...</Text>
            </View>
          ) : challenges.length === 0 ? (
            <View style={styles.emptyState}>
              <Users size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Keine aktiven Challenges</Text>
              {isTrainer && <Text style={styles.emptySubtext}>Erstelle die erste Challenge fuer dein Studio!</Text>}
            </View>
          ) : (
            challenges.map(challenge => {
              const info = typeInfo(challenge.type);
              const Icon = info.icon;
              return (
                <View key={challenge.id} style={styles.challengeCard}>
                  <View style={styles.challengeHeader}>
                    <Icon size={20} color={Colors.accent} />
                    <Text style={styles.challengeName}>{challenge.name}</Text>
                  </View>
                  {challenge.description ? <Text style={styles.challengeDesc}>{challenge.description}</Text> : null}
                  <View style={styles.challengeMeta}>
                    <Text style={styles.metaText}>Ziel: {challenge.target} {info.unit}</Text>
                    <Text style={styles.metaText}>{getDaysLeft(challenge.endDate)}</Text>
                  </View>
                  <TouchableOpacity style={styles.joinButton} onPress={() => handleJoin(challenge.id)}>
                    <Text style={styles.joinButtonText}>Teilnehmen</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}

          {isTrainer && (
            <TouchableOpacity style={styles.createButton} onPress={() => setShowCreate(true)}>
              <Plus size={20} color={Colors.text} />
              <Text style={styles.createButtonText}>Neue Challenge erstellen</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Create Modal */}
        <Modal visible={showCreate} animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Neue Challenge</Text>
              <TouchableOpacity onPress={handleCreate}>
                <Text style={styles.saveButton}>Erstellen</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <TextInput style={styles.input} placeholder="Challenge-Name" placeholderTextColor={Colors.textMuted} value={name} onChangeText={setName} />
              <TextInput style={styles.input} placeholder="Beschreibung (optional)" placeholderTextColor={Colors.textMuted} value={description} onChangeText={setDescription} multiline />

              <Text style={styles.label}>Typ</Text>
              {CHALLENGE_TYPES.map(ct => (
                <TouchableOpacity key={ct.id} style={[styles.typeOption, type === ct.id && styles.typeOptionActive]} onPress={() => setType(ct.id)}>
                  <ct.icon size={18} color={type === ct.id ? Colors.accent : Colors.textSecondary} />
                  <Text style={[styles.typeLabel, type === ct.id && styles.typeLabelActive]}>{ct.label}</Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.label}>Ziel ({typeInfo(type).unit})</Text>
              <TextInput style={styles.input} placeholder="z.B. 10" placeholderTextColor={Colors.textMuted} value={target} onChangeText={setTarget} keyboardType="numeric" />

              <Text style={styles.label}>Dauer (Tage)</Text>
              <View style={styles.daysRow}>
                {['7', '14', '30'].map(d => (
                  <TouchableOpacity key={d} style={[styles.dayChip, endDays === d && styles.dayChipActive]} onPress={() => setEndDays(d)}>
                    <Text style={[styles.dayChipText, endDays === d && styles.dayChipTextActive]}>{d} Tage</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xxl * 2, gap: Spacing.md },
  loadingText: { color: Colors.textSecondary, fontSize: 14 },
  header: { alignItems: 'center', padding: Spacing.lg, paddingTop: Spacing.xl },
  title: { fontSize: 24, fontWeight: '700' as const, color: Colors.text, marginTop: Spacing.sm },
  subtitle: { fontSize: 14, color: Colors.textSecondary },
  emptyState: { alignItems: 'center', padding: Spacing.xxl, marginHorizontal: Spacing.lg, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  emptyText: { fontSize: 18, fontWeight: '600' as const, color: Colors.textSecondary, marginTop: Spacing.md },
  emptySubtext: { fontSize: 14, color: Colors.textMuted, marginTop: Spacing.sm, textAlign: 'center' },
  challengeCard: { backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginBottom: Spacing.md, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  challengeHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  challengeName: { fontSize: 17, fontWeight: '600' as const, color: Colors.text },
  challengeDesc: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.sm },
  challengeMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  metaText: { fontSize: 13, color: Colors.textMuted },
  joinButton: { backgroundColor: Colors.accent, borderRadius: BorderRadius.sm, padding: Spacing.sm, alignItems: 'center' },
  joinButtonText: { color: Colors.text, fontWeight: '600' as const },
  createButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.accent, marginHorizontal: Spacing.lg, padding: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.md, gap: Spacing.sm },
  createButtonText: { color: Colors.text, fontSize: 16, fontWeight: '600' as const },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 18, fontWeight: '600' as const, color: Colors.text },
  saveButton: { fontSize: 16, color: Colors.accent, fontWeight: '600' as const },
  modalBody: { flex: 1, padding: Spacing.lg },
  input: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, color: Colors.text, fontSize: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md },
  label: { fontSize: 14, fontWeight: '600' as const, color: Colors.text, marginBottom: Spacing.sm, marginTop: Spacing.sm },
  typeOption: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  typeOptionActive: { borderColor: Colors.accent },
  typeLabel: { fontSize: 15, color: Colors.textSecondary },
  typeLabelActive: { color: Colors.accent, fontWeight: '600' as const },
  daysRow: { flexDirection: 'row', gap: Spacing.sm },
  dayChip: { flex: 1, padding: Spacing.sm, borderRadius: BorderRadius.sm, backgroundColor: Colors.surface, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  dayChipActive: { borderColor: Colors.accent, backgroundColor: Colors.accent + '15' },
  dayChipText: { fontSize: 14, color: Colors.textSecondary },
  dayChipTextActive: { color: Colors.accent, fontWeight: '600' as const },
});
