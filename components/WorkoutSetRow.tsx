import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Check, X, TrendingUp } from 'lucide-react-native';
import { WorkoutSet, SetType } from '@/types/workout';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';

interface WorkoutSetRowProps {
  set: WorkoutSet;
  setNumber: number;
  onUpdate: (set: Partial<WorkoutSet>) => void;
  onRemove: () => void;
  previousWeight?: number;
  previousReps?: number;
  previousCompleted?: boolean; // was previous set at this index completed?
}

const SET_TYPE_LABELS: Record<SetType, { label: string; short: string; color: string }> = {
  normal: { label: 'Normal', short: '', color: Colors.textMuted },
  warmup: { label: 'Aufwärmen', short: 'W', color: Colors.warning },
  dropset: { label: 'Drop Set', short: 'D', color: Colors.error },
  failure: { label: 'Bis Versagen', short: 'F', color: '#E040FB' },
};

export const WorkoutSetRow: React.FC<WorkoutSetRowProps> = ({
  set,
  setNumber,
  onUpdate,
  onRemove,
  previousWeight,
  previousReps,
  previousCompleted,
}) => {
  const [weightText, setWeightText] = useState(set.weight > 0 ? set.weight.toString() : '');
  const [repsText, setRepsText] = useState(set.reps > 0 ? set.reps.toString() : '');

  useEffect(() => {
    setWeightText(set.weight > 0 ? set.weight.toString() : '');
  }, [set.weight]);

  useEffect(() => {
    setRepsText(set.reps > 0 ? set.reps.toString() : '');
  }, [set.reps]);

  const setTypeInfo = SET_TYPE_LABELS[set.type || 'normal'];
  const hasPrevious = previousWeight !== undefined && previousReps !== undefined;

  const cycleSetType = () => {
    const types: SetType[] = ['normal', 'warmup', 'dropset', 'failure'];
    const currentIndex = types.indexOf(set.type || 'normal');
    const nextType = types[(currentIndex + 1) % types.length];
    onUpdate({ type: nextType });
  };

  const commitWeight = () => {
    const parsed = parseFloat(weightText);
    const value = isNaN(parsed) ? 0 : parsed;
    onUpdate({ weight: value });
    if (value === 0) setWeightText('');
  };

  const commitReps = () => {
    const parsed = parseInt(repsText, 10);
    const value = isNaN(parsed) ? 0 : parsed;
    onUpdate({ reps: value });
    if (value === 0) setRepsText('');
  };

  const fillFromPrevious = () => {
    if (previousWeight !== undefined && previousReps !== undefined) {
      onUpdate({ weight: previousWeight, reps: previousReps });
    }
  };

  return (
    <View style={[styles.container, set.type === 'warmup' && styles.warmupRow, set.completed && styles.completedRow]}>
      {/* Set number / type indicator */}
      <TouchableOpacity onPress={cycleSetType} style={styles.setNumberContainer}>
        {setTypeInfo.short ? (
          <Text style={[styles.setTypeLabel, { color: setTypeInfo.color }]}>{setTypeInfo.short}</Text>
        ) : (
          <Text style={styles.setNumber}>{setNumber}</Text>
        )}
      </TouchableOpacity>

      {/* Previous performance hint - tap to fill */}
      {hasPrevious && (
        <TouchableOpacity onPress={fillFromPrevious} style={styles.previousHintContainer}>
          <Text style={styles.previousHint}>{previousWeight}x{previousReps}</Text>
          {previousCompleted && (
            <TrendingUp size={10} color={Colors.success} style={{ marginLeft: 1 }} />
          )}
        </TouchableOpacity>
      )}

      <TextInput
        style={styles.input}
        value={weightText}
        onChangeText={setWeightText}
        onEndEditing={commitWeight}
        onBlur={commitWeight}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={Colors.textMuted}
        selectTextOnFocus
      />

      <Text style={styles.unitLabel}>kg</Text>
      <Text style={styles.separator}>x</Text>

      <TextInput
        style={styles.input}
        value={repsText}
        onChangeText={setRepsText}
        onEndEditing={commitReps}
        onBlur={commitReps}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={Colors.textMuted}
        selectTextOnFocus
      />

      <TouchableOpacity
        style={[styles.completeButton, set.completed && styles.completedButton]}
        onPress={() => onUpdate({ completed: !set.completed })}
      >
        <Check size={16} color={set.completed ? Colors.background : Colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
        <X size={16} color={Colors.error} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  warmupRow: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
  },
  completedRow: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  setNumberContainer: {
    width: 30,
    alignItems: 'center',
  },
  setNumber: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '600' as const,
  },
  setTypeLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  previousHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 52,
    justifyContent: 'center',
  },
  previousHint: {
    fontSize: 11,
    color: Colors.accent,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  input: {
    flex: 1,
    height: 36,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    textAlign: 'center',
  },
  unitLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  separator: {
    marginHorizontal: Spacing.sm,
    fontSize: 16,
    color: Colors.textMuted,
  },
  completeButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  completedButton: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  removeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xs,
  },
});
