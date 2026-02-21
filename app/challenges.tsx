import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { Trophy, Plus, X, Users, Target, Flame, TrendingUp, ChevronDown, ChevronUp, Check, Crown, Medal } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { trpcClient } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';
import StatusBanner from '@/components/StatusBanner';

const CHALLENGE_TYPES = [
  { id: 'workout_count', label: 'Workout-Anzahl', icon: Target, unit: 'Workouts' },
  { id: 'total_volume', label: 'Gesamtvolumen (kg)', icon: TrendingUp, unit: 'kg' },
  { id: 'streak', label: 'Streak-Länge', icon: Flame, unit: 'Tage' },
];

interface ChallengeProgress {
  userId: string;
  currentValue: number;
  name?: string;
}

export default function ChallengesScreen() {
  const { user } = useAuth();
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const isTrainer = user?.role === 'trainer' || user?.role === 'admin';
  const [challenges, setChallenges] = useState<any[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, ChallengeProgress[]>>({});
  const [expandedChallenges, setExpandedChallenges] = useState<Record<string, boolean>>({});
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

      // Auto-refresh user's progress
      try {
        await trpcClient.challenges.refreshProgress.mutate();
      } catch { /* ignore */ }

      // Fetch progress for each challenge
      const progressEntries: Record<string, ChallengeProgress[]> = {};
      await Promise.all(
        data.map(async (c: any) => {
          try {
            const progress = await trpcClient.challenges.progress.query({ challengeId: c.id });
            progressEntries[c.id] = progress;
          } catch { /* ignore */ }
        })
      );
      setProgressMap(progressEntries);
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
      setStatusMessage({ type: 'success', text: 'Du bist dabei! Dein Fortschritt wird automatisch getrackt.' });
      loadChallenges();
    } catch {
      setStatusMessage({ type: 'error', text: 'Fehler beim Beitreten.' });
    }
  };

  const toggleExpanded = (challengeId: string) => {
    setExpandedChallenges(prev => ({ ...prev, [challengeId]: !prev[challengeId] }));
  };

  const getDaysLeft = (endDate: string) => {
    const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
    return days > 0 ? `${days} Tage uebrig` : 'Beendet';
  };

  const isEnded = (endDate: string) => {
    return new Date(endDate).getTime() < Date.now();
  };

  const typeInfo = (t: string) => CHALLENGE_TYPES.find(ct => ct.id === t) || CHALLENGE_TYPES[0];

  const getUserProgress = (challengeId: string): ChallengeProgress | undefined => {
    return progressMap[challengeId]?.find(p => p.userId === user?.id);
  };

  const isJoined = (challengeId: string): boolean => {
    return !!getUserProgress(challengeId);
  };

  const formatValue = (value: number, challengeType: string) => {
    if (challengeType === 'total_volume') {
      return value >= 1000 ? `${(value / 1000).toFixed(1)}t` : `${value}kg`;
    }
    return value.toString();
  };

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Crown size={14} color={Colors.warning} />;
    if (rank === 1) return <Medal size={14} color="#C0C0C0" />;
    if (rank === 2) return <Medal size={14} color="#CD7F32" />;
    return null;
  };

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
              {isTrainer && <Text style={styles.emptySubtext}>Erstelle die erste Challenge für dein Studio!</Text>}
            </View>
          ) : (
            challenges.map(challenge => {
              const info = typeInfo(challenge.type);
              const Icon = info.icon;
              const joined = isJoined(challenge.id);
              const userProg = getUserProgress(challenge.id);
              const participants = progressMap[challenge.id] || [];
              const progressPercent = userProg ? Math.min(100, Math.round((userProg.currentValue / challenge.target) * 100)) : 0;
              const ended = isEnded(challenge.endDate);
              const expanded = expandedChallenges[challenge.id];
              const isComplete = userProg && userProg.currentValue >= challenge.target;

              return (
                <View key={challenge.id} style={[styles.challengeCard, ended && styles.challengeCardEnded]}>
                  {/* Header */}
                  <View style={styles.challengeHeader}>
                    <Icon size={20} color={isComplete ? Colors.success : Colors.accent} />
                    <Text style={styles.challengeName} numberOfLines={1}>{challenge.name}</Text>
                    {isComplete && <Check size={18} color={Colors.success} />}
                  </View>

                  {challenge.description ? <Text style={styles.challengeDesc}>{challenge.description}</Text> : null}

                  {/* Meta row */}
                  <View style={styles.challengeMeta}>
                    <Text style={styles.metaText}>Ziel: {formatValue(challenge.target, challenge.type)} {challenge.type !== 'total_volume' ? info.unit : ''}</Text>
                    <Text style={[styles.metaText, ended && { color: Colors.error }]}>{getDaysLeft(challenge.endDate)}</Text>
                  </View>

                  {/* Progress section (if joined) */}
                  {joined && userProg && (
                    <View style={styles.progressSection}>
                      <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>
                          Dein Fortschritt
                        </Text>
                        <Text style={[styles.progressValue, isComplete && { color: Colors.success }]}>
                          {formatValue(userProg.currentValue, challenge.type)} / {formatValue(challenge.target, challenge.type)}
                        </Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${progressPercent}%`,
                              backgroundColor: isComplete ? Colors.success : Colors.accent,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressPercent}>{progressPercent}%</Text>
                    </View>
                  )}

                  {/* Participant count + toggle */}
                  {participants.length > 0 && (
                    <TouchableOpacity style={styles.participantsToggle} onPress={() => toggleExpanded(challenge.id)}>
                      <Users size={14} color={Colors.textMuted} />
                      <Text style={styles.participantsCount}>
                        {participants.length} Teilnehmer{participants.length !== 1 ? '' : ''}
                      </Text>
                      {expanded ? (
                        <ChevronUp size={16} color={Colors.textMuted} />
                      ) : (
                        <ChevronDown size={16} color={Colors.textMuted} />
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Expanded leaderboard */}
                  {expanded && participants.length > 0 && (
                    <View style={styles.leaderboard}>
                      {participants.map((p, idx) => {
                        const isCurrentUser = p.userId === user?.id;
                        const pPercent = Math.min(100, Math.round((p.currentValue / challenge.target) * 100));
                        const pComplete = p.currentValue >= challenge.target;
                        return (
                          <View key={p.userId} style={[styles.leaderboardRow, isCurrentUser && styles.leaderboardRowSelf]}>
                            <View style={styles.leaderboardRank}>
                              {getRankIcon(idx) || <Text style={styles.rankNumber}>{idx + 1}</Text>}
                            </View>
                            <Text style={[styles.leaderboardName, isCurrentUser && styles.leaderboardNameSelf]} numberOfLines={1}>
                              {isCurrentUser ? 'Du' : (p.name || `Teilnehmer ${idx + 1}`)}
                            </Text>
                            <View style={styles.leaderboardBarContainer}>
                              <View style={[styles.leaderboardBar, { width: `${pPercent}%`, backgroundColor: pComplete ? Colors.success : Colors.accent }]} />
                            </View>
                            <Text style={[styles.leaderboardValue, pComplete && { color: Colors.success }]}>
                              {formatValue(p.currentValue, challenge.type)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* Action button */}
                  {!ended && !joined && (
                    <TouchableOpacity style={styles.joinButton} onPress={() => handleJoin(challenge.id)}>
                      <Text style={styles.joinButtonText}>Teilnehmen</Text>
                    </TouchableOpacity>
                  )}
                  {joined && !ended && (
                    <View style={styles.joinedBadge}>
                      <Check size={14} color={Colors.success} />
                      <Text style={styles.joinedText}>Beigetreten</Text>
                    </View>
                  )}
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

const createStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xxl * 2, gap: Spacing.md },
  loadingText: { color: Colors.textSecondary, fontSize: 14 },
  header: { alignItems: 'center', padding: Spacing.lg, paddingTop: Spacing.xl },
  title: { fontSize: 24, fontWeight: '700' as const, color: Colors.text, marginTop: Spacing.sm },
  subtitle: { fontSize: 14, color: Colors.textSecondary },
  emptyState: { alignItems: 'center', padding: Spacing.xxl, marginHorizontal: Spacing.lg, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  emptyText: { fontSize: 18, fontWeight: '600' as const, color: Colors.textSecondary, marginTop: Spacing.md },
  emptySubtext: { fontSize: 14, color: Colors.textMuted, marginTop: Spacing.sm, textAlign: 'center' as const },
  challengeCard: { backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginBottom: Spacing.md, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  challengeCardEnded: { opacity: 0.7 },
  challengeHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: Spacing.sm, marginBottom: Spacing.xs },
  challengeName: { fontSize: 17, fontWeight: '600' as const, color: Colors.text, flex: 1 },
  challengeDesc: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.sm },
  challengeMeta: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: Spacing.sm },
  metaText: { fontSize: 13, color: Colors.textMuted },

  // Progress section
  progressSection: { backgroundColor: Colors.background, borderRadius: BorderRadius.sm, padding: Spacing.sm, marginBottom: Spacing.sm },
  progressHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: Spacing.xs },
  progressLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' as const },
  progressValue: { fontSize: 13, color: Colors.accent, fontWeight: '700' as const },
  progressBarBg: { height: 8, backgroundColor: Colors.surfaceLight, borderRadius: 4, overflow: 'hidden' as const },
  progressBarFill: { height: '100%' as const, borderRadius: 4, minWidth: 4 },
  progressPercent: { fontSize: 11, color: Colors.textMuted, textAlign: 'right' as const, marginTop: 2 },

  // Participants toggle
  participantsToggle: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: Spacing.xs, paddingVertical: Spacing.xs, marginBottom: Spacing.xs },
  participantsCount: { fontSize: 13, color: Colors.textMuted, flex: 1 },

  // Leaderboard
  leaderboard: { backgroundColor: Colors.background, borderRadius: BorderRadius.sm, padding: Spacing.sm, marginBottom: Spacing.sm },
  leaderboardRow: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: Spacing.xs, gap: Spacing.sm },
  leaderboardRowSelf: { backgroundColor: Colors.accent + '15', borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.xs },
  leaderboardRank: { width: 20, alignItems: 'center' as const },
  rankNumber: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' as const },
  leaderboardName: { fontSize: 13, color: Colors.text, width: 80 },
  leaderboardNameSelf: { fontWeight: '700' as const, color: Colors.accent },
  leaderboardBarContainer: { flex: 1, height: 6, backgroundColor: Colors.surfaceLight, borderRadius: 3, overflow: 'hidden' as const },
  leaderboardBar: { height: '100%' as const, borderRadius: 3, minWidth: 2 },
  leaderboardValue: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' as const, width: 50, textAlign: 'right' as const },

  // Buttons
  joinButton: { backgroundColor: Colors.accent, borderRadius: BorderRadius.sm, padding: Spacing.sm, alignItems: 'center' as const },
  joinButtonText: { color: Colors.text, fontWeight: '600' as const },
  joinedBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: Spacing.xs, paddingVertical: Spacing.xs },
  joinedText: { fontSize: 13, color: Colors.success, fontWeight: '500' as const },
  createButton: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: Colors.accent, marginHorizontal: Spacing.lg, padding: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.md, gap: Spacing.sm },
  createButtonText: { color: Colors.text, fontSize: 16, fontWeight: '600' as const },

  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 18, fontWeight: '600' as const, color: Colors.text },
  saveButton: { fontSize: 16, color: Colors.accent, fontWeight: '600' as const },
  modalBody: { flex: 1, padding: Spacing.lg },
  input: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, color: Colors.text, fontSize: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md },
  label: { fontSize: 14, fontWeight: '600' as const, color: Colors.text, marginBottom: Spacing.sm, marginTop: Spacing.sm },
  typeOption: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: Spacing.sm, padding: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  typeOptionActive: { borderColor: Colors.accent },
  typeLabel: { fontSize: 15, color: Colors.textSecondary },
  typeLabelActive: { color: Colors.accent, fontWeight: '600' as const },
  daysRow: { flexDirection: 'row' as const, gap: Spacing.sm },
  dayChip: { flex: 1, padding: Spacing.sm, borderRadius: BorderRadius.sm, backgroundColor: Colors.surface, alignItems: 'center' as const, borderWidth: 1, borderColor: Colors.border },
  dayChipActive: { borderColor: Colors.accent, backgroundColor: Colors.accent + '15' },
  dayChipText: { fontSize: 14, color: Colors.textSecondary },
  dayChipTextActive: { color: Colors.accent, fontWeight: '600' as const },
});
