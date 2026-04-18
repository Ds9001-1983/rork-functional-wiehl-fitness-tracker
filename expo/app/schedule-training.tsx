import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { User, Users, CheckCircle, ArrowLeft, Plus, Dumbbell, Clock, CheckSquare, Square } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { useClients } from '@/hooks/use-clients';
import { useWorkouts } from '@/hooks/use-workouts';
import { exercises } from '@/data/exercises';
import type { Workout, Exercise } from '@/types/workout';

export default function ScheduleTrainingScreen() {
  const { user } = useAuth();
  const { clients } = useClients();
  const { createWorkout } = useWorkouts();
  const params = useLocalSearchParams<{ clientId?: string }>();

  const [selectedClientId, setSelectedClientId] = useState<string>(params.clientId || '');
  const [planName, setPlanName] = useState<string>('');
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);

  const isTrainer = user?.role === 'trainer' || user?.role === 'admin';
  
  const selectedClient = useMemo(() => 
    clients.find(c => c.id === selectedClientId), 
    [clients, selectedClientId]
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
  
  const handleScheduleTraining = async () => {
    if (!selectedClientId) {
      Alert.alert('Fehler', 'Bitte einen Kunden auswählen');
      return;
    }

    if (!planName.trim()) {
      Alert.alert('Fehler', 'Bitte einen Plannamen eingeben');
      return;
    }

    if (selectedExercises.length === 0) {
      Alert.alert('Fehler', 'Bitte mindestens eine Übung auswählen');
      return;
    }

    try {
      const workoutExercises = selectedExercises.map((exerciseId, index) => ({
        id: `ex_${Date.now()}_${index}`,
        exerciseId,
        sets: [
          {
            id: `set_${Date.now()}_${index}_1`,
            reps: 10,
            weight: 20,
            completed: false,
          },
        ],
        notes: '',
      }));

      const autoTrainingName = `${planName} - ${selectedClient!.name}`;
      const workout: Omit<Workout, 'id'> = {
        name: autoTrainingName,
        date: new Date().toISOString(),
        exercises: workoutExercises,
        completed: false,
        userId: selectedClientId,
        createdBy: user?.id,
      };

      await createWorkout(workout);

      Alert.alert(
        '✅ Training zugewiesen!',
        `${selectedClient!.name} wurde das Training "${planName}" zugewiesen (${selectedExercises.length} Übungen). Der Kunde bekommt eine Benachrichtigung.`,
        [
          {
            text: 'Zurück zum Trainer Center',
            onPress: () => router.push('/trainer'),
          },
        ]
      );

      setSelectedClientId('');
      setPlanName('');
      setSelectedExercises([]);
    } catch (error) {
      console.error('Fehler beim Zuweisen des Trainings:', error);
      Alert.alert('Fehler', 'Training konnte nicht zugewiesen werden. Bitte versuchen Sie es erneut.');
    }
  };
  
  if (!isTrainer) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centeredText}>Nur für Trainer</Text>
      </View>
    );
  }
  
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Trainingsplan erstellen',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
          )
        }} 
      />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
        
        {/* Kunde auswählen */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>1. Kunde auswählen</Text>
            <Users size={20} color={Colors.accent} />
          </View>
          
          {clients.length === 0 ? (
            <View style={styles.emptyState}>
              <Users size={32} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Keine Kunden vorhanden</Text>
              <Text style={styles.emptySubtext}>Legen Sie zuerst einen Kunden an</Text>
            </View>
          ) : (
            <View style={styles.clientSelector}>
              {clients.map((client) => (
                <TouchableOpacity
                  key={client.id}
                  style={[
                    styles.clientOption,
                    selectedClientId === client.id && styles.clientOptionSelected
                  ]}
                  onPress={() => setSelectedClientId(selectedClientId === client.id ? '' : client.id)}
                >
                  <User size={16} color={selectedClientId === client.id ? Colors.text : Colors.textSecondary} />
                  <View style={styles.clientOptionInfo}>
                    <Text style={[
                      styles.clientOptionText,
                      selectedClientId === client.id && styles.clientOptionTextSelected
                    ]}>
                      {client.name}
                    </Text>
                    {client.phone && (
                      <Text style={styles.clientOptionPhone}>📱 {client.phone}</Text>
                    )}
                  </View>
                  {selectedClientId === client.id && (
                    <CheckCircle size={16} color={Colors.text} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        
        {/* Trainingsplan Name eingeben */}
        {selectedClientId && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>2. Trainingsplan Name</Text>
              <Plus size={20} color={Colors.accent} />
            </View>
            
            <View style={styles.row}>
              <Plus size={18} color={Colors.textSecondary} />
              <TextInput
                value={planName}
                onChangeText={setPlanName}
                placeholder="z.B. Oberkörper Kraftaufbau"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
              />
            </View>
          </View>
        )}
        
        {/* Übungen auswählen */}
        {selectedClientId && planName.trim() && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>3. Übungen auswählen</Text>
              <View style={styles.selectionCounter}>
                <Target size={16} color={Colors.accent} />
                <Text style={styles.selectionCounterText}>
                  {selectedExercises.length} ausgewählt
                </Text>
              </View>
            </View>
            
            {/* Übungen nach Kategorien */}
            {Object.entries(exercisesByCategory).map(([category, categoryExercises]) => (
              <View key={category} style={styles.categorySection}>
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
                            <CheckSquare size={18} color={Colors.text} />
                          ) : (
                            <Square size={18} color={Colors.textSecondary} />
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
                                <Dumbbell size={10} color={Colors.textMuted} />
                                <Text style={styles.exerciseMetaText}>{exercise.equipment}</Text>
                              </View>
                            )}
                            
                            <View style={styles.exerciseMetaItem}>
                              <Clock size={10} color={Colors.textMuted} />
                              <Text style={styles.exerciseMetaText}>
                                {exercise.muscleGroups.join(', ')}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
        
        {/* Zusammenfassung & Bestätigung */}
        {selectedClientId && planName.trim() && selectedExercises.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>4. Zusammenfassung</Text>
              <CheckCircle size={20} color={Colors.accent} />
            </View>
            
            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Kunde:</Text>
                <Text style={styles.summaryValue}>{selectedClient?.name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Trainingsplan:</Text>
                <Text style={styles.summaryValue}>{planName}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Übungen:</Text>
                <Text style={styles.summaryValue}>{selectedExercises.length} ausgewählt</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.scheduleButton}
              onPress={handleScheduleTraining}
            >
              <CheckCircle size={18} color={Colors.text} />
              <Text style={styles.scheduleButtonText}>
                Trainingsplan zuweisen
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
  card: {
    backgroundColor: Colors.surface,
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  cardTitle: { 
    color: Colors.text, 
    fontSize: 18, 
    fontWeight: '600' as const 
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '500' as const,
    marginTop: Spacing.sm,
  },
  emptySubtext: {
    color: Colors.textMuted,
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  clientSelector: {
    gap: Spacing.sm,
  },
  clientOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clientOptionSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  clientOptionInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  clientOptionText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  clientOptionTextSelected: {
    color: Colors.text,
    fontWeight: '600' as const,
  },
  clientOptionPhone: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  planSelector: {
    gap: Spacing.sm,
  },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  planOptionSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  planOptionInfo: {
    flex: 1,
  },
  planOptionText: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginBottom: 4,
  },
  planOptionTextSelected: {
    color: Colors.text,
    fontWeight: '600' as const,
  },
  planOptionDesc: {
    color: Colors.textMuted,
    fontSize: 14,
    marginBottom: 2,
  },
  planOptionMeta: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  selectionCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  selectionCounterText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  categorySection: {
    marginBottom: Spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceLight,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoryTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  categoryCount: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  exercisesList: {
    padding: Spacing.sm,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exerciseItemSelected: {
    backgroundColor: Colors.accent + '20',
    borderColor: Colors.accent,
  },
  exerciseCheckbox: {
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  exerciseNameSelected: {
    color: Colors.text,
    fontWeight: '600' as const,
  },
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  exerciseMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  exerciseMetaText: {
    color: Colors.textMuted,
    fontSize: 10,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  dateContainer: {
    flex: 2,
  },
  timeContainer: {
    flex: 1,
  },
  label: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    marginBottom: Spacing.sm,
  },
  notesRow: {
    height: 80,
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
  },
  input: { 
    flex: 1, 
    color: Colors.text, 
    fontSize: 16, 
    marginLeft: Spacing.sm 
  },
  notesInput: {
    textAlignVertical: 'top',
    marginLeft: 0,
  },
  inputLabel: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: -Spacing.sm,
  },
  summary: {
    backgroundColor: Colors.surfaceLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  summaryLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  summaryValue: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
    flex: 1,
    textAlign: 'right',
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  scheduleButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  recurringToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  recurringToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  recurringToggleText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  recurringToggleTextActive: {
    color: Colors.text,
    fontWeight: '600' as const,
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    backgroundColor: Colors.border,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: Colors.accent,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  recurringContainer: {
    gap: Spacing.md,
  },
  fullWidth: {
    width: '100%',
  },
  weekdaySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  weekdaySelectorText: {
    color: Colors.text,
    fontSize: 16,
  },
  weekdaySelectorPlaceholder: {
    color: Colors.textMuted,
  },
  weekdaySelectorIcon: {
    transform: [{ rotate: '0deg' }],
  },
  weekdaySelectorIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  weekdayOptions: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  weekdayOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  weekdayOptionSelected: {
    backgroundColor: Colors.accent,
  },
  weekdayOptionText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  weekdayOptionTextSelected: {
    color: Colors.text,
    fontWeight: '600' as const,
  },
});