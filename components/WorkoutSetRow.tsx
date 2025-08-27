import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Check, X, ChevronUp, ChevronDown } from 'lucide-react-native';
import { WorkoutSet } from '@/types/workout';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';

interface WorkoutSetRowProps {
  set: WorkoutSet;
  setNumber: number;
  onUpdate: (set: Partial<WorkoutSet>) => void;
  onRemove: () => void;
}

const NumberPicker: React.FC<{
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  visible: boolean;
  onClose: () => void;
}> = ({ value, onValueChange, min, max, step, suffix = '', visible, onClose }) => {
  const [selectedValue, setSelectedValue] = useState(value);
  
  const values: number[] = [];
  for (let i = min; i <= max; i += step) {
    values.push(i);
  }
  
  const handleConfirm = () => {
    onValueChange(selectedValue);
    onClose();
  };
  
  const increment = () => {
    const currentIndex = values.indexOf(selectedValue);
    if (currentIndex < values.length - 1) {
      setSelectedValue(values[currentIndex + 1]);
    }
  };
  
  const decrement = () => {
    const currentIndex = values.indexOf(selectedValue);
    if (currentIndex > 0) {
      setSelectedValue(values[currentIndex - 1]);
    }
  };
  
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalButton}>Abbrechen</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={[styles.modalButton, styles.confirmButton]}>Bestätigen</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.pickerContainer}>
            <TouchableOpacity style={styles.pickerButton} onPress={increment}>
              <ChevronUp size={24} color={Colors.text} />
            </TouchableOpacity>
            
            <View style={styles.valueContainer}>
              <Text style={styles.valueText}>{selectedValue}{suffix}</Text>
            </View>
            
            <TouchableOpacity style={styles.pickerButton} onPress={decrement}>
              <ChevronDown size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.valuesList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.valuesListContent}
          >
            {values.map((val) => (
              <TouchableOpacity
                key={val}
                style={[
                  styles.valueItem,
                  selectedValue === val && styles.selectedValueItem
                ]}
                onPress={() => setSelectedValue(val)}
              >
                <Text style={[
                  styles.valueItemText,
                  selectedValue === val && styles.selectedValueItemText
                ]}>
                  {val}{suffix}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export const WorkoutSetRow: React.FC<WorkoutSetRowProps> = ({
  set,
  setNumber,
  onUpdate,
  onRemove,
}) => {
  const [showWeightPicker, setShowWeightPicker] = useState(false);
  const [showRepsPicker, setShowRepsPicker] = useState(false);
  
  return (
    <View style={styles.container}>
      <Text style={styles.setNumber}>{setNumber}</Text>
      
      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowWeightPicker(true)}
      >
        <Text style={styles.inputText}>{set.weight || '0'} kg</Text>
      </TouchableOpacity>
      
      <Text style={styles.separator}>×</Text>
      
      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowRepsPicker(true)}
      >
        <Text style={styles.inputText}>{set.reps || '0'}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.completeButton, set.completed && styles.completedButton]}
        onPress={() => onUpdate({ completed: !set.completed })}
      >
        <Check size={16} color={set.completed ? Colors.background : Colors.textMuted} />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
        <X size={16} color={Colors.error} />
      </TouchableOpacity>
      
      <NumberPicker
        value={set.weight}
        onValueChange={(weight) => onUpdate({ weight })}
        min={0}
        max={300}
        step={0.5}
        suffix=" kg"
        visible={showWeightPicker}
        onClose={() => setShowWeightPicker(false)}
      />
      
      <NumberPicker
        value={set.reps}
        onValueChange={(reps) => onUpdate({ reps })}
        min={0}
        max={100}
        step={1}
        visible={showRepsPicker}
        onClose={() => setShowRepsPicker(false)}
      />
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
  setNumber: {
    width: 30,
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '600' as const,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputText: {
    color: Colors.text,
    fontSize: 16,
    textAlign: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalButton: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  confirmButton: {
    color: Colors.accent,
    fontWeight: '600' as const,
  },
  pickerContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  pickerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  valueContainer: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    marginVertical: Spacing.md,
  },
  valueText: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
  },
  valuesList: {
    maxHeight: 150,
    marginHorizontal: Spacing.lg,
  },
  valuesListContent: {
    paddingVertical: Spacing.sm,
  },
  valueItem: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginVertical: 2,
  },
  selectedValueItem: {
    backgroundColor: Colors.accent,
  },
  valueItemText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  selectedValueItemText: {
    color: Colors.text,
    fontWeight: '600' as const,
  },
});