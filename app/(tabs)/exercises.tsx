import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import { Search, X, Youtube, Plus, Dumbbell, Clock, TrendingUp } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { exercises as defaultExercises, exerciseCategories } from '@/data/exercises';
import { ExerciseCard } from '@/components/ExerciseCard';
import { Exercise, ExerciseCategory } from '@/types/workout';
import { useWorkouts } from '@/hooks/use-workouts';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ExercisesScreen() {
  const { activeWorkout, addExerciseToWorkout, getExerciseHistory } = useWorkouts();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newExercise, setNewExercise] = useState({
    name: '',
    category: 'chest' as ExerciseCategory,
    equipment: '',
    muscleGroups: '',
    instructions: '',
  });

  // Load custom exercises
  React.useEffect(() => {
    AsyncStorage.getItem('customExercises').then(data => {
      if (data) setCustomExercises(JSON.parse(data));
    });
  }, []);

  const allExercises = [...defaultExercises, ...customExercises];

  const filteredExercises = allExercises.filter((exercise) => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exercise.muscleGroups.some(mg => mg.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || exercise.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleExercisePress = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setModalVisible(true);
  };

  const handleAddToWorkout = () => {
    if (selectedExercise && activeWorkout) {
      addExerciseToWorkout(selectedExercise.id);
      setModalVisible(false);
    }
  };

  const handleOpenVideo = () => {
    if (selectedExercise?.videoUrl) {
      Linking.openURL(selectedExercise.videoUrl);
    }
  };

  const handleCreateExercise = async () => {
    if (!newExercise.name.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Namen ein.');
      return;
    }

    const exercise: Exercise = {
      id: `custom-${Date.now()}`,
      name: newExercise.name.trim(),
      category: newExercise.category,
      equipment: newExercise.equipment.trim() || undefined,
      muscleGroups: newExercise.muscleGroups
        .split(',')
        .map(mg => mg.trim())
        .filter(mg => mg.length > 0),
      instructions: newExercise.instructions.trim() || undefined,
      isCustom: true,
    };

    const updated = [...customExercises, exercise];
    setCustomExercises(updated);
    await AsyncStorage.setItem('customExercises', JSON.stringify(updated));

    setNewExercise({ name: '', category: 'chest', equipment: '', muscleGroups: '', instructions: '' });
    setShowCreateModal(false);
  };

  // Get exercise history for detail modal
  const exerciseHistory = selectedExercise ? getExerciseHistory(selectedExercise.id) : [];

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Search size={20} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Uebung suchen..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        <TouchableOpacity
          style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>
            Alle ({allExercises.length})
          </Text>
        </TouchableOpacity>
        {exerciseCategories.map((category) => {
          const count = allExercises.filter(e => e.category === category.id).length;
          return (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryChip, selectedCategory === category.id && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text style={[styles.categoryChipText, selectedCategory === category.id && styles.categoryChipTextActive]}>
                {category.name} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.exercisesList}
      >
        {/* Create Custom Exercise Button */}
        <TouchableOpacity
          style={styles.createExerciseCard}
          onPress={() => setShowCreateModal(true)}
        >
          <Plus size={20} color={Colors.accent} />
          <Text style={styles.createExerciseText}>Eigene Uebung erstellen</Text>
        </TouchableOpacity>

        {filteredExercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            onPress={() => handleExercisePress(exercise)}
          />
        ))}
      </ScrollView>

      {/* Exercise Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedExercise?.name}</Text>
                {selectedExercise?.isCustom && (
                  <Text style={styles.customBadge}>Eigene Uebung</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Muskelgruppen</Text>
                <Text style={styles.modalText}>
                  {selectedExercise?.muscleGroups.join(', ')}
                </Text>
              </View>

              {selectedExercise?.equipment && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Equipment</Text>
                  <Text style={styles.modalText}>{selectedExercise.equipment}</Text>
                </View>
              )}

              {selectedExercise?.instructions && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Anleitung</Text>
                  <Text style={styles.modalText}>{selectedExercise.instructions}</Text>
                </View>
              )}

              {/* Exercise History */}
              {exerciseHistory.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>
                    Verlauf ({exerciseHistory.length} Workouts)
                  </Text>
                  {exerciseHistory.slice(-5).reverse().map((entry, i) => {
                    const maxWeight = Math.max(...entry.sets.map(s => s.weight));
                    const totalVolume = entry.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
                    return (
                      <View key={i} style={styles.historyEntry}>
                        <Text style={styles.historyDate}>
                          {new Date(entry.date).toLocaleDateString('de-DE', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </Text>
                        <Text style={styles.historyDetail}>
                          {entry.sets.length} Saetze - Max {maxWeight} kg - {totalVolume} kg Vol.
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {selectedExercise?.videoUrl && (
                <TouchableOpacity style={styles.videoButton} onPress={handleOpenVideo}>
                  <Youtube size={20} color={Colors.text} />
                  <Text style={styles.videoButtonText}>Video ansehen</Text>
                </TouchableOpacity>
              )}

              {activeWorkout && (
                <TouchableOpacity style={styles.addButton} onPress={handleAddToWorkout}>
                  <Plus size={20} color={Colors.text} />
                  <Text style={styles.addButtonText}>Zum Workout hinzufuegen</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create Exercise Modal */}
      <Modal
        animationType="slide"
        visible={showCreateModal}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.createModalContainer}>
          <View style={styles.createModalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.createModalTitle}>Neue Uebung</Text>
            <TouchableOpacity onPress={handleCreateExercise}>
              <Text style={styles.saveButton}>Speichern</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.createModalBody}>
            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="z.B. Cable Lateral Raise"
              placeholderTextColor={Colors.textMuted}
              value={newExercise.name}
              onChangeText={(name) => setNewExercise(prev => ({ ...prev, name }))}
            />

            <Text style={styles.inputLabel}>Kategorie</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPickerScroll}>
              {exerciseCategories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryPickerChip,
                    newExercise.category === cat.id && styles.categoryPickerChipActive,
                  ]}
                  onPress={() => setNewExercise(prev => ({ ...prev, category: cat.id as ExerciseCategory }))}
                >
                  <Text style={[
                    styles.categoryPickerText,
                    newExercise.category === cat.id && styles.categoryPickerTextActive,
                  ]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Equipment</Text>
            <TextInput
              style={styles.textInput}
              placeholder="z.B. Kabelzug, Kurzhanteln"
              placeholderTextColor={Colors.textMuted}
              value={newExercise.equipment}
              onChangeText={(equipment) => setNewExercise(prev => ({ ...prev, equipment }))}
            />

            <Text style={styles.inputLabel}>Muskelgruppen (kommagetrennt)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="z.B. Bizeps, Unterarme"
              placeholderTextColor={Colors.textMuted}
              value={newExercise.muscleGroups}
              onChangeText={(muscleGroups) => setNewExercise(prev => ({ ...prev, muscleGroups }))}
            />

            <Text style={styles.inputLabel}>Anleitung (optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Ausfuehrung beschreiben..."
              placeholderTextColor={Colors.textMuted}
              value={newExercise.instructions}
              onChangeText={(instructions) => setNewExercise(prev => ({ ...prev, instructions }))}
              multiline
              numberOfLines={4}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: Colors.text,
    fontSize: 16,
  },
  categoriesContainer: {
    maxHeight: 50,
    marginBottom: Spacing.md,
  },
  categoriesContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  categoryChipText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  categoryChipTextActive: {
    color: Colors.text,
  },
  exercisesList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  createExerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accent,
    borderStyle: 'dashed',
  },
  createExerciseText: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '500' as const,
    marginLeft: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '85%',
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
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  customBadge: {
    fontSize: 12,
    color: Colors.accent,
    marginTop: 2,
  },
  modalBody: {
    padding: Spacing.lg,
  },
  modalSection: {
    marginBottom: Spacing.lg,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
  },
  historyEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  historyDate: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '500' as const,
    width: 60,
  },
  historyDetail: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
    textAlign: 'right',
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  videoButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500' as const,
    marginLeft: Spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  addButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
    marginLeft: Spacing.sm,
  },
  createModalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  createModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  createModalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  saveButton: {
    fontSize: 16,
    color: Colors.accent,
    fontWeight: '600' as const,
  },
  createModalBody: {
    flex: 1,
    padding: Spacing.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  categoryPickerScroll: {
    maxHeight: 40,
  },
  categoryPickerChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryPickerChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  categoryPickerText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  categoryPickerTextActive: {
    color: Colors.text,
    fontWeight: '600' as const,
  },
});
