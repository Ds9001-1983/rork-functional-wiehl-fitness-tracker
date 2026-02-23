import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { Stack, router } from 'expo-router';
import { Search, User, TrendingUp, Plus, X, Eye, Activity, Award, Target, Edit3, Check, Trash2, ClipboardList } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { useClients } from '@/hooks/use-clients';
import { useWorkouts } from '@/hooks/use-workouts';

import type { User as UserType } from '@/types/workout';
import StatusBanner from '@/components/StatusBanner';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function CustomerManagementScreen() {
  const { user } = useAuth();
  const { clients, updateClient, removeClient } = useClients();
  const { workoutPlans, updateWorkoutPlan } = useWorkouts();
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);


  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<UserType | null>(null);
  const [showClientDetails, setShowClientDetails] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{type: 'error' | 'success'; text: string} | null>(null);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isTrainer = user?.role === 'trainer' || user?.role === 'admin';

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    
    const query = searchQuery.toLowerCase();
    return clients.filter(client => 
      client.name.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query) ||
      (client.phone && client.phone.includes(query))
    );
  }, [clients, searchQuery]);

  const getClientPerformance = (clientId: string) => {
    const stats = selectedClient?.stats;
    const recordCount = stats?.personalRecords ? Object.keys(stats.personalRecords).length : 0;
    return {
      totalWorkouts: stats?.totalWorkouts || 0,
      totalVolume: stats?.totalVolume || 0,
      currentStreak: stats?.currentStreak || 0,
      longestStreak: stats?.longestStreak || 0,
      personalRecords: stats?.personalRecords || {},
      recordCount,
    };
  };



  const handleCreatePlanForClient = () => {
    if (!selectedClient) {
      setStatusMessage({ type: 'error', text: 'Kein Kunde ausgewählt' });
      return;
    }

    // Navigate to schedule-training with pre-selected client
    setShowClientDetails(false);
    router.push(`/schedule-training?clientId=${selectedClient.id}`);
  };

  const startEditing = () => {
    if (!selectedClient) return;
    setEditName(selectedClient.name);
    setEditPhone(selectedClient.phone || '');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveClientEdit = async () => {
    if (!selectedClient) return;
    if (!editName.trim()) {
      setStatusMessage({ type: 'error', text: 'Bitte einen Namen eingeben.' });
      return;
    }
    try {
      await updateClient(selectedClient.id, {
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
      });
      setSelectedClient({
        ...selectedClient,
        name: editName.trim(),
        phone: editPhone.trim(),
      });
      setIsEditing(false);
      setStatusMessage({ type: 'success', text: 'Kundendaten wurden aktualisiert.' });
    } catch {
      setStatusMessage({ type: 'error', text: 'Kundendaten konnten nicht aktualisiert werden.' });
    }
  };

  const getClientPlans = (clientId: string) => {
    return workoutPlans.filter(p => p.assignedTo?.includes(clientId));
  };

  const handleUnassignPlan = async (planId: string) => {
    if (!selectedClient) return;
    const plan = workoutPlans.find(p => p.id === planId);
    if (!plan) return;
    try {
      const updatedPlan = {
        ...plan,
        assignedTo: (plan.assignedTo || []).filter(id => id !== selectedClient.id),
      };
      await updateWorkoutPlan(planId, updatedPlan);
      setStatusMessage({ type: 'success', text: 'Trainingsplan wurde entfernt.' });
    } catch {
      setStatusMessage({ type: 'error', text: 'Plan konnte nicht entfernt werden.' });
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;
    try {
      await removeClient(selectedClient.id);
      setShowDeleteConfirm(false);
      setShowClientDetails(false);
      setIsEditing(false);
      setStatusMessage({ type: 'success', text: 'Kunde wurde entfernt.' });
    } catch {
      setStatusMessage({ type: 'error', text: 'Kunde konnte nicht entfernt werden.' });
    }
  };

  const openClientDetails = (client: UserType) => {
    setSelectedClient(client);
    setShowClientDetails(true);
  };

  if (!isTrainer) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centeredText}>Nur für Trainer verfügbar</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Kundenverwaltung' }} />
      <View style={styles.container}>
        {statusMessage && (
          <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
            <StatusBanner
              type={statusMessage.type}
              text={statusMessage.text}
              onDismiss={() => setStatusMessage(null)}
            />
          </View>
        )}
        {/* Search Header */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Search size={20} color={Colors.textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Kunde suchen (Name, E-Mail, Telefon)..."
              placeholderTextColor={Colors.textMuted}
              style={styles.searchInput}
            />
          </View>
          <Text style={styles.resultCount}>
            {filteredClients.length} von {clients.length} Kunden
          </Text>
        </View>

        {/* Clients List */}
        <ScrollView style={styles.clientsList} showsVerticalScrollIndicator={false}>
          {filteredClients.length === 0 ? (
            <View style={styles.emptyState}>
              <User size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'Keine Kunden gefunden' : 'Noch keine Kunden'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'Versuche einen anderen Suchbegriff' : 'Lege deinen ersten Kunden an'}
              </Text>
            </View>
          ) : (
            filteredClients.map((client) => (
              <TouchableOpacity
                key={client.id}
                style={styles.clientCard}
                onPress={() => openClientDetails(client)}
              >
                <View style={styles.clientHeader}>
                  <View style={styles.clientAvatar}>
                    <User size={24} color={Colors.text} />
                  </View>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{client.name}</Text>
                    <Text style={styles.clientEmail}>{client.email}</Text>
                    {client.phone && (
                      <Text style={styles.clientPhone}>📱 {client.phone}</Text>
                    )}
                  </View>
                  <View style={styles.clientStats}>
                    <View style={styles.statItem}>
                      <Activity size={14} color={Colors.accent} />
                      <Text style={styles.statText}>{client.stats?.totalWorkouts || 0}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Target size={14} color={Colors.accent} />
                      <Text style={styles.statText}>{client.stats?.currentStreak || 0}</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.clientActions}>
                  <View style={styles.actionButton}>
                    <Eye size={16} color={Colors.textSecondary} />
                    <Text style={styles.actionText}>Details ansehen</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Client Details Modal */}
        <Modal
          visible={showClientDetails}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedClient?.name}
              </Text>
              <TouchableOpacity onPress={() => { setShowClientDetails(false); setIsEditing(false); }}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {selectedClient && (
                <>
                  {/* Client Info */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>Kontaktdaten</Text>
                      {!isEditing ? (
                        <TouchableOpacity onPress={startEditing} style={styles.editIconButton}>
                          <Edit3 size={18} color={Colors.accent} />
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.editActionsRow}>
                          <TouchableOpacity onPress={cancelEditing} style={styles.editIconButton}>
                            <X size={18} color={Colors.textSecondary} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={saveClientEdit} style={styles.editIconButton}>
                            <Check size={18} color={Colors.accent} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    <View style={styles.infoCard}>
                      {isEditing ? (
                        <>
                          <Text style={styles.infoLabel}>Name:</Text>
                          <TextInput
                            value={editName}
                            onChangeText={setEditName}
                            style={styles.textInput}
                            placeholder="Name"
                            placeholderTextColor={Colors.textMuted}
                          />
                          <Text style={styles.infoLabel}>Telefon:</Text>
                          <TextInput
                            value={editPhone}
                            onChangeText={setEditPhone}
                            style={styles.textInput}
                            placeholder="Telefonnummer"
                            placeholderTextColor={Colors.textMuted}
                            keyboardType="phone-pad"
                          />
                          <Text style={styles.infoLabel}>E-Mail:</Text>
                          <Text style={[styles.infoValue, { opacity: 0.5 }]}>{selectedClient.email}</Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.infoLabel}>Name:</Text>
                          <Text style={styles.infoValue}>{selectedClient.name}</Text>
                          <Text style={styles.infoLabel}>E-Mail:</Text>
                          <Text style={styles.infoValue}>{selectedClient.email}</Text>
                          {selectedClient.phone && (
                            <>
                              <Text style={styles.infoLabel}>Telefon:</Text>
                              <Text style={styles.infoValue}>{selectedClient.phone}</Text>
                            </>
                          )}
                          <Text style={styles.infoLabel}>Mitglied seit:</Text>
                          <Text style={styles.infoValue}>
                            {new Date(selectedClient.joinDate).toLocaleDateString('de-DE')}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>

                  {/* Performance Overview */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Leistungsübersicht</Text>
                    <View style={styles.performanceGrid}>
                      <View style={styles.performanceCard}>
                        <Activity size={20} color={Colors.accent} />
                        <Text style={styles.performanceValue}>
                          {getClientPerformance(selectedClient.id).totalWorkouts}
                        </Text>
                        <Text style={styles.performanceLabel}>Workouts</Text>
                      </View>
                      <View style={styles.performanceCard}>
                        <TrendingUp size={20} color={Colors.accent} />
                        <Text style={styles.performanceValue}>
                          {getClientPerformance(selectedClient.id).currentStreak}
                        </Text>
                        <Text style={styles.performanceLabel}>Streak</Text>
                      </View>
                      <View style={styles.performanceCard}>
                        <Award size={20} color={Colors.accent} />
                        <Text style={styles.performanceValue}>
                          {getClientPerformance(selectedClient.id).recordCount}
                        </Text>
                        <Text style={styles.performanceLabel}>Rekorde</Text>
                      </View>
                    </View>
                  </View>

                  {/* Training Plans */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Trainingspläne</Text>
                    {getClientPlans(selectedClient.id).length === 0 ? (
                      <View style={styles.emptyPlanState}>
                        <ClipboardList size={24} color={Colors.textMuted} />
                        <Text style={styles.emptyPlanText}>Keine Pläne zugewiesen</Text>
                      </View>
                    ) : (
                      getClientPlans(selectedClient.id).map((plan) => (
                        <View key={plan.id} style={styles.planItem}>
                          <View style={styles.planItemInfo}>
                            <Text style={styles.planItemName}>{plan.name}</Text>
                            {plan.description ? (
                              <Text style={styles.planItemDesc}>{plan.description}</Text>
                            ) : null}
                            <Text style={styles.planItemMeta}>
                              {plan.exercises.length} Übungen
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleUnassignPlan(plan.id)}
                            style={styles.unassignButton}
                          >
                            <X size={16} color={Colors.error} />
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </View>

                  {/* Stats Summary */}
                  {getClientPerformance(selectedClient.id).totalVolume > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Zusammenfassung</Text>
                      <View style={styles.infoCard}>
                        <Text style={styles.infoLabel}>Gesamtvolumen:</Text>
                        <Text style={styles.infoValue}>
                          {Math.round(getClientPerformance(selectedClient.id).totalVolume).toLocaleString('de-DE')} kg
                        </Text>
                        <Text style={styles.infoLabel}>Längste Serie:</Text>
                        <Text style={styles.infoValue}>
                          {getClientPerformance(selectedClient.id).longestStreak} Tage
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={handleCreatePlanForClient}
                    >
                      <Plus size={18} color={Colors.text} />
                      <Text style={styles.primaryButtonText}>Trainingsplan erstellen</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 size={18} color={Colors.error} />
                      <Text style={styles.deleteButtonText}>Kunde entfernen</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </Modal>

        {/* Delete Confirmation */}
        {selectedClient && (
          <ConfirmDialog
            visible={showDeleteConfirm}
            title="Kunde entfernen"
            message={`Möchtest du ${selectedClient.name} wirklich entfernen? Diese Aktion kann nicht rückgängig gemacht werden.`}
            confirmText="Entfernen"
            cancelText="Abbrechen"
            destructive
            onConfirm={handleDeleteClient}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}

      </View>
    </>
  );
}

const createStyles = (Colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  centeredText: {
    color: Colors.text,
    fontSize: 16,
  },
  searchContainer: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    marginLeft: Spacing.sm,
  },
  resultCount: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: Spacing.sm,
  },
  clientsList: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  clientCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  clientEmail: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 2,
  },
  clientPhone: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  clientStats: {
    alignItems: 'flex-end',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
    marginLeft: 4,
  },
  clientActions: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginLeft: Spacing.xs,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: Spacing.md,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 4,
    marginTop: Spacing.sm,
  },
  infoValue: {
    color: Colors.text,
    fontSize: 16,
    marginBottom: Spacing.xs,
  },
  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  performanceValue: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '700' as const,
    marginVertical: Spacing.xs,
  },
  performanceLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  visitCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  visitDate: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  visitType: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  visitDuration: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: Spacing.xs,
  },
  visitNotes: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  improvementCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  improvementInfo: {
    flex: 1,
  },
  improvementExercise: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  improvementDate: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  improvementValue: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  actionButtons: {
    marginTop: Spacing.lg,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  primaryButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
    marginLeft: Spacing.sm,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.accent,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  secondaryButtonText: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: '600' as const,
    marginLeft: Spacing.sm,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: Spacing.sm,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  planPreview: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  previewTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: Spacing.md,
  },
  exercisePreview: {
    marginBottom: Spacing.sm,
  },
  exerciseName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  exerciseDetails: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  cancelButton: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '500' as const,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  editIconButton: {
    padding: Spacing.xs,
  },
  editActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  emptyPlanState: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyPlanText: {
    color: Colors.textMuted,
    fontSize: 14,
    marginTop: Spacing.sm,
  },
  planItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  planItemInfo: {
    flex: 1,
  },
  planItemName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  planItemDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  planItemMeta: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  unassignButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.error,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  deleteButtonText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '600' as const,
    marginLeft: Spacing.sm,
  },
});