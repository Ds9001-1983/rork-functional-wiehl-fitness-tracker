import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { router } from 'expo-router';
import { ClipboardList, Plus, Send, X, Edit3, Users, Trash2, Copy, Check, Search, Dumbbell, FileText, GitBranch } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { useClients } from '@/hooks/use-clients';
import { useWorkouts } from '@/hooks/use-workouts';
import { useExercises } from '@/hooks/use-exercises';
import type { WorkoutExercise, WorkoutPlan } from '@/types/workout';
import StatusBanner from '@/components/StatusBanner';
import ConfirmDialog from '@/components/ConfirmDialog';
import { PlanPdfExport } from '@/components/PlanPdfExport';

export default function TrainerPlansScreen() {
  const { user } = useAuth();
  const { clients } = useClients();
  const { createWorkoutPlan, assignPlanToUser, instantiatePlan, updateWorkoutPlan, deletePlan, duplicatePlan, workoutPlans, setCurrentUserId } = useWorkouts();
  const { exercises: exerciseDb } = useExercises();

  useEffect(() => {
    if (user?.id) setCurrentUserId(user.id);
  }, [user?.id, setCurrentUserId]);
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  // Separate templates from instances
  const templates = workoutPlans.filter(p => !p.isInstance);
  const instances = workoutPlans.filter(p => p.isInstance);

  // Filter toggle
  const [showFilter, setShowFilter] = useState<'all' | 'templates' | 'instances'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPlans = (showFilter === 'templates' ? templates
    : showFilter === 'instances' ? instances
    : workoutPlans
  ).filter(p => searchQuery.trim().length === 0 || p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()));

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [planName, setPlanName] = useState('');
  const [planDesc, setPlanDesc] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Edit state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPlanId, setEditPlanId] = useState('');
  const [editPlanName, setEditPlanName] = useState('');
  const [editPlanDesc, setEditPlanDesc] = useState('');

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePlanId, setDeletePlanId] = useState('');

  // Discard confirmation state
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [discardAction, setDiscardAction] = useState<(() => void) | null>(null);

  const hasUnsavedCreateChanges = () => {
    return planName.trim().length > 0 || planDesc.trim().length > 0 || createExercises.length > 0;
  };

  const hasUnsavedEditChanges = () => {
    const plan = workoutPlans.find(p => p.id === editPlanId);
    if (!plan) return false;
    return editPlanName !== plan.name || editPlanDesc !== (plan.description || '') || editExercises.length !== plan.exercises.length;
  };

  const confirmDiscard = (action: () => void) => {
    setDiscardAction(() => action);
    setShowDiscardConfirm(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setPlanName('');
    setPlanDesc('');
    setCreateExercises([]);
    setExerciseSearch('');
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditExercises([]);
    setEditExerciseSearch('');
  };

  const handleCloseCreate = () => {
    if (hasUnsavedCreateChanges()) {
      confirmDiscard(closeCreateModal);
    } else {
      closeCreateModal();
    }
  };

  const handleCloseEdit = () => {
    if (hasUnsavedEditChanges()) {
      confirmDiscard(closeEditModal);
    } else {
      closeEditModal();
    }
  };

  // Exercise selection state
  const [createExercises, setCreateExercises] = useState<WorkoutExercise[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [editExercises, setEditExercises] = useState<WorkoutExercise[]>([]);
  const [editExerciseSearch, setEditExerciseSearch] = useState('');

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const makeExerciseEntry = (exerciseId: string): WorkoutExercise => ({
    id: generateId(),
    exerciseId,
    sets: [
      { id: generateId(), reps: 10, weight: 0, completed: false, type: 'normal' as const },
      { id: generateId(), reps: 10, weight: 0, completed: false, type: 'normal' as const },
      { id: generateId(), reps: 10, weight: 0, completed: false, type: 'normal' as const },
    ],
  });

  const getExerciseName = (exerciseId: string) => {
    return exerciseDb.find(e => e.id === exerciseId)?.name || exerciseId;
  };

  const filteredCreateExercises = exerciseSearch.length > 0
    ? exerciseDb.filter(e =>
        e.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
        e.muscleGroups.some(mg => mg.toLowerCase().includes(exerciseSearch.toLowerCase()))
      ).slice(0, 8)
    : [];

  const filteredEditExercises = editExerciseSearch.length > 0
    ? exerciseDb.filter(e =>
        e.name.toLowerCase().includes(editExerciseSearch.toLowerCase()) ||
        e.muscleGroups.some(mg => mg.toLowerCase().includes(editExerciseSearch.toLowerCase()))
      ).slice(0, 8)
    : [];

  const handleCreatePlan = async () => {
    if (!planName.trim()) {
      setStatusMessage({ type: 'error', text: 'Bitte einen Plannamen eingeben.' });
      return;
    }
    if (createExercises.length === 0) {
      setStatusMessage({ type: 'error', text: 'Bitte mindestens eine Übung hinzufügen.' });
      return;
    }
    try {
      await createWorkoutPlan({
        name: planName.trim(),
        description: planDesc.trim(),
        exercises: createExercises,
        createdBy: user?.id || '',
        assignedTo: [],
      });
      setShowCreateModal(false);
      setPlanName('');
      setPlanDesc('');
      setCreateExercises([]);
      setExerciseSearch('');
      setStatusMessage({ type: 'success', text: `Trainingsplan "${planName}" wurde erstellt.` });
    } catch {
      setStatusMessage({ type: 'error', text: 'Plan konnte nicht erstellt werden.' });
    }
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleAssignPlan = async () => {
    if (!selectedPlanId || selectedClientIds.length === 0) {
      setStatusMessage({ type: 'error', text: 'Bitte Plan und mindestens einen Kunden auswählen.' });
      return;
    }

    const successNames: string[] = [];
    const failedNames: string[] = [];

    // Create independent instances for each client
    try {
      await instantiatePlan(selectedPlanId, selectedClientIds);
      for (const clientId of selectedClientIds) {
        const name = clients.find(c => c.id === clientId)?.name || 'Unbekannt';
        successNames.push(name);
      }
    } catch {
      // Fallback: try one by one
      for (const clientId of selectedClientIds) {
        try {
          await assignPlanToUser(selectedPlanId, clientId);
          const name = clients.find(c => c.id === clientId)?.name || 'Unbekannt';
          successNames.push(name);
        } catch {
          const name = clients.find(c => c.id === clientId)?.name || 'Unbekannt';
          failedNames.push(name);
        }
      }
    }

    setShowAssignModal(false);
    setSelectedClientIds([]);
    setSelectedPlanId('');

    if (failedNames.length === 0) {
      setStatusMessage({ type: 'success', text: `Plan zugewiesen an: ${successNames.join(', ')}` });
    } else if (successNames.length === 0) {
      setStatusMessage({ type: 'error', text: `Fehler bei: ${failedNames.join(', ')}` });
    } else {
      setStatusMessage({ type: 'success', text: `Zugewiesen an: ${successNames.join(', ')}. Fehler bei: ${failedNames.join(', ')}` });
    }
  };

  const openEditModal = (plan: WorkoutPlan) => {
    setEditPlanId(plan.id);
    setEditPlanName(plan.name);
    setEditPlanDesc(plan.description || '');
    setEditExercises([...plan.exercises]);
    setEditExerciseSearch('');
    setShowEditModal(true);
  };

  const handleEditPlan = async () => {
    if (!editPlanName.trim()) {
      setStatusMessage({ type: 'error', text: 'Bitte einen Plannamen eingeben.' });
      return;
    }
    try {
      const plan = workoutPlans.find(p => p.id === editPlanId);
      if (!plan) return;

      // Track customized fields for instances
      const customizedFields: string[] = [...(plan.customizedFields || [])];
      if (plan.isInstance && plan.templateId) {
        const template = templates.find(t => t.id === plan.templateId);
        if (template) {
          if (editPlanName.trim() !== template.name && !customizedFields.includes('name')) {
            customizedFields.push('name');
          }
          if (editPlanDesc.trim() !== (template.description || '') && !customizedFields.includes('description')) {
            customizedFields.push('description');
          }
          if (JSON.stringify(editExercises) !== JSON.stringify(template.exercises) && !customizedFields.includes('exercises')) {
            customizedFields.push('exercises');
          }
        }
      }

      await updateWorkoutPlan(editPlanId, {
        ...plan,
        name: editPlanName.trim(),
        description: editPlanDesc.trim(),
        exercises: editExercises,
        customizedFields: plan.isInstance ? customizedFields : undefined,
      });
      setShowEditModal(false);
      setStatusMessage({ type: 'success', text: plan.isInstance ? 'Instanz wurde angepasst.' : 'Vorlage wurde aktualisiert.' });
    } catch {
      setStatusMessage({ type: 'error', text: 'Plan konnte nicht aktualisiert werden.' });
    }
  };

  const handleDeletePlan = async () => {
    try {
      await deletePlan(deletePlanId);
      setShowDeleteConfirm(false);
      setDeletePlanId('');
      setStatusMessage({ type: 'success', text: 'Trainingsplan wurde gelöscht.' });
    } catch {
      setStatusMessage({ type: 'error', text: 'Plan konnte nicht gelöscht werden.' });
    }
  };

  const handleDuplicatePlan = async (planId: string) => {
    try {
      await duplicatePlan(planId);
      setStatusMessage({ type: 'success', text: 'Plan wurde dupliziert.' });
    } catch {
      setStatusMessage({ type: 'error', text: 'Plan konnte nicht dupliziert werden.' });
    }
  };

  const getAssignedCount = (plan: WorkoutPlan) => {
    return plan.assignedTo?.length || 0;
  };

  const getDeleteMessage = () => {
    const plan = workoutPlans.find(p => p.id === deletePlanId);
    if (!plan) return 'Möchtest du diesen Trainingsplan wirklich löschen?';

    if (plan.isInstance) {
      const userName = plan.assignedTo?.[0]
        ? clients.find(c => c.id === plan.assignedTo?.[0])?.name || 'einem Kunden'
        : 'einem Kunden';
      return `Diese Plan-Instanz für ${userName} wird gelöscht. Die Vorlage bleibt erhalten.`;
    }

    const instCount = instances.filter(i => i.templateId === plan.id).length;
    if (instCount > 0) {
      return `Diese Vorlage hat ${instCount} aktive Instanz${instCount !== 1 ? 'en' : ''}. Nur die Vorlage wird gelöscht, Instanzen bleiben erhalten.`;
    }

    const count = plan.assignedTo?.length || 0;
    if (count > 0) {
      return `Dieser Plan ist ${count} Kunde${count !== 1 ? 'n' : ''} zugewiesen. Möchtest du ihn trotzdem löschen?`;
    }
    return 'Möchtest du diesen Trainingsplan wirklich löschen?';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
      {statusMessage && (
        <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
          <StatusBanner type={statusMessage.type} text={statusMessage.text} onDismiss={() => setStatusMessage(null)} />
        </View>
      )}

      {/* Training planen Button */}
      <View style={styles.card}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/schedule-training')}>
          <ClipboardList size={18} color={Colors.text} />
          <Text style={styles.primaryButtonText}>Neues Training planen</Text>
        </TouchableOpacity>
      </View>

      {/* Trainingsplaene */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Trainingspläne ({workoutPlans.length})</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateModal(true)}>
            <Plus size={18} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Search Field */}
        {workoutPlans.length > 0 && (
          <View style={styles.searchRow}>
            <Search size={18} color={Colors.textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Plan suchen..."
              placeholderTextColor={Colors.textMuted}
              style={styles.searchInput}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Filter Tabs */}
        {workoutPlans.length > 0 && (
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterTab, showFilter === 'all' && styles.filterTabActive]}
              onPress={() => setShowFilter('all')}
            >
              <Text style={[styles.filterTabText, showFilter === 'all' && styles.filterTabTextActive]}>
                Alle ({workoutPlans.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, showFilter === 'templates' && styles.filterTabActive]}
              onPress={() => setShowFilter('templates')}
            >
              <FileText size={12} color={showFilter === 'templates' ? Colors.accent : Colors.textMuted} />
              <Text style={[styles.filterTabText, showFilter === 'templates' && styles.filterTabTextActive]}>
                Vorlagen ({templates.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, showFilter === 'instances' && styles.filterTabActive]}
              onPress={() => setShowFilter('instances')}
            >
              <GitBranch size={12} color={showFilter === 'instances' ? Colors.accent : Colors.textMuted} />
              <Text style={[styles.filterTabText, showFilter === 'instances' && styles.filterTabTextActive]}>
                Instanzen ({instances.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {filteredPlans.length === 0 ? (
          <View style={styles.emptyState}>
            <ClipboardList size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>
              {workoutPlans.length === 0
                ? 'Noch keine Trainingspläne erstellt'
                : showFilter === 'templates' ? 'Keine Vorlagen vorhanden' : 'Keine Instanzen vorhanden'}
            </Text>
            <Text style={styles.emptySubtext}>
              {workoutPlans.length === 0 ? 'Erstelle deinen ersten Plan' : ''}
            </Text>
          </View>
        ) : (
          <View style={styles.plansList}>
            {filteredPlans.map((plan) => {
              const assignedCount = getAssignedCount(plan);
              const isInstance = plan.isInstance;
              const templateName = isInstance && plan.templateId
                ? templates.find(t => t.id === plan.templateId)?.name
                : null;
              const assignedUserName = isInstance && plan.assignedTo?.[0]
                ? clients.find(c => c.id === plan.assignedTo?.[0])?.name
                : null;
              const instanceCount = !isInstance
                ? instances.filter(i => i.templateId === plan.id).length
                : 0;

              return (
                <View key={plan.id} style={[styles.planCard, isInstance && styles.planCardInstance]}>
                  <TouchableOpacity style={styles.planInfo} onPress={() => openEditModal(plan)} activeOpacity={0.7}>
                    <View style={styles.planNameRow}>
                      <Text style={styles.planName}>{plan.name}</Text>
                      {isInstance ? (
                        <View style={styles.instanceBadge}>
                          <GitBranch size={10} color={Colors.accent} />
                          <Text style={styles.instanceBadgeText}>Instanz</Text>
                        </View>
                      ) : (
                        <View style={styles.templateBadge}>
                          <FileText size={10} color={Colors.textSecondary} />
                          <Text style={styles.templateBadgeText}>Vorlage</Text>
                        </View>
                      )}
                    </View>
                    {plan.description ? <Text style={styles.planDesc}>{plan.description}</Text> : null}
                    <Text style={styles.planMeta}>{plan.exercises.length} Übungen</Text>
                    {isInstance && assignedUserName && (
                      <View style={styles.assignedBadge}>
                        <Users size={12} color={Colors.accent} />
                        <Text style={styles.assignedText}>Für: {assignedUserName}</Text>
                      </View>
                    )}
                    {isInstance && templateName && (
                      <Text style={styles.templateRef}>Vorlage: {templateName}</Text>
                    )}
                    {!isInstance && instanceCount > 0 && (
                      <View style={styles.assignedBadge}>
                        <GitBranch size={12} color={Colors.accent} />
                        <Text style={styles.assignedText}>
                          {instanceCount} Instanz{instanceCount !== 1 ? 'en' : ''} erstellt
                        </Text>
                      </View>
                    )}
                    {!isInstance && assignedCount > 0 && instanceCount === 0 && (
                      <View style={styles.assignedBadge}>
                        <Users size={12} color={Colors.accent} />
                        <Text style={styles.assignedText}>
                          {assignedCount} Kunde{assignedCount !== 1 ? 'n' : ''} zugewiesen
                        </Text>
                      </View>
                    )}
                    {isInstance && (plan.customizedFields?.length ?? 0) > 0 && (
                      <Text style={styles.customizedHint}>Individuell angepasst</Text>
                    )}
                  </TouchableOpacity>
                  <View style={styles.planActions}>
                    <PlanPdfExport plan={plan} clientName={assignedUserName || undefined} />
                    <View {...{title: 'Bearbeiten'} as any}>
                      <TouchableOpacity style={styles.actionIcon} onPress={() => openEditModal(plan)} accessibilityLabel="Bearbeiten">
                        <Edit3 size={16} color={Colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    {!isInstance && (
                      <View {...{title: 'Duplizieren'} as any}>
                        <TouchableOpacity style={styles.actionIcon} onPress={() => handleDuplicatePlan(plan.id)} accessibilityLabel="Duplizieren">
                          <Copy size={16} color={Colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    )}
                    {!isInstance && (
                      <View {...{title: 'Zuweisen'} as any}>
                        <TouchableOpacity
                          style={styles.actionIcon}
                          accessibilityLabel="Zuweisen"
                          onPress={() => {
                            setSelectedPlanId(plan.id);
                            setSelectedClientIds([]);
                            setShowAssignModal(true);
                          }}
                        >
                          <Send size={16} color={Colors.accent} />
                        </TouchableOpacity>
                      </View>
                    )}
                    <View {...{title: 'Löschen'} as any}>
                      <TouchableOpacity
                        style={styles.actionIcon}
                        accessibilityLabel="Löschen"
                        onPress={() => {
                          setDeletePlanId(plan.id);
                          setShowDeleteConfirm(true);
                        }}
                      >
                        <Trash2 size={16} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Delete Confirmation */}
      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Trainingsplan löschen"
        message={getDeleteMessage()}
        confirmText="Löschen"
        cancelText="Abbrechen"
        destructive
        onConfirm={handleDeletePlan}
        onCancel={() => { setShowDeleteConfirm(false); setDeletePlanId(''); }}
      />

      {/* Plan erstellen Modal */}
      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Neuen Trainingsplan erstellen</Text>
            <TouchableOpacity onPress={handleCloseCreate}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.row}>
              <ClipboardList size={18} color={Colors.textSecondary} />
              <TextInput value={planName} onChangeText={setPlanName} placeholder="Planname (z.B. Oberkörper Push) *" placeholderTextColor={Colors.textMuted} style={styles.input} />
            </View>
            <View style={styles.row}>
              <Edit3 size={18} color={Colors.textSecondary} />
              <TextInput value={planDesc} onChangeText={setPlanDesc} placeholder="Beschreibung (optional)" placeholderTextColor={Colors.textMuted} style={styles.input} multiline />
            </View>

            {/* Selected Exercises */}
            <Text style={styles.exerciseSectionTitle}>
              Übungen ({createExercises.length})
            </Text>
            {createExercises.length === 0 ? (
              <View style={styles.emptyExerciseState}>
                <Dumbbell size={20} color={Colors.textMuted} />
                <Text style={styles.emptyExerciseText}>Suche unten, um Übungen hinzuzufügen</Text>
              </View>
            ) : (
              createExercises.map((ex) => (
                <View key={ex.id} style={styles.selectedExercise}>
                  <View style={styles.selectedExerciseInfo}>
                    <Text style={styles.selectedExerciseName}>{getExerciseName(ex.exerciseId)}</Text>
                    <Text style={styles.selectedExerciseMeta}>{ex.sets.length} Sätze</Text>
                  </View>
                  <TouchableOpacity onPress={() => setCreateExercises(prev => prev.filter(e => e.id !== ex.id))} style={styles.removeExerciseButton}>
                    <X size={16} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))
            )}

            {/* Exercise Search */}
            <View style={[styles.row, { marginTop: Spacing.md }]}>
              <Search size={18} color={Colors.textSecondary} />
              <TextInput
                value={exerciseSearch}
                onChangeText={setExerciseSearch}
                placeholder="Übung suchen..."
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
              />
              {exerciseSearch.length > 0 && (
                <TouchableOpacity onPress={() => setExerciseSearch('')}>
                  <X size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            {filteredCreateExercises.map((ex) => {
              const alreadyAdded = createExercises.some(e => e.exerciseId === ex.id);
              return (
                <TouchableOpacity
                  key={ex.id}
                  style={[styles.exerciseOption, alreadyAdded && { opacity: 0.4 }]}
                  onPress={() => {
                    if (!alreadyAdded) {
                      setCreateExercises(prev => [...prev, makeExerciseEntry(ex.id)]);
                      setExerciseSearch('');
                    }
                  }}
                  disabled={alreadyAdded}
                >
                  <Dumbbell size={16} color={Colors.accent} />
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <Text style={styles.exerciseOptionName}>{ex.name}</Text>
                    <Text style={styles.exerciseOptionMeta}>{ex.muscleGroups.join(', ')}</Text>
                  </View>
                  {alreadyAdded ? <Check size={16} color={Colors.accent} /> : <Plus size={16} color={Colors.textSecondary} />}
                </TouchableOpacity>
              );
            })}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCloseCreate}>
                <Text style={styles.cancelButtonText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryButton, createExercises.length === 0 && { opacity: 0.5 }]} onPress={handleCreatePlan}>
                <ClipboardList size={18} color={Colors.text} />
                <Text style={styles.primaryButtonText}>Plan erstellen ({createExercises.length})</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Plan bearbeiten Modal */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Trainingsplan bearbeiten</Text>
            <TouchableOpacity onPress={handleCloseEdit}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.row}>
              <ClipboardList size={18} color={Colors.textSecondary} />
              <TextInput value={editPlanName} onChangeText={setEditPlanName} placeholder="Planname *" placeholderTextColor={Colors.textMuted} style={styles.input} />
            </View>
            <View style={styles.row}>
              <Edit3 size={18} color={Colors.textSecondary} />
              <TextInput value={editPlanDesc} onChangeText={setEditPlanDesc} placeholder="Beschreibung (optional)" placeholderTextColor={Colors.textMuted} style={styles.input} multiline />
            </View>

            {/* Edit Exercises */}
            <Text style={styles.exerciseSectionTitle}>
              Übungen ({editExercises.length})
            </Text>
            {editExercises.map((ex) => (
              <View key={ex.id} style={styles.selectedExercise}>
                <View style={styles.selectedExerciseInfo}>
                  <Text style={styles.selectedExerciseName}>{getExerciseName(ex.exerciseId)}</Text>
                  <Text style={styles.selectedExerciseMeta}>{ex.sets.length} Sätze</Text>
                </View>
                <TouchableOpacity onPress={() => setEditExercises(prev => prev.filter(e => e.id !== ex.id))} style={styles.removeExerciseButton}>
                  <X size={16} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))}

            {/* Exercise Search for Edit */}
            <View style={[styles.row, { marginTop: Spacing.md }]}>
              <Search size={18} color={Colors.textSecondary} />
              <TextInput
                value={editExerciseSearch}
                onChangeText={setEditExerciseSearch}
                placeholder="Übung suchen..."
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
              />
              {editExerciseSearch.length > 0 && (
                <TouchableOpacity onPress={() => setEditExerciseSearch('')}>
                  <X size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            {filteredEditExercises.map((ex) => {
              const alreadyAdded = editExercises.some(e => e.exerciseId === ex.id);
              return (
                <TouchableOpacity
                  key={ex.id}
                  style={[styles.exerciseOption, alreadyAdded && { opacity: 0.4 }]}
                  onPress={() => {
                    if (!alreadyAdded) {
                      setEditExercises(prev => [...prev, makeExerciseEntry(ex.id)]);
                      setEditExerciseSearch('');
                    }
                  }}
                  disabled={alreadyAdded}
                >
                  <Dumbbell size={16} color={Colors.accent} />
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <Text style={styles.exerciseOptionName}>{ex.name}</Text>
                    <Text style={styles.exerciseOptionMeta}>{ex.muscleGroups.join(', ')}</Text>
                  </View>
                  {alreadyAdded ? <Check size={16} color={Colors.accent} /> : <Plus size={16} color={Colors.textSecondary} />}
                </TouchableOpacity>
              );
            })}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCloseEdit}>
                <Text style={styles.cancelButtonText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleEditPlan}>
                <Edit3 size={18} color={Colors.text} />
                <Text style={styles.primaryButtonText}>Speichern</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Plan zuweisen Modal (Multi-Select) */}
      <Modal visible={showAssignModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Plan Kunden zuweisen</Text>
            <TouchableOpacity onPress={() => setShowAssignModal(false)}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {clients.length === 0 ? (
              <View style={styles.emptyState}>
                <Users size={32} color={Colors.textMuted} />
                <Text style={styles.emptyText}>Keine Kunden vorhanden</Text>
                <Text style={styles.emptySubtext}>Lege zuerst einen Kunden an</Text>
              </View>
            ) : (
              <>
                <Text style={styles.assignHint}>Für jeden Kunden wird eine individuelle Plan-Kopie erstellt.</Text>
                {selectedClientIds.length > 0 && (
                  <Text style={styles.selectionCount}>{selectedClientIds.length} ausgewählt</Text>
                )}
                {clients.map((c) => {
                  const isSelected = selectedClientIds.includes(c.id);
                  const hasInstance = instances.some(i => i.templateId === selectedPlanId && i.assignedTo?.includes(c.id));
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.clientOption, isSelected && styles.clientOptionSelected, hasInstance && styles.clientOptionDisabled]}
                      onPress={() => !hasInstance && toggleClientSelection(c.id)}
                      disabled={hasInstance}
                    >
                      <View style={styles.clientOptionRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.clientOptionText, isSelected && styles.clientOptionTextSelected]}>{c.name}</Text>
                          <Text style={styles.clientOptionEmail}>
                            {c.email}{hasInstance ? ' (Instanz vorhanden)' : ''}
                          </Text>
                        </View>
                        {isSelected && (
                          <Check size={20} color={Colors.accent} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
            {clients.length > 0 && (
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAssignModal(false)}>
                  <Text style={styles.cancelButtonText}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, selectedClientIds.length === 0 && { opacity: 0.5 }]}
                  onPress={handleAssignPlan}
                  disabled={selectedClientIds.length === 0}
                >
                  <Send size={18} color={Colors.text} />
                  <Text style={styles.primaryButtonText}>
                    Zuweisen{selectedClientIds.length > 0 ? ` (${selectedClientIds.length})` : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
      {/* Discard Confirmation */}
      <ConfirmDialog
        visible={showDiscardConfirm}
        title="Nicht gespeicherte Änderungen"
        message="Willst du die Änderungen verwerfen?"
        confirmText="Verwerfen"
        cancelText="Weiter bearbeiten"
        destructive
        onConfirm={() => {
          setShowDiscardConfirm(false);
          if (discardAction) discardAction();
          setDiscardAction(null);
        }}
        onCancel={() => {
          setShowDiscardConfirm(false);
          setDiscardAction(null);
        }}
      />
    </ScrollView>
  );
}

const createStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  card: { backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginTop: Spacing.lg, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  cardTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.accent, padding: Spacing.md, borderRadius: BorderRadius.md },
  primaryButtonText: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  addButton: { backgroundColor: Colors.accent, padding: Spacing.sm, borderRadius: BorderRadius.md },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xl },
  emptyText: { color: Colors.textSecondary, fontSize: 16, marginTop: Spacing.md },
  emptySubtext: { color: Colors.textMuted, fontSize: 14, marginTop: 4 },
  plansList: { gap: Spacing.sm },
  planCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  planInfo: { flex: 1 },
  planName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  planDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  planMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  assignedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  assignedText: { fontSize: 11, color: Colors.accent },
  planActions: { flexDirection: 'column', alignItems: 'center', gap: Spacing.xs },
  actionIcon: { padding: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  input: { flex: 1, height: 44, paddingHorizontal: Spacing.sm, color: Colors.text, fontSize: 15 },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },
  modalContent: { padding: Spacing.lg },
  modalButtons: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
  cancelButton: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceLight, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cancelButtonText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '500' },
  clientOption: { padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.sm, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border },
  clientOptionSelected: { borderColor: Colors.accent, backgroundColor: Colors.accent + '20' },
  clientOptionDisabled: { opacity: 0.5 },
  clientOptionRow: { flexDirection: 'row', alignItems: 'center' },
  clientOptionText: { fontSize: 15, fontWeight: '500', color: Colors.text },
  clientOptionTextSelected: { color: Colors.accent },
  clientOptionEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  selectionCount: { fontSize: 14, color: Colors.accent, fontWeight: '600', marginBottom: Spacing.sm },
  assignHint: { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.md, fontStyle: 'italic' },
  exerciseSectionTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  emptyExerciseState: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed' },
  emptyExerciseText: { fontSize: 13, color: Colors.textMuted, flex: 1 },
  selectedExercise: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.xs, borderWidth: 1, borderColor: Colors.border },
  selectedExerciseInfo: { flex: 1 },
  selectedExerciseName: { fontSize: 14, fontWeight: '500', color: Colors.text },
  selectedExerciseMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  removeExerciseButton: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  exerciseOption: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md, marginBottom: Spacing.xs, borderWidth: 1, borderColor: Colors.border },
  exerciseOptionName: { fontSize: 14, fontWeight: '500', color: Colors.text },
  exerciseOptionMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, height: 40, paddingHorizontal: Spacing.sm, color: Colors.text, fontSize: 14 },
  filterRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.md },
  filterTab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border },
  filterTabActive: { borderColor: Colors.accent, backgroundColor: Colors.accent + '20' },
  filterTabText: { fontSize: 12, color: Colors.textMuted },
  filterTabTextActive: { color: Colors.accent, fontWeight: '600' },
  planCardInstance: { borderLeftWidth: 3, borderLeftColor: Colors.accent },
  planNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  templateBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: Colors.surfaceLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.sm },
  templateBadgeText: { fontSize: 10, color: Colors.textSecondary, fontWeight: '500' },
  instanceBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: Colors.accent + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.sm },
  instanceBadgeText: { fontSize: 10, color: Colors.accent, fontWeight: '600' },
  templateRef: { fontSize: 11, color: Colors.textMuted, marginTop: 2, fontStyle: 'italic' },
  customizedHint: { fontSize: 11, color: Colors.accent, marginTop: 2, fontWeight: '500' },
});
