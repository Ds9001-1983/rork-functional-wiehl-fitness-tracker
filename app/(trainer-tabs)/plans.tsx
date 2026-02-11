import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { router } from 'expo-router';
import { ClipboardList, Plus, Send, X, Edit3, Users, Trash2, Copy } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { useClients } from '@/hooks/use-clients';
import { useWorkouts } from '@/hooks/use-workouts';
import type { WorkoutExercise, WorkoutPlan } from '@/types/workout';
import StatusBanner from '@/components/StatusBanner';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function TrainerPlansScreen() {
  const { user } = useAuth();
  const { clients } = useClients();
  const { createWorkoutPlan, assignPlanToUser, updateWorkoutPlan, deletePlan, duplicatePlan, workoutPlans } = useWorkouts();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
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

  const sampleExercises: WorkoutExercise[] = [
    { id: 'e1', exerciseId: 'bench_press', sets: [{ id: 's1', reps: 8, weight: 60, completed: false, type: 'normal' as const }] },
    { id: 'e2', exerciseId: 'overhead_press', sets: [{ id: 's2', reps: 6, weight: 40, completed: false, type: 'normal' as const }] },
  ];

  const handleCreatePlan = async () => {
    if (!planName.trim()) {
      setStatusMessage({ type: 'error', text: 'Bitte einen Plannamen eingeben.' });
      return;
    }
    try {
      await createWorkoutPlan({
        name: planName.trim(),
        description: planDesc.trim(),
        exercises: sampleExercises,
        createdBy: user?.id || '',
        assignedTo: [],
      });
      setShowCreateModal(false);
      setPlanName('');
      setPlanDesc('');
      setStatusMessage({ type: 'success', text: `Trainingsplan "${planName}" wurde erstellt.` });
    } catch {
      setStatusMessage({ type: 'error', text: 'Plan konnte nicht erstellt werden.' });
    }
  };

  const handleAssignPlan = async () => {
    if (!selectedPlanId || !selectedClientId) {
      setStatusMessage({ type: 'error', text: 'Bitte Plan und Kunde auswaehlen.' });
      return;
    }
    try {
      await assignPlanToUser(selectedPlanId, selectedClientId);
      setShowAssignModal(false);
      setSelectedClientId('');
      setSelectedPlanId('');
      setStatusMessage({ type: 'success', text: 'Plan wurde dem Kunden zugewiesen.' });
    } catch {
      setStatusMessage({ type: 'error', text: 'Plan konnte nicht zugewiesen werden.' });
    }
  };

  const openEditModal = (plan: WorkoutPlan) => {
    setEditPlanId(plan.id);
    setEditPlanName(plan.name);
    setEditPlanDesc(plan.description || '');
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
      await updateWorkoutPlan(editPlanId, {
        ...plan,
        name: editPlanName.trim(),
        description: editPlanDesc.trim(),
      });
      setShowEditModal(false);
      setStatusMessage({ type: 'success', text: 'Plan wurde aktualisiert.' });
    } catch {
      setStatusMessage({ type: 'error', text: 'Plan konnte nicht aktualisiert werden.' });
    }
  };

  const handleDeletePlan = async () => {
    try {
      await deletePlan(deletePlanId);
      setShowDeleteConfirm(false);
      setDeletePlanId('');
      setStatusMessage({ type: 'success', text: 'Trainingsplan wurde geloescht.' });
    } catch {
      setStatusMessage({ type: 'error', text: 'Plan konnte nicht geloescht werden.' });
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
    const count = plan?.assignedTo?.length || 0;
    if (count > 0) {
      return `Dieser Plan ist ${count} Kunde${count !== 1 ? 'n' : ''} zugewiesen. Moechten Sie ihn trotzdem loeschen?`;
    }
    return 'Moechten Sie diesen Trainingsplan wirklich loeschen?';
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
          <Text style={styles.cardTitle}>Trainingsplaene ({workoutPlans.length})</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateModal(true)}>
            <Plus size={18} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {workoutPlans.length === 0 ? (
          <View style={styles.emptyState}>
            <ClipboardList size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Noch keine Trainingsplaene erstellt</Text>
            <Text style={styles.emptySubtext}>Erstellen Sie Ihren ersten Plan</Text>
          </View>
        ) : (
          <View style={styles.plansList}>
            {workoutPlans.map((plan) => {
              const assignedCount = getAssignedCount(plan);
              return (
                <View key={plan.id} style={styles.planCard}>
                  <View style={styles.planInfo}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    {plan.description ? <Text style={styles.planDesc}>{plan.description}</Text> : null}
                    <Text style={styles.planMeta}>{plan.exercises.length} Uebungen</Text>
                    {assignedCount > 0 && (
                      <View style={styles.assignedBadge}>
                        <Users size={12} color={Colors.accent} />
                        <Text style={styles.assignedText}>
                          {assignedCount} Kunde{assignedCount !== 1 ? 'n' : ''} zugewiesen
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.planActions}>
                    <TouchableOpacity style={styles.actionIcon} onPress={() => openEditModal(plan)}>
                      <Edit3 size={16} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionIcon} onPress={() => handleDuplicatePlan(plan.id)}>
                      <Copy size={16} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionIcon}
                      onPress={() => {
                        setSelectedPlanId(plan.id);
                        setSelectedClientId('');
                        setShowAssignModal(true);
                      }}
                    >
                      <Send size={16} color={Colors.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionIcon}
                      onPress={() => {
                        setDeletePlanId(plan.id);
                        setShowDeleteConfirm(true);
                      }}
                    >
                      <Trash2 size={16} color={Colors.error} />
                    </TouchableOpacity>
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
        title="Trainingsplan loeschen"
        message={getDeleteMessage()}
        confirmText="Loeschen"
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
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.row}>
              <ClipboardList size={18} color={Colors.textSecondary} />
              <TextInput value={planName} onChangeText={setPlanName} placeholder="Planname (z.B. Oberkoerper Push) *" placeholderTextColor={Colors.textMuted} style={styles.input} />
            </View>
            <View style={styles.row}>
              <Edit3 size={18} color={Colors.textSecondary} />
              <TextInput value={planDesc} onChangeText={setPlanDesc} placeholder="Beschreibung (optional)" placeholderTextColor={Colors.textMuted} style={styles.input} multiline />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCreateModal(false)}>
                <Text style={styles.cancelButtonText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleCreatePlan}>
                <ClipboardList size={18} color={Colors.text} />
                <Text style={styles.primaryButtonText}>Plan erstellen</Text>
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
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.row}>
              <ClipboardList size={18} color={Colors.textSecondary} />
              <TextInput value={editPlanName} onChangeText={setEditPlanName} placeholder="Planname *" placeholderTextColor={Colors.textMuted} style={styles.input} />
            </View>
            <View style={styles.row}>
              <Edit3 size={18} color={Colors.textSecondary} />
              <TextInput value={editPlanDesc} onChangeText={setEditPlanDesc} placeholder="Beschreibung (optional)" placeholderTextColor={Colors.textMuted} style={styles.input} multiline />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowEditModal(false)}>
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

      {/* Plan zuweisen Modal */}
      <Modal visible={showAssignModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Plan einem Kunden zuweisen</Text>
            <TouchableOpacity onPress={() => setShowAssignModal(false)}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {clients.length === 0 ? (
              <View style={styles.emptyState}>
                <Users size={32} color={Colors.textMuted} />
                <Text style={styles.emptyText}>Keine Kunden vorhanden</Text>
                <Text style={styles.emptySubtext}>Legen Sie zuerst einen Kunden an</Text>
              </View>
            ) : (
              clients.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.clientOption, selectedClientId === c.id && styles.clientOptionSelected]}
                  onPress={() => setSelectedClientId(c.id)}
                >
                  <Text style={[styles.clientOptionText, selectedClientId === c.id && styles.clientOptionTextSelected]}>{c.name}</Text>
                  <Text style={styles.clientOptionEmail}>{c.email}</Text>
                </TouchableOpacity>
              ))
            )}
            {clients.length > 0 && (
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAssignModal(false)}>
                  <Text style={styles.cancelButtonText}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryButton, !selectedClientId && { opacity: 0.5 }]} onPress={handleAssignPlan} disabled={!selectedClientId}>
                  <Send size={18} color={Colors.text} />
                  <Text style={styles.primaryButtonText}>Zuweisen</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  actionIcon: { padding: Spacing.xs },
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
  clientOptionText: { fontSize: 15, fontWeight: '500', color: Colors.text },
  clientOptionTextSelected: { color: Colors.accent },
  clientOptionEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
});
