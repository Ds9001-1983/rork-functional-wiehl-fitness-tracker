import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Save, Timer, X } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { useWorkouts } from '@/hooks/use-workouts';
import { useExercises } from '@/hooks/use-exercises';
import { WorkoutSetRow } from '@/components/WorkoutSetRow';
import { RestTimer } from '@/components/RestTimer';
import type { WorkoutSet } from '@/types/workout';

const REST_DEFAULT_SECONDS = 90;

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const { activeWorkout, updateSet, addSet, removeSet, saveWorkout, endWorkout } = useWorkouts();
  const { exercises } = useExercises();
  const [, forceUpdate] = useState(0);
  const [finishModalVisible, setFinishModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [restTimerVisible, setRestTimerVisible] = useState(false);
  const [restTimerKey, setRestTimerKey] = useState(0);

  // Timer aus Workout-Startzeit ableiten - überlebt App-Backgrounding/Crash
  const duration = activeWorkout
    ? Math.floor((Date.now() - new Date(activeWorkout.date).getTime()) / 1000)
    : 0;

  React.useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Pulsierender Punkt
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const openFinishModal = useCallback(() => {
    // Eigener Modal statt Alert.alert — löst Double-Tap-Bug auf Web + iOS
    // wenn zuvor ein TextInput Focus hatte.
    setFinishModalVisible(true);
  }, []);

  const doDiscard = useCallback(() => {
    setFinishModalVisible(false);
    endWorkout();
    router.back();
  }, [endWorkout, router]);

  const doSave = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await saveWorkout();
      endWorkout();
      setFinishModalVisible(false);
      router.back();
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, saveWorkout, endWorkout, router]);

  // Wrapper um updateSet: Timer starten wenn Set gerade completed=true gesetzt wurde
  const handleUpdateSet = useCallback((exerciseIndex: number, setIndex: number, update: Partial<WorkoutSet>) => {
    const currentSet = activeWorkout?.exercises[exerciseIndex]?.sets[setIndex];
    const wasCompleted = currentSet?.completed === true;
    updateSet(exerciseIndex, setIndex, update);
    if (update.completed === true && !wasCompleted) {
      // Timer remounten damit Zähler von 90s neu startet
      setRestTimerKey(k => k + 1);
      setRestTimerVisible(true);
    }
  }, [activeWorkout, updateSet]);

  const handleAddExercise = () => {
    router.push('/exercises');
  };

  if (!activeWorkout) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.emptyText}>Kein aktives Workout</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Aktives Workout',
          headerRight: () => (
            <TouchableOpacity onPress={openFinishModal} hitSlop={10} testID="finish-workout">
              <Save size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.workoutName}>{activeWorkout.name}</Text>
          <View style={styles.timerContainer}>
            <Animated.View style={[styles.timerDot, { opacity: pulseAnim }]} />
            <Timer size={18} color={Colors.accent} />
            <Text style={styles.duration}>{formatDuration(duration)}</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: restTimerVisible ? 360 : Spacing.xxl }}
        >
          {activeWorkout.exercises.map((exercise, exerciseIndex) => {
            const exerciseData = exercises.find(e => e.id === exercise.exerciseId);
            if (!exerciseData) return null;

            return (
              <View key={exercise.id} style={styles.exerciseContainer}>
                <Text style={styles.exerciseName}>{exerciseData.name}</Text>

                <View style={styles.setsHeader}>
                  <Text style={styles.setsHeaderText}>Satz</Text>
                  <Text style={styles.setsHeaderText}>Gewicht</Text>
                  <Text style={styles.setsHeaderText}>×</Text>
                  <Text style={styles.setsHeaderText}>Wdh</Text>
                  <Text style={styles.setsHeaderText}>Aktionen</Text>
                </View>

                {exercise.sets.map((set, setIndex) => (
                  <WorkoutSetRow
                    key={set.id}
                    set={set}
                    setNumber={setIndex + 1}
                    onUpdate={(update) => handleUpdateSet(exerciseIndex, setIndex, update)}
                    onRemove={() => removeSet(exerciseIndex, setIndex)}
                  />
                ))}

                <TouchableOpacity
                  style={styles.addSetButton}
                  onPress={() => addSet(exerciseIndex)}
                >
                  <Plus size={16} color={Colors.text} />
                  <Text style={styles.addSetButtonText}>Satz hinzufügen</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          <TouchableOpacity style={styles.addExerciseButton} onPress={handleAddExercise}>
            <Plus size={20} color={Colors.text} />
            <Text style={styles.addExerciseButtonText}>Übung hinzufügen</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Sticky Rest-Timer unten, halbe Höhe */}
        {restTimerVisible && (
          <View style={styles.restTimerOverlay} pointerEvents="box-none">
            <View style={styles.restTimerPanel}>
              <RestTimer
                key={restTimerKey}
                defaultSeconds={REST_DEFAULT_SECONDS}
                autoStart
                stepSeconds={10}
                onDismiss={() => setRestTimerVisible(false)}
              />
            </View>
          </View>
        )}
      </View>

      {/* Eigener Finish-Modal — ersetzt Alert.alert */}
      <Modal visible={finishModalVisible} transparent animationType="fade" onRequestClose={() => setFinishModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setFinishModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Workout beenden</Text>
              <TouchableOpacity onPress={() => setFinishModalVisible(false)} hitSlop={8}>
                <X size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalBody}>Möchtest du das Workout speichern oder verwerfen?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => setFinishModalVisible(false)}
              >
                <Text style={styles.modalBtnText}>Weiter trainieren</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnDestructive]}
                onPress={doDiscard}
              >
                <Text style={styles.modalBtnText}>Verwerfen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary, isSaving && { opacity: 0.6 }]}
                onPress={doSave}
                disabled={isSaving}
              >
                <Text style={styles.modalBtnText}>{isSaving ? 'Speichere…' : 'Speichern'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workoutName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.accent,
    gap: 6,
  },
  timerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
  },
  duration: {
    fontSize: 18,
    color: Colors.accent,
    fontWeight: '700' as const,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  exerciseContainer: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  setsHeaderText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addSetButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginLeft: Spacing.xs,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    margin: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  addExerciseButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
    marginLeft: Spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
  restTimerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  restTimerPanel: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    borderTopWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  modalBody: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  modalBtn: {
    flex: 1,
    minWidth: 100,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  modalBtnPrimary: { backgroundColor: Colors.accent },
  modalBtnSecondary: { backgroundColor: Colors.surfaceLight },
  modalBtnDestructive: { backgroundColor: Colors.error },
  modalBtnText: { color: Colors.text, fontWeight: '700' as const, fontSize: 14 },
});
