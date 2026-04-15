import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal } from 'react-native';
import { Sparkles, X, ChevronDown, ChevronUp, Dumbbell, Check } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { exercises as exerciseDb } from '@/data/exercises';
import { trpcClient } from '@/lib/trpc';

interface AiPlanPreviewProps {
  onCreatePlan: (plan: { name: string; description: string; exercises: { exerciseId: string; sets: number; reps: number }[] }[]) => void;
}

export const AiPlanPreview: React.FC<AiPlanPreviewProps> = ({ onCreatePlan }) => {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const [showModal, setShowModal] = useState(false);
  const [goal, setGoal] = useState<'muscle' | 'strength' | 'lose_weight' | 'fitness'>('muscle');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [equipment, setEquipment] = useState<'full' | 'minimal' | 'bodyweight'>('full');
  const [restrictions, setRestrictions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(0);

  const goalOptions = [
    { key: 'muscle' as const, label: 'Muskelaufbau' },
    { key: 'strength' as const, label: 'Kraft' },
    { key: 'lose_weight' as const, label: 'Abnehmen' },
    { key: 'fitness' as const, label: 'Fitness' },
  ];

  const levelOptions = [
    { key: 'beginner' as const, label: 'Anfänger' },
    { key: 'intermediate' as const, label: 'Fortgeschritten' },
    { key: 'advanced' as const, label: 'Profi' },
  ];

  const equipmentOptions = [
    { key: 'full' as const, label: 'Vollausstattung' },
    { key: 'minimal' as const, label: 'Minimal' },
    { key: 'bodyweight' as const, label: 'Körpergewicht' },
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    setResult(null);
    try {
      const plan = await trpcClient.plans.aiGenerate.mutate({
        goal,
        level,
        daysPerWeek,
        equipment,
        restrictions,
      });
      setResult(plan);
      setExpandedDay(0);
    } catch (e) {
      console.error('[AI Generate] Error:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = () => {
    if (!result) return;
    onCreatePlan(result.days);
    setShowModal(false);
    setResult(null);
  };

  const getExerciseName = (id: string) => exerciseDb.find(e => e.id === id)?.name || id;

  return (
    <>
      <TouchableOpacity style={styles.generateButton} onPress={() => setShowModal(true)}>
        <Sparkles size={16} color={Colors.text} />
        <Text style={styles.generateButtonText}>KI-Plan generieren</Text>
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>KI-Trainingsplan</Text>
            <TouchableOpacity onPress={() => { setShowModal(false); setResult(null); }}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {!result ? (
              <>
                <Text style={styles.sectionLabel}>Ziel</Text>
                <View style={styles.optionRow}>
                  {goalOptions.map(opt => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.optionChip, goal === opt.key && styles.optionChipActive]}
                      onPress={() => setGoal(opt.key)}
                    >
                      <Text style={[styles.optionChipText, goal === opt.key && styles.optionChipTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionLabel}>Level</Text>
                <View style={styles.optionRow}>
                  {levelOptions.map(opt => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.optionChip, level === opt.key && styles.optionChipActive]}
                      onPress={() => setLevel(opt.key)}
                    >
                      <Text style={[styles.optionChipText, level === opt.key && styles.optionChipTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionLabel}>Trainingstage pro Woche</Text>
                <View style={styles.optionRow}>
                  {[2, 3, 4, 5].map(d => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.optionChip, daysPerWeek === d && styles.optionChipActive]}
                      onPress={() => setDaysPerWeek(d)}
                    >
                      <Text style={[styles.optionChipText, daysPerWeek === d && styles.optionChipTextActive]}>{d} Tage</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionLabel}>Equipment</Text>
                <View style={styles.optionRow}>
                  {equipmentOptions.map(opt => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.optionChip, equipment === opt.key && styles.optionChipActive]}
                      onPress={() => setEquipment(opt.key)}
                    >
                      <Text style={[styles.optionChipText, equipment === opt.key && styles.optionChipTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionLabel}>Einschränkungen (optional)</Text>
                <TextInput
                  style={styles.restrictionInput}
                  value={restrictions}
                  onChangeText={setRestrictions}
                  placeholder="z.B. Knieprobleme, keine Schulterübungen..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                />

                <TouchableOpacity
                  style={[styles.primaryButton, isGenerating && { opacity: 0.6 }]}
                  onPress={handleGenerate}
                  disabled={isGenerating}
                >
                  <Sparkles size={18} color={Colors.text} />
                  <Text style={styles.primaryButtonText}>
                    {isGenerating ? 'Generiere Plan...' : 'Plan generieren'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.resultTitle}>{result.planName}</Text>
                <Text style={styles.resultDesc}>{result.description}</Text>

                {result.days.map((day: any, dayIdx: number) => (
                  <View key={dayIdx} style={styles.dayCard}>
                    <TouchableOpacity
                      style={styles.dayHeader}
                      onPress={() => setExpandedDay(expandedDay === dayIdx ? null : dayIdx)}
                    >
                      <Text style={styles.dayName}>Tag {dayIdx + 1}: {day.name}</Text>
                      <View style={styles.dayMeta}>
                        <Text style={styles.dayExCount}>{day.exercises.length} Übungen</Text>
                        {expandedDay === dayIdx ? (
                          <ChevronUp size={16} color={Colors.textMuted} />
                        ) : (
                          <ChevronDown size={16} color={Colors.textMuted} />
                        )}
                      </View>
                    </TouchableOpacity>

                    {expandedDay === dayIdx && (
                      <View style={styles.dayExercises}>
                        {day.exercises.map((ex: any, exIdx: number) => (
                          <View key={exIdx} style={styles.exerciseRow}>
                            <Dumbbell size={14} color={Colors.accent} />
                            <Text style={styles.exerciseName}>{getExerciseName(ex.exerciseId)}</Text>
                            <Text style={styles.exerciseSetsReps}>{ex.sets}×{ex.reps}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))}

                <View style={styles.resultActions}>
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => { setResult(null); }}>
                    <Text style={styles.secondaryButtonText}>Neu generieren</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryButton} onPress={handleAccept}>
                    <Check size={18} color={Colors.text} />
                    <Text style={styles.primaryButtonText}>Pläne erstellen</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const createStyles = (Colors: any) => StyleSheet.create({
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#9C27B0',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  modalContent: {
    padding: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  optionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionChipActive: {
    backgroundColor: Colors.accent + '20',
    borderColor: Colors.accent,
  },
  optionChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  optionChipTextActive: {
    color: Colors.accent,
    fontWeight: '600' as const,
  },
  restrictionInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 60,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  primaryButtonText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  secondaryButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '500' as const,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  resultDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  dayCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  dayName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  dayMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dayExCount: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  dayExercises: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  exerciseName: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
  },
  exerciseSetsReps: {
    fontSize: 13,
    color: Colors.accent,
    fontWeight: '600' as const,
  },
  resultActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
});
