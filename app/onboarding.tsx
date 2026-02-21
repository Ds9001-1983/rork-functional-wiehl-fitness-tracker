import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Target, Dumbbell, Calendar, ChevronRight, Check } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const GOALS = [
  { id: 'muscle', label: 'Muskelaufbau', icon: '\u{1F4AA}', desc: 'Muskelmasse aufbauen und stärker werden' },
  { id: 'lose_weight', label: 'Abnehmen', icon: '\u{1F525}', desc: 'Körperfett reduzieren und definierter werden' },
  { id: 'fitness', label: 'Allgemeine Fitness', icon: '\u{1F3C3}', desc: 'Ausdauer und Beweglichkeit verbessern' },
  { id: 'strength', label: 'Kraft', icon: '\u{1F3CB}\u{FE0F}', desc: 'Maximalkraft steigern' },
];

const LEVELS = [
  { id: 'beginner', label: 'Anfänger', desc: 'Weniger als 3 Monate Trainingserfahrung' },
  { id: 'intermediate', label: 'Fortgeschritten', desc: '3-12 Monate regelmäßiges Training' },
  { id: 'advanced', label: 'Erfahren', desc: 'Mehr als 1 Jahr kontinuierliches Training' },
];

const DAYS = [
  { id: '2', label: '2 Tage', desc: 'Ideal für den Einstieg' },
  { id: '3', label: '3 Tage', desc: 'Gutes Gleichgewicht' },
  { id: '4', label: '4 Tage', desc: 'Für Ambitionierte' },
  { id: '5', label: '5+ Tage', desc: 'Maximales Training' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState('');
  const [level, setLevel] = useState('');
  const [days, setDays] = useState('');

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem('onboarding', JSON.stringify({ goal, level, days, completedAt: new Date().toISOString() }));
      await AsyncStorage.setItem('onboardingComplete', 'true');
      // Try to save to server
      try { await updateProfile({ }); } catch {}
    } catch {}
    router.replace('/(tabs)');
  };

  const canProceed = (step === 0 && goal) || (step === 1 && level) || (step === 2 && days);

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <Target size={40} color={Colors.accent} />
            <Text style={styles.stepTitle}>Was ist dein Ziel?</Text>
            <Text style={styles.stepSubtitle}>Wähle dein Hauptziel aus</Text>
            {GOALS.map(g => (
              <TouchableOpacity key={g.id} style={[styles.option, goal === g.id && styles.optionSelected]} onPress={() => setGoal(g.id)}>
                <Text style={styles.optionIcon}>{g.icon}</Text>
                <View style={styles.optionInfo}>
                  <Text style={[styles.optionLabel, goal === g.id && styles.optionLabelSelected]}>{g.label}</Text>
                  <Text style={styles.optionDesc}>{g.desc}</Text>
                </View>
                {goal === g.id && <Check size={20} color={Colors.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        );
      case 1:
        return (
          <View style={styles.stepContent}>
            <Dumbbell size={40} color={Colors.accent} />
            <Text style={styles.stepTitle}>Dein Fitness-Level</Text>
            <Text style={styles.stepSubtitle}>Wie erfahren bist du?</Text>
            {LEVELS.map(l => (
              <TouchableOpacity key={l.id} style={[styles.option, level === l.id && styles.optionSelected]} onPress={() => setLevel(l.id)}>
                <View style={styles.optionInfo}>
                  <Text style={[styles.optionLabel, level === l.id && styles.optionLabelSelected]}>{l.label}</Text>
                  <Text style={styles.optionDesc}>{l.desc}</Text>
                </View>
                {level === l.id && <Check size={20} color={Colors.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContent}>
            <Calendar size={40} color={Colors.accent} />
            <Text style={styles.stepTitle}>Trainingstage pro Woche</Text>
            <Text style={styles.stepSubtitle}>Wie oft möchtest du trainieren?</Text>
            {DAYS.map(d => (
              <TouchableOpacity key={d.id} style={[styles.option, days === d.id && styles.optionSelected]} onPress={() => setDays(d.id)}>
                <View style={styles.optionInfo}>
                  <Text style={[styles.optionLabel, days === d.id && styles.optionLabelSelected]}>{d.label}</Text>
                  <Text style={styles.optionDesc}>{d.desc}</Text>
                </View>
                {days === d.id && <Check size={20} color={Colors.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        );
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Progress */}
        <View style={styles.progressRow}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
          ))}
        </View>

        {/* Step hint */}
        <Text style={styles.stepHint}>Schritt {step + 1} von 3</Text>

        {renderStep()}

        {/* Navigation */}
        <View style={styles.navRow}>
          {step > 0 ? (
            <TouchableOpacity style={styles.navBack} onPress={() => setStep(step - 1)}>
              <Text style={styles.navBackText}>Zurück</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.navBack} onPress={() => { AsyncStorage.setItem('onboardingComplete', 'true'); router.replace('/(tabs)'); }}>
              <Text style={styles.navBackText}>Überspringen</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.navNext, !canProceed && styles.navNextDisabled]}
            disabled={!canProceed}
            onPress={() => step < 2 ? setStep(step + 1) : handleComplete()}
          >
            <Text style={styles.navNextText}>{step < 2 ? 'Weiter' : 'Los geht\'s!'}</Text>
            <ChevronRight size={18} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const createStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg, paddingTop: 60 },
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  progressDot: { width: width / 4, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  progressDotActive: { backgroundColor: Colors.accent },
  stepHint: { textAlign: 'center', fontSize: 13, color: Colors.textMuted, marginBottom: Spacing.lg },
  stepContent: { flex: 1, alignItems: 'center' },
  stepTitle: { fontSize: 24, fontWeight: '700' as const, color: Colors.text, marginTop: Spacing.md, marginBottom: Spacing.xs },
  stepSubtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.xl },
  option: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  optionSelected: { borderColor: Colors.accent, backgroundColor: Colors.accent + '15' },
  optionIcon: { fontSize: 28, marginRight: Spacing.md },
  optionInfo: { flex: 1 },
  optionLabel: { fontSize: 16, fontWeight: '600' as const, color: Colors.text },
  optionLabelSelected: { color: Colors.accent },
  optionDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.lg },
  navBack: { padding: Spacing.md },
  navBackText: { color: Colors.textSecondary, fontSize: 16 },
  navNext: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.accent, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, gap: Spacing.xs },
  navNextDisabled: { opacity: 0.4 },
  navNextText: { color: Colors.text, fontSize: 16, fontWeight: '600' as const },
});
