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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, X, Youtube, Plus } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { exercises as defaultExercises, exerciseCategories } from '@/data/exercises';
import { ExerciseCard } from '@/components/ExerciseCard';
import { Exercise } from '@/types/workout';
import { useWorkouts } from '@/hooks/use-workouts';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ExerciseSelectScreen() {
  const router = useRouter();
  const { addExerciseToWorkout, getExerciseHistory } = useWorkouts();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);

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
    if (selectedExercise) {
      addExerciseToWorkout(selectedExercise.id);
      setModalVisible(false);
      router.back();
    }
  };

  const handleOpenVideo = () => {
    if (selectedExercise?.videoUrl) {
      Linking.openURL(selectedExercise.videoUrl);
    }
  };

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
        {filteredExercises.length === 0 && (searchQuery.length > 0 || selectedCategory) ? (
          <View style={styles.emptySearch}>
            <Search size={32} color={Colors.textMuted} />
            <Text style={styles.emptySearchText}>Keine Uebungen gefunden</Text>
            <Text style={styles.emptySearchHint}>
              {searchQuery.length > 0 ? `Keine Ergebnisse fuer "${searchQuery}"` : 'Keine Uebungen in dieser Kategorie'}
            </Text>
          </View>
        ) : (
          filteredExercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onPress={() => handleExercisePress(exercise)}
            />
          ))
        )}
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

              <TouchableOpacity style={styles.addButton} onPress={handleAddToWorkout}>
                <Plus size={20} color={Colors.text} />
                <Text style={styles.addButtonText}>Zum Workout hinzufuegen</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
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
  emptySearch: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptySearchText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  emptySearchHint: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});
