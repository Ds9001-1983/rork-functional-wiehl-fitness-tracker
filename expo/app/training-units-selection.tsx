import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { CheckSquare, Square, ArrowLeft, Save, Dumbbell, Clock, Target } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { useClients } from '@/hooks/use-clients';
import { useWorkouts } from '@/hooks/use-workouts';
import { exercises } from '@/data/exercises';
import type { Exercise } from '@/types/workout';

export default function TrainingUnitsSelectionScreen() {
  const { user } = useAuth();
  const { clients } = useClients();
  const { workoutPlans, updateWorkoutPlan } = useWorkouts();
  const params = useLocalSearchParams<{
    clientId: string;
    planId: string;
    planName: string;
  }>();
  
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  
  const isTrainer = user?.role === 'trainer' || user?.role === 'admin';
  
  const selectedClient = useMemo(() => 
    clients.find(c => c.id === params.clientId), 
    [clients, params.clientId]
  );
  
  const selectedPlan = useMemo(() => 
    workoutPlans.find(p => p.id === params.planId), 
    [workoutPlans, params.planId]
  );
  
  // Gruppiere Übungen nach Kategorien
  const exercisesByCategory = useMemo(() => {
    const grouped: Record<string, Exercise[]> = {};
    exercises.forEach(exercise => {
      if (!grouped[exercise.category]) {
        grouped[exercise.category] = [];
      }
      grouped[exercise.category].push(exercise);
    });
    return grouped;
  }, []);
  
  const categoryNames: Record<string, string> = {
    chest: '🏋️ Brust',
    back: '💪 Rücken',
    legs: '🦵 Beine',
    shoulders: '🤲 Schultern',
    arms: '💪 Arme',
    core: '🔥 Core',
    cardio: '❤️ Cardio',
    'full-body': '🏃 Ganzkörper'
  };
  
  const toggleExercise = (exerciseId: string) => {
    setSelectedExercises(prev => 
      prev.includes(exerciseId) 
        ? prev.filter(id => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };
  
  const handleSaveSelection = async () => {
    if (selectedExercises.length === 0) {
      Alert.alert('Fehler', 'Bitte mindestens eine Übung auswählen');
      return;
    }
    
    if (!selectedPlan) {
      Alert.alert('Fehler', 'Trainingsplan nicht gefunden');
      return;
    }
    
    try {
      // Erstelle neue Übungen basierend auf der Auswahl
      const newExercises = selectedExercises.map((exerciseId, index) => ({
        id: `ex_${Date.now()}_${index}`,
        exerciseId,
        sets: [
          {
            id: `set_${Date.now()}_${index}_1`,
            reps: 10,
            weight: 20,
            completed: false
          }
        ],
        notes: ''
      }));
      
      // Aktualisiere den Trainingsplan mit den neuen Übungen
      const updatedPlan = {
        ...selectedPlan,
        exercises: newExercises
      };
      
      await updateWorkoutPlan(selectedPlan.id, updatedPlan);
      
      Alert.alert(
        '✅ Trainingseinheiten gespeichert!',
        `${selectedExercises.length} Übungen wurden dem Trainingsplan "${selectedPlan.name}" hinzugefügt und sind jetzt für ${selectedClient?.name} verfügbar.`,
        [
          {
            text: 'Zurück zum Trainer Center',
            onPress: () => router.push('/trainer')
          }
        ]
      );
      
    } catch (error) {
      console.error('Fehler beim Speichern der Trainingseinheiten:', error);
      Alert.alert('Fehler', 'Trainingseinheiten konnten nicht gespeichert werden.');
    }
  };
  
  if (!isTrainer) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centeredText}>Nur für Trainer</Text>
      </View>
    );
  }
  
  if (!params.clientId || !params.planId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centeredText}>Ungültige Parameter</Text>
      </View>
    );
  }
  
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Trainingseinheiten auswählen',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
          )
        }} 
      />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
        
        {/* Header Info */}
        <View style={styles.headerCard}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Trainingseinheiten für</Text>
            <Text style={styles.headerSubtitle}>{selectedClient?.name}</Text>
            <Text style={styles.headerPlan}>Plan: {params.planName}</Text>
          </View>
          <View style={styles.selectionCounter}>
            <Target size={20} color={Colors.accent} />
            <Text style={styles.selectionCounterText}>
              {selectedExercises.length} ausgewählt
            </Text>
          </View>
        </View>
        
        {/* Übungen nach Kategorien */}
        {Object.entries(exercisesByCategory).map(([category, categoryExercises]) => (
          <View key={category} style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryTitle}>
                {categoryNames[category] || category}
              </Text>
              <Text style={styles.categoryCount}>
                {categoryExercises.length} Übungen
              </Text>
            </View>
            
            <View style={styles.exercisesList}>
              {categoryExercises.map((exercise) => {
                const isSelected = selectedExercises.includes(exercise.id);
                return (
                  <TouchableOpacity
                    key={exercise.id}
                    style={[
                      styles.exerciseItem,
                      isSelected && styles.exerciseItemSelected
                    ]}
                    onPress={() => toggleExercise(exercise.id)}
                  >
                    <View style={styles.exerciseCheckbox}>
                      {isSelected ? (
                        <CheckSquare size={20} color={Colors.text} />
                      ) : (
                        <Square size={20} color={Colors.textSecondary} />
                      )}
                    </View>
                    
                    <View style={styles.exerciseInfo}>
                      <Text style={[
                        styles.exerciseName,
                        isSelected && styles.exerciseNameSelected
                      ]}>
                        {exercise.name}
                      </Text>
                      
                      <View style={styles.exerciseMeta}>
                        {exercise.equipment && (
                          <View style={styles.exerciseMetaItem}>
                            <Dumbbell size={12} color={Colors.textMuted} />
                            <Text style={styles.exerciseMetaText}>{exercise.equipment}</Text>
                          </View>
                        )}
                        
                        <View style={styles.exerciseMetaItem}>
                          <Clock size={12} color={Colors.textMuted} />
                          <Text style={styles.exerciseMetaText}>
                            {exercise.muscleGroups.join(', ')}
                          </Text>
                        </View>
                      </View>
                      
                      {exercise.instructions && (
                        <Text style={styles.exerciseInstructions} numberOfLines={2}>
                          {exercise.instructions}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
        
        {/* Speichern Button */}
        {selectedExercises.length > 0 && (
          <View style={styles.saveCard}>
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={handleSaveSelection}
            >
              <Save size={18} color={Colors.text} />
              <Text style={styles.saveButtonText}>
                {selectedExercises.length} Übungen speichern
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.background 
  },
  centered: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: Colors.background 
  },
  centeredText: { 
    color: Colors.text, 
    fontSize: 16 
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerCard: {
    backgroundColor: Colors.surface,
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  headerSubtitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  headerPlan: {
    color: Colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  selectionCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  selectionCounterText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  categoryCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    backgroundColor: Colors.surfaceLight,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoryTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  categoryCount: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  exercisesList: {
    padding: Spacing.sm,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exerciseItemSelected: {
    backgroundColor: Colors.accent + '20',
    borderColor: Colors.accent,
  },
  exerciseCheckbox: {
    marginRight: Spacing.md,
    marginTop: 2,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  exerciseNameSelected: {
    color: Colors.text,
    fontWeight: '600' as const,
  },
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: 4,
  },
  exerciseMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exerciseMetaText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  exerciseInstructions: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  saveCard: {
    backgroundColor: Colors.surface,
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  saveButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});