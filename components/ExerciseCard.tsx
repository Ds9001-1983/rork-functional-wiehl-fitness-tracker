import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight, Dumbbell } from 'lucide-react-native';
import { Exercise } from '@/types/workout';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';

interface ExerciseCardProps {
  exercise: Exercise;
  onPress: () => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        <Dumbbell size={24} color={Colors.accent} />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.name}>{exercise.name}</Text>
        <Text style={styles.muscles}>{exercise.muscleGroups.join(' • ')}</Text>
        {exercise.equipment && (
          <Text style={styles.equipment}>{exercise.equipment}</Text>
        )}
      </View>
      
      <ChevronRight size={20} color={Colors.textMuted} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  muscles: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  equipment: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});