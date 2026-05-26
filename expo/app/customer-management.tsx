import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Search, User, X, Eye, Activity, Target, Pencil, KeyRound, Mail } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { useClients } from '@/hooks/use-clients';
import { trpcClient } from '@/lib/trpc';
import { confirmAlert, infoAlert } from '@/lib/alert';

import type { User as UserType } from '@/types/workout';

export default function CustomerManagementScreen() {
  const { user } = useAuth();
  const { clients, updateClient, refresh, isOffline } = useClients();
  const params = useLocalSearchParams<{ focus?: string }>();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editClient, setEditClient] = useState<UserType | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; email: string; phone: string }>({ name: '', email: '', phone: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [resendingPw, setResendingPw] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [emailSearchOpen, setEmailSearchOpen] = useState(false);
  const [emailSearchInput, setEmailSearchInput] = useState('');
  const [emailSearching, setEmailSearching] = useState(false);

  const isTrainer = user?.role === 'trainer' || user?.role === 'admin';

  const sortedClients = useMemo(() => {
    const onlyClients = clients.filter(c => c.role === 'client');
    return [...onlyClients].sort((a, b) => {
      const aReq = a.passwordResetRequestedAt ? 1 : 0;
      const bReq = b.passwordResetRequestedAt ? 1 : 0;
      if (aReq !== bReq) return bReq - aReq;
      if (a.passwordResetRequestedAt && b.passwordResetRequestedAt) {
        return b.passwordResetRequestedAt.localeCompare(a.passwordResetRequestedAt);
      }
      return 0;
    });
  }, [clients]);

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return sortedClients;
    const query = searchQuery.toLowerCase();
    return sortedClients.filter(client =>
      client.name.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query) ||
      (client.phone && client.phone.includes(query))
    );
  }, [sortedClients, searchQuery]);

  // Deep-Link aus Push/Notification: ?focus=<clientId> öffnet das Edit-Modal direkt
  useEffect(() => {
    if (!params.focus) return;
    const target = clients.find(c => c.id === params.focus);
    if (target) {
      setEditClient(target);
      setEditForm({ name: target.name, email: target.email, phone: target.phone ?? '' });
    }
  }, [params.focus, clients]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const searchByEmail = async () => {
    const email = emailSearchInput.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      infoAlert('Fehler', 'Bitte gültige E-Mail-Adresse eingeben.');
      return;
    }
    setEmailSearching(true);
    try {
      const result = await trpcClient.clients.findByEmail.query({ email });
      if (!result) {
        infoAlert('Nicht gefunden', `Kein Kunde mit der E-Mail ${email} gefunden.`);
        return;
      }
      setEmailSearchOpen(false);
      setEmailSearchInput('');
      setEditClient(result as unknown as UserType);
      setEditForm({ name: result.name, email: result.email, phone: result.phone ?? '' });
    } catch (e: any) {
      infoAlert('Fehler', e?.message || 'Suche fehlgeschlagen.');
    } finally {
      setEmailSearching(false);
    }
  };

  const openClientDetails = (client: UserType) => {
    // Navigate to the trainer-tabs client-progress screen (with the two tiles + metrics)
    router.push(`/(trainer-tabs)/client-progress/${client.id}` as any);
  };

  const openEdit = (client: UserType) => {
    setEditClient(client);
    setEditForm({ name: client.name, email: client.email, phone: client.phone ?? '' });
  };

  const closeEdit = () => {
    setEditClient(null);
    setSavingEdit(false);
    setResendingPw(false);
  };

  const saveEdit = async () => {
    if (!editClient) return;
    const name = editForm.name.trim();
    const email = editForm.email.trim();
    const phone = editForm.phone.trim();
    if (!name) { infoAlert('Fehler', 'Name darf nicht leer sein.'); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { infoAlert('Fehler', 'Bitte gültige E-Mail-Adresse eingeben.'); return; }
    setSavingEdit(true);
    try {
      await updateClient(editClient.id, {
        name: name !== editClient.name ? name : undefined,
        email: email !== editClient.email ? email : undefined,
        phone: phone !== (editClient.phone ?? '') ? phone : undefined,
      });
      closeEdit();
    } catch (e: any) {
      infoAlert('Fehler', e?.message || 'Speichern fehlgeschlagen.');
    } finally {
      setSavingEdit(false);
    }
  };

  const resendStarterPassword = () => {
    if (!editClient) return;
    confirmAlert(
      'Neues Starter-Passwort senden?',
      `Ein neues Starter-Passwort wird generiert und an ${editForm.email.trim() || editClient.email} gemailt. Das alte Passwort funktioniert danach nicht mehr.`,
      async () => {
        setResendingPw(true);
        try {
          const r = await trpcClient.clients.resendStarterPassword.mutate({ id: editClient.id });
          if (r.emailSent) {
            infoAlert('Gesendet', `E-Mail mit dem neuen Starter-Passwort wurde an ${r.email} verschickt.`);
          } else {
            infoAlert('Passwort generiert', `Neues Starter-Passwort: ${r.password}\n\nVersand per E-Mail nicht möglich. Bitte manuell weitergeben.`);
          }
        } catch (e: any) {
          infoAlert('Fehler', e?.message || 'Konnte Passwort nicht erneuern.');
        } finally {
          setResendingPw(false);
        }
      },
      { confirmLabel: 'Senden' },
    );
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
          <View style={styles.headerRow}>
            <Text style={styles.resultCount}>
              {filteredClients.length} von {sortedClients.length} Kunden
            </Text>
            <TouchableOpacity
              onPress={() => setEmailSearchOpen(true)}
              hitSlop={8}
              style={styles.emailSearchButton}
            >
              <Mail size={14} color={Colors.accent} />
              <Text style={styles.emailSearchText}>Kunde per E-Mail suchen</Text>
            </TouchableOpacity>
          </View>
          {isOffline && (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineText}>Offline — gecachte Daten möglicherweise veraltet. Nach unten ziehen zum Aktualisieren.</Text>
            </View>
          )}
        </View>

        {/* Clients List */}
        <ScrollView
          style={styles.clientsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
          }
        >
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
            filteredClients.map((client) => {
              const hasReset = !!client.passwordResetRequestedAt;
              return (
                <View key={client.id} style={[styles.clientCard, hasReset && styles.clientCardHighlight]}>
                  {hasReset && (
                    <View style={styles.resetBadge}>
                      <KeyRound size={12} color={Colors.background} />
                      <Text style={styles.resetBadgeText}>Passwort-Reset angefragt</Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => openClientDetails(client)}>
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
                  </TouchableOpacity>

                  <View style={styles.clientActions}>
                    <TouchableOpacity
                      onPress={() => openClientDetails(client)}
                      style={styles.actionButton}
                      hitSlop={8}
                    >
                      <Eye size={16} color={Colors.textSecondary} />
                      <Text style={styles.actionText}>Details ansehen</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => openEdit(client)}
                      style={styles.actionButton}
                      hitSlop={8}
                    >
                      <Pencil size={16} color={Colors.accent} />
                      <Text style={[styles.actionText, { color: Colors.accent }]}>Bearbeiten</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Edit-Modal: Kunde bearbeiten + Starter-Passwort neu senden */}
        <Modal visible={!!editClient} animationType="slide" transparent onRequestClose={closeEdit}>
          <View style={styles.editBackdrop}>
            <View style={styles.editCard}>
              <View style={styles.editHeader}>
                <Text style={styles.editTitle}>Kunde bearbeiten</Text>
                <TouchableOpacity onPress={closeEdit} hitSlop={8}>
                  <X size={22} color={Colors.text} />
                </TouchableOpacity>
              </View>

              {editClient?.passwordResetRequestedAt && (
                <View style={styles.resetNotice}>
                  <KeyRound size={14} color={Colors.accent} />
                  <Text style={styles.resetNoticeText}>
                    Dieser Kunde hat ein Passwort-Reset angefragt am {new Date(editClient.passwordResetRequestedAt).toLocaleString('de-DE')}.
                  </Text>
                </View>
              )}

              <Text style={styles.editLabel}>Name</Text>
              <TextInput
                value={editForm.name}
                onChangeText={v => setEditForm({ ...editForm, name: v })}
                placeholder="Name"
                placeholderTextColor={Colors.textMuted}
                style={styles.editInput}
              />

              <Text style={styles.editLabel}>E-Mail</Text>
              <TextInput
                value={editForm.email}
                onChangeText={v => setEditForm({ ...editForm, email: v })}
                placeholder="E-Mail"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.editInput}
              />

              <Text style={styles.editLabel}>Telefon</Text>
              <TextInput
                value={editForm.phone}
                onChangeText={v => setEditForm({ ...editForm, phone: v })}
                placeholder="Telefon (optional)"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
                style={styles.editInput}
              />

              <TouchableOpacity
                style={[styles.editPrimary, savingEdit && { opacity: 0.6 }]}
                onPress={saveEdit}
                disabled={savingEdit || resendingPw}
              >
                {savingEdit ? (
                  <ActivityIndicator color={Colors.text} />
                ) : (
                  <Text style={styles.editPrimaryText}>Speichern</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.editSecondary, resendingPw && { opacity: 0.6 }]}
                onPress={resendStarterPassword}
                disabled={savingEdit || resendingPw}
              >
                <KeyRound size={16} color={Colors.accent} />
                {resendingPw ? (
                  <ActivityIndicator color={Colors.accent} style={{ marginLeft: Spacing.sm }} />
                ) : (
                  <Text style={styles.editSecondaryText}>Starter-Passwort neu senden</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.editHint}>
                Generiert ein neues Starter-Passwort und mailt es an die oben hinterlegte E-Mail. Bei Tippfehler in der E-Mail vorher Speichern.
              </Text>
            </View>
          </View>
        </Modal>

        {/* Email-Search-Modal: Notfall-Fallback wenn Kunde nicht in Liste */}
        <Modal visible={emailSearchOpen} animationType="slide" transparent onRequestClose={() => setEmailSearchOpen(false)}>
          <View style={styles.editBackdrop}>
            <View style={styles.editCard}>
              <View style={styles.editHeader}>
                <Text style={styles.editTitle}>Kunde per E-Mail suchen</Text>
                <TouchableOpacity onPress={() => setEmailSearchOpen(false)} hitSlop={8}>
                  <X size={22} color={Colors.text} />
                </TouchableOpacity>
              </View>
              <Text style={styles.editHint}>
                Falls ein Kunde in deiner Liste fehlt (z.B. nach einem Schema-Update), kannst du ihn hier direkt per E-Mail finden und bearbeiten.
              </Text>
              <Text style={styles.editLabel}>E-Mail</Text>
              <TextInput
                value={emailSearchInput}
                onChangeText={setEmailSearchInput}
                placeholder="kunde@example.com"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.editInput}
              />
              <TouchableOpacity
                style={[styles.editPrimary, emailSearching && { opacity: 0.6 }]}
                onPress={searchByEmail}
                disabled={emailSearching}
              >
                {emailSearching ? (
                  <ActivityIndicator color={Colors.text} />
                ) : (
                  <Text style={styles.editPrimaryText}>Suchen</Text>
                )}
              </TouchableOpacity>
            </View>
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
  clientCardHighlight: {
    borderColor: Colors.accent,
    borderWidth: 2,
  },
  resetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  resetBadgeText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  resetNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  resetNoticeText: {
    flex: 1,
    color: Colors.text,
    fontSize: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  emailSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  emailSearchText: {
    color: Colors.accent,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  offlineBanner: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  offlineText: {
    color: Colors.textSecondary,
    fontSize: 12,
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
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
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
  editBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  editCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  editTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  editLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
    marginTop: Spacing.sm,
  },
  editInput: {
    backgroundColor: Colors.surfaceLight,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    fontSize: 16,
  },
  editPrimary: {
    backgroundColor: Colors.accent,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  editPrimaryText: {
    color: Colors.text,
    fontWeight: '700' as const,
    fontSize: 16,
  },
  editSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.accent,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  editSecondaryText: {
    color: Colors.accent,
    fontWeight: '600' as const,
    fontSize: 15,
  },
  editHint: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: Spacing.sm,
    lineHeight: 16,
  },
});