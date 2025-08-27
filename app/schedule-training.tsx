import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Calendar, Clock, User, Users, CheckCircle, ArrowLeft, Plus, Repeat, ChevronDown, CheckSquare, Square, Dumbbell, Target } from 'lucide-react-native';
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
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);

  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [recurringEndDate, setRecurringEndDate] = useState<string>('');
  const [showWeekdaySelector, setShowWeekdaySelector] = useState<boolean>(false);
  
  const weekdays = [
    { id: 1, name: 'Montag', short: 'Mo' },
    { id: 2, name: 'Dienstag', short: 'Di' },
    { id: 3, name: 'Mittwoch', short: 'Mi' },
    { id: 4, name: 'Donnerstag', short: 'Do' },
    { id: 5, name: 'Freitag', short: 'Fr' },
    { id: 6, name: 'Samstag', short: 'Sa' },
    { id: 0, name: 'Sonntag', short: 'So' }
  ];
  
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
  

  const generateRecurringDates = (startDate: string, endDate: string, weekdays: number[]): Date[] => {
    const dates: Date[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Beginne mit dem Startdatum
    let current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (weekdays.includes(dayOfWeek)) {
        const trainingDate = new Date(current);
        trainingDate.setHours(12, 0, 0, 0); // Set to noon as default
        dates.push(new Date(trainingDate));
      }
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
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
    
    if (isRecurring) {
      if (selectedWeekdays.length === 0) {
        Alert.alert('Fehler', 'Bitte mindestens einen Wochentag auswählen');
        return;
      }
      
      if (!recurringEndDate) {
        Alert.alert('Fehler', 'Bitte ein Enddatum für die Wiederholung eingeben');
        return;
      }
    }
    
    try {
      let trainingDates: Date[] = [];
      
      if (isRecurring) {
        // Wiederkehrende Termine generieren
        trainingDates = generateRecurringDates(
          selectedDate,
          recurringEndDate,
          selectedWeekdays
        );
      } else {
        // Einzeltermin
        const trainingDate = new Date(selectedDate);
        trainingDate.setHours(12, 0, 0, 0); // Set to noon as default
        trainingDates = [trainingDate];
      }
      
      if (trainingDates.length === 0) {
        Alert.alert('Fehler', 'Keine gültigen Trainingstermine gefunden');
        return;
      }
      
      // Erstelle Übungen basierend auf der Auswahl
      const workoutExercises = selectedExercises.map((exerciseId, index) => ({
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
      
      // Automatischer Trainingsname basierend auf Plan und Kunde
      const autoTrainingName = `${planName} - ${selectedClient!.name}`;
      
      // Alle Trainings erstellen
      for (const trainingDate of trainingDates) {
        const workout: Omit<Workout, 'id'> = {
          name: autoTrainingName,
          date: trainingDate.toISOString(),
          exercises: workoutExercises,
          completed: false,
          userId: selectedClientId,
          createdBy: user?.id,
        };
        
        await createWorkout(workout);
      }
      
      // Erfolgs-Nachricht
      const message = isRecurring 
        ? `${trainingDates.length} Trainingstermine wurden für ${selectedClient!.name} geplant.`
        : `Das Training wurde für ${selectedClient!.name} am ${new Date(selectedDate).toLocaleDateString('de-DE')} geplant.`;
      
      Alert.alert(
        '✅ Training(s) geplant!',
        message + `\n\n${selectedExercises.length} Übungen wurden hinzugefügt.`,
        [
          { 
            text: 'Zurück zum Trainer Center', 
            onPress: () => router.push('/trainer')
          }
        ]
      );
      
      // Felder zurücksetzen
      setSelectedClientId('');
      setPlanName('');
      setSelectedExercises([]);
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setIsRecurring(false);
      setSelectedWeekdays([]);
      setRecurringEndDate('');
      
    } catch (error) {
      console.error('Fehler beim Planen des Trainings:', error);
      Alert.alert('Fehler', 'Training konnte nicht geplant werden. Bitte versuchen Sie es erneut.');
    }
  };
  
  const toggleWeekday = (dayId: number) => {
    setSelectedWeekdays(prev => 
      prev.includes(dayId) 
        ? prev.filter(id => id !== dayId)
        : [...prev, dayId]
    );
  };
  
  const getSelectedWeekdaysText = () => {
    if (selectedWeekdays.length === 0) return 'Wochentage auswählen';
    const selectedNames = weekdays
      .filter(day => selectedWeekdays.includes(day.id))
      .map(day => day.short)
      .join(', ');
    return selectedNames;
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
        
        {/* Datum */}
        {selectedClientId && planName.trim() && selectedExercises.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>4. Datum festlegen</Text>
              <Calendar size={20} color={Colors.accent} />
            </View>
            
            {/* Wiederholung Toggle */}
            <TouchableOpacity 
              style={styles.recurringToggle}
              onPress={() => setIsRecurring(!isRecurring)}
            >
              <View style={styles.recurringToggleContent}>
                <Repeat size={18} color={isRecurring ? Colors.accent : Colors.textSecondary} />
                <Text style={[
                  styles.recurringToggleText,
                  isRecurring && styles.recurringToggleTextActive
                ]}>
                  Wiederkehrendes Training
                </Text>
              </View>
              <View style={[
                styles.toggleSwitch,
                isRecurring && styles.toggleSwitchActive
              ]}>
                <View style={[
                  styles.toggleKnob,
                  isRecurring && styles.toggleKnobActive
                ]} />
              </View>
            </TouchableOpacity>
            
            {!isRecurring ? (
              // Einzeltermin
              <View style={styles.fullWidth}>
                <Text style={styles.label}>Datum</Text>
                <View style={styles.row}>
                  <Calendar size={18} color={Colors.textSecondary} />
                  <TextInput
                    value={selectedDate}
                    onChangeText={setSelectedDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={Colors.textMuted}
                    style={styles.input}
                  />
                </View>
              </View>
            ) : (
              // Wiederkehrende Termine
              <View style={styles.recurringContainer}>
                <View style={styles.fullWidth}>
                  <Text style={styles.label}>Wochentage</Text>
                  <TouchableOpacity 
                    style={styles.weekdaySelector}
                    onPress={() => setShowWeekdaySelector(!showWeekdaySelector)}
                  >
                    <Text style={[
                      styles.weekdaySelectorText,
                      selectedWeekdays.length === 0 && styles.weekdaySelectorPlaceholder
                    ]}>
                      {getSelectedWeekdaysText()}
                    </Text>
                    <ChevronDown 
                      size={18} 
                      color={Colors.textSecondary} 
                      style={[
                        styles.weekdaySelectorIcon,
                        showWeekdaySelector && styles.weekdaySelectorIconRotated
                      ]}
                    />
                  </TouchableOpacity>
                  
                  {showWeekdaySelector && (
                    <View style={styles.weekdayOptions}>
                      {weekdays.map((day) => (
                        <TouchableOpacity
                          key={day.id}
                          style={[
                            styles.weekdayOption,
                            selectedWeekdays.includes(day.id) && styles.weekdayOptionSelected
                          ]}
                          onPress={() => toggleWeekday(day.id)}
                        >
                          <Text style={[
                            styles.weekdayOptionText,
                            selectedWeekdays.includes(day.id) && styles.weekdayOptionTextSelected
                          ]}>
                            {day.name}
                          </Text>
                          {selectedWeekdays.includes(day.id) && (
                            <CheckCircle size={16} color={Colors.text} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        )}
        
        {/* Zusammenfassung & Bestätigung */}
        {selectedClientId && planName.trim() && selectedExercises.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>5. Zusammenfassung</Text>
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
              {!isRecurring ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Datum:</Text>
                  <Text style={styles.summaryValue}>
                    {new Date(selectedDate).toLocaleDateString('de-DE')}
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Zeitraum:</Text>
                    <Text style={styles.summaryValue}>
                      {new Date(selectedDate).toLocaleDateString('de-DE')} - {recurringEndDate ? new Date(recurringEndDate).toLocaleDateString('de-DE') : 'Nicht festgelegt'}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Wochentage:</Text>
                    <Text style={styles.summaryValue}>{getSelectedWeekdaysText()}</Text>
                  </View>
                </>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.scheduleButton} 
              onPress={handleScheduleTraining}
            >
              <Calendar size={18} color={Colors.text} />
              <Text style={styles.scheduleButtonText}>
                {isRecurring ? 'Wiederkehrende Trainings erstellen' : 'Trainingsplan erstellen'}
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