import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { Stack, router } from 'expo-router';
import { Search, User, TrendingUp, Plus, X, Eye, Activity, Award, Target } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { useClients } from '@/hooks/use-clients';

import type { User as UserType } from '@/types/workout';

export default function CustomerManagementScreen() {
  const { user } = useAuth();
  const { clients } = useClients();

  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<UserType | null>(null);
  const [showClientDetails, setShowClientDetails] = useState<boolean>(false);


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

  // Mock visit data - in production this would come from a backend
  const getClientVisits = (clientId: string) => {
    const mockVisits = [
      { id: '1', date: '2024-01-15', type: 'Krafttraining', duration: 60, notes: 'Gutes Training, Steigerung bei Bankdrücken' },
      { id: '2', date: '2024-01-12', type: 'Cardio', duration: 45, notes: 'Ausdauer verbessert' },
      { id: '3', date: '2024-01-10', type: 'Krafttraining', duration: 75, notes: 'Neue Übungen eingeführt' },
    ];
    return mockVisits;
  };

  // Mock performance data
  const getClientPerformance = (clientId: string) => {
    return {
      totalWorkouts: selectedClient?.stats?.totalWorkouts || 0,
      totalVolume: selectedClient?.stats?.totalVolume || 0,
      currentStreak: selectedClient?.stats?.currentStreak || 0,
      longestStreak: selectedClient?.stats?.longestStreak || 0,
      personalRecords: selectedClient?.stats?.personalRecords || {},
      improvements: [
        { exercise: 'Bankdrücken', improvement: '+5kg', date: '2024-01-15' },
        { exercise: 'Kniebeugen', improvement: '+10kg', date: '2024-01-12' },
        { exercise: 'Kreuzheben', improvement: '+7.5kg', date: '2024-01-10' },
      ]
    };
  };



  const handleCreatePlanForClient = () => {
    if (!selectedClient) {
      Alert.alert('Fehler', 'Kein Kunde ausgewählt');
      return;
    }

    // Navigate to schedule-training with pre-selected client
    setShowClientDetails(false);
    router.push(`/schedule-training?clientId=${selectedClient.id}`);
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
                {searchQuery ? 'Versuchen Sie einen anderen Suchbegriff' : 'Legen Sie Ihren ersten Kunden an'}
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
              <TouchableOpacity onPress={() => setShowClientDetails(false)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {selectedClient && (
                <>
                  {/* Client Info */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Kontaktdaten</Text>
                    <View style={styles.infoCard}>
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
                          {getClientPerformance(selectedClient.id).improvements.length}
                        </Text>
                        <Text style={styles.performanceLabel}>Verbesserungen</Text>
                      </View>
                    </View>
                  </View>

                  {/* Recent Visits */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Letzte Besuche</Text>
                    {getClientVisits(selectedClient.id).map((visit) => (
                      <View key={visit.id} style={styles.visitCard}>
                        <View style={styles.visitHeader}>
                          <Text style={styles.visitDate}>
                            {new Date(visit.date).toLocaleDateString('de-DE')}
                          </Text>
                          <Text style={styles.visitType}>{visit.type}</Text>
                        </View>
                        <Text style={styles.visitDuration}>{visit.duration} Min</Text>
                        <Text style={styles.visitNotes}>{visit.notes}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Recent Improvements */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Aktuelle Verbesserungen</Text>
                    {getClientPerformance(selectedClient.id).improvements.map((improvement, index) => (
                      <View key={index} style={styles.improvementCard}>
                        <View style={styles.improvementInfo}>
                          <Text style={styles.improvementExercise}>{improvement.exercise}</Text>
                          <Text style={styles.improvementDate}>
                            {new Date(improvement.date).toLocaleDateString('de-DE')}
                          </Text>
                        </View>
                        <Text style={styles.improvementValue}>{improvement.improvement}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={styles.primaryButton}
                      onPress={handleCreatePlanForClient}
                    >
                      <Plus size={18} color={Colors.text} />
                      <Text style={styles.primaryButtonText}>Trainingsplan erstellen</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </Modal>


      </View>
    </>
  );
}

const styles = StyleSheet.create({
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
});