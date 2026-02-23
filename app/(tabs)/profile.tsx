import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LogOut, User, Settings, Award, Users, Lock, Edit3, Phone, ChevronRight, X, Zap, Ruler, Trophy, Target, Shield, Download, Trash2, Bell, BellOff, MessageSquare, Camera, Calculator } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { useClients } from '@/hooks/use-clients';
import { useWorkouts } from '@/hooks/use-workouts';
import { useGamification } from '@/hooks/use-gamification';
import ConfirmDialog from '@/components/ConfirmDialog';
import StatusBanner from '@/components/StatusBanner';
import { trpcClient } from '@/lib/trpc';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, switchRole, updateProfile, isAuthenticated, isLoading } = useAuth();
  const { clients } = useClients();
  const { getWorkoutHistory, getPersonalRecords } = useWorkouts();
  const { gamification, level, levelName, xpProgress, unlockedBadges } = useGamification();
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Check push notification status
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushEnabled(Notification.permission === 'granted');
    }
  }, []);

  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditPhone(user.phone || '');
    }
  }, [user]);

  const userWorkouts = getWorkoutHistory();
  const personalRecords = getPersonalRecords();
  const recordCount = Object.keys(personalRecords).length;

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      setStatusMessage({ type: 'error', text: 'Beim Abmelden ist ein Fehler aufgetreten.' });
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      setStatusMessage({ type: 'error', text: 'Name darf nicht leer sein.' });
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
      });
      setShowEditModal(false);
      setStatusMessage({ type: 'success', text: 'Dein Profil wurde aktualisiert.' });
    } catch (error) {
      setStatusMessage({ type: 'error', text: 'Profil konnte nicht gespeichert werden.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSwitchRole = () => {
    if (user?.role === 'trainer') {
      switchRole();
    } else if (user?.role === 'client') {
      switchRole();
    }
  };

  const handleTogglePush = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setStatusMessage({ type: 'info', text: 'Push-Benachrichtigungen werden von diesem Browser nicht unterstützt.' });
      return;
    }

    setPushLoading(true);
    try {
      if (!pushEnabled) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // Subscribe to push
          const registration = await navigator.serviceWorker?.ready;
          if (registration) {
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              // Use a placeholder VAPID key - replace with real one in production
              applicationServerKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkGs-GDx6QkrJIO8JpyTPSxXgUoN_q-KB14Xhxp4us',
            });
            const p256dh = btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!)));
            const auth = btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)));
            await trpcClient.notifications.subscribePush.mutate({
              endpoint: subscription.endpoint,
              keys: { p256dh, auth },
            });
            setPushEnabled(true);
            setStatusMessage({ type: 'success', text: 'Push-Benachrichtigungen aktiviert!' });
          }
        } else {
          setStatusMessage({ type: 'info', text: 'Push-Berechtigung wurde abgelehnt. Bitte ändere dies in den Browser-Einstellungen.' });
        }
      } else {
        // Unsubscribe
        const registration = await navigator.serviceWorker?.ready;
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            await trpcClient.notifications.unsubscribePush.mutate({ endpoint: subscription.endpoint });
            await subscription.unsubscribe();
          }
        }
        setPushEnabled(false);
        setStatusMessage({ type: 'success', text: 'Push-Benachrichtigungen deaktiviert.' });
      }
    } catch (error) {
      console.error('[Push] Error:', error);
      setStatusMessage({ type: 'error', text: 'Fehler bei Push-Benachrichtigungen.' });
    } finally {
      setPushLoading(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await trpcClient.privacy.exportData.query();
      // Create a downloadable JSON string
      const jsonString = JSON.stringify(data, null, 2);
      // On web, trigger download
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fitness-daten-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
      setStatusMessage({ type: 'success', text: 'Deine Daten wurden exportiert.' });
    } catch (e) {
      setStatusMessage({ type: 'error', text: 'Datenexport fehlgeschlagen. Bitte versuche es erneut.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirmEmail || deleteConfirmEmail !== user?.email) {
      setStatusMessage({ type: 'error', text: 'Bitte gib deine E-Mail-Adresse korrekt ein.' });
      return;
    }
    setIsDeleting(true);
    try {
      await trpcClient.privacy.deleteAccount.mutate({ confirmEmail: deleteConfirmEmail });
      setShowDeleteAccountConfirm(false);
      await logout();
      router.replace('/login');
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e?.message || 'Konto konnte nicht gelöscht werden.' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ConfirmDialog
        visible={showLogoutConfirm}
        title="Abmelden"
        message="Möchtest du dich wirklich abmelden?"
        confirmText="Abmelden"
        cancelText="Abbrechen"
        destructive
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteAccountConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteAccountConfirm(false)}
      >
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteDialog}>
            <Text style={styles.deleteTitle}>Konto endgültig löschen</Text>
            <Text style={styles.deleteMessage}>
              Alle deine Daten (Workouts, Körpermaße, Fortschritt, Badges) werden unwiderruflich gelöscht.
              {'\n\n'}Gib zur Bestätigung deine E-Mail-Adresse ein:
            </Text>
            <TextInput
              style={styles.deleteInput}
              placeholder={user?.email || 'deine@email.de'}
              placeholderTextColor={Colors.textMuted}
              value={deleteConfirmEmail}
              onChangeText={setDeleteConfirmEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.deleteButtons}>
              <TouchableOpacity
                style={styles.deleteCancelBtn}
                onPress={() => setShowDeleteAccountConfirm(false)}
              >
                <Text style={styles.deleteCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteConfirmBtn, deleteConfirmEmail !== user?.email && styles.deleteConfirmBtnDisabled]}
                onPress={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmEmail !== user?.email}
              >
                <Text style={styles.deleteConfirmText}>
                  {isDeleting ? 'Lösche...' : 'Endgültig löschen'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>
        {statusMessage && (
          <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
            <StatusBanner
              type={statusMessage.type}
              text={statusMessage.text}
              onDismiss={() => setStatusMessage(null)}
            />
          </View>
        )}
        <View style={styles.header}>
          <TouchableOpacity style={styles.avatar} onPress={() => setShowEditModal(true)}>
            <User size={40} color={Colors.text} />
            <View style={styles.editBadge}>
              <Edit3 size={12} color={Colors.text} />
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>Hallo {user?.name || 'Benutzer'}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {user?.role === 'admin' ? 'Administrator' : user?.role === 'trainer' ? 'Trainer' : 'Kunde'}
              </Text>
            </View>
            <View style={styles.levelBadge}>
              <Zap size={12} color={Colors.warning} />
              <Text style={styles.levelBadgeText}>Lvl {level} - {levelName}</Text>
            </View>
          </View>
          {/* XP Progress */}
          <View style={styles.xpContainer}>
            <View style={styles.xpBarBg}>
              <View style={[styles.xpBarFill, { width: `${xpProgress.progress * 100}%` }]} />
            </View>
            <Text style={styles.xpLabel}>{gamification.xp} XP - {xpProgress.current}/{xpProgress.needed} zum nächsten Level</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>{userWorkouts.length}</Text>
            <Text style={styles.quickStatLabel}>Workouts</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>{unlockedBadges.length}</Text>
            <Text style={styles.quickStatLabel}>Badges</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>{gamification.currentStreak}</Text>
            <Text style={styles.quickStatLabel}>Streak</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          {user?.role === 'trainer' && (
            <View style={styles.statsCard}>
              <View style={styles.statsItem}>
                <Users size={20} color={Colors.accent} />
                <View style={styles.statsInfo}>
                  <Text style={styles.statsValue}>{clients.length}</Text>
                  <Text style={styles.statsLabel}>Angemeldete Kunden</Text>
                </View>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.menuItem} onPress={() => setShowEditModal(true)}>
            <View style={styles.menuItemLeft}>
              <Edit3 size={20} color={Colors.textMuted} />
              <Text style={styles.menuItemText}>Profil bearbeiten</Text>
            </View>
            <ChevronRight size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/body-measurements')}>
            <View style={styles.menuItemLeft}>
              <Ruler size={20} color={Colors.textMuted} />
              <Text style={styles.menuItemText}>Körpermaße</Text>
            </View>
            <ChevronRight size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/leaderboard')}>
            <View style={styles.menuItemLeft}>
              <Trophy size={20} color={Colors.textMuted} />
              <Text style={styles.menuItemText}>Rangliste</Text>
            </View>
            <ChevronRight size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/challenges')}>
            <View style={styles.menuItemLeft}>
              <Target size={20} color={Colors.textMuted} />
              <Text style={styles.menuItemText}>Challenges</Text>
            </View>
            <ChevronRight size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/progress-photos' as any)}>
            <View style={styles.menuItemLeft}>
              <Camera size={20} color={Colors.textMuted} />
              <Text style={styles.menuItemText}>Fortschrittsfotos</Text>
            </View>
            <ChevronRight size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/plate-calculator' as any)}>
            <View style={styles.menuItemLeft}>
              <Calculator size={20} color={Colors.textMuted} />
              <Text style={styles.menuItemText}>Hantelrechner</Text>
            </View>
            <ChevronRight size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          {user?.role === 'client' && (() => {
            const trainer = clients.find((c: any) => c.role === 'trainer');
            if (!trainer?.userId) return null;
            return (
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push(`/chat/${trainer.userId}` as any)}>
                <View style={styles.menuItemLeft}>
                  <MessageSquare size={20} color={Colors.accent} />
                  <Text style={styles.menuItemText}>Nachricht an Trainer</Text>
                </View>
                <ChevronRight size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            );
          })()}

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/change-password')}>
            <View style={styles.menuItemLeft}>
              <Lock size={20} color={Colors.textMuted} />
              <Text style={styles.menuItemText}>Passwort ändern</Text>
            </View>
            <ChevronRight size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleTogglePush} disabled={pushLoading}>
            <View style={styles.menuItemLeft}>
              {pushEnabled ? <Bell size={20} color={Colors.accent} /> : <BellOff size={20} color={Colors.textMuted} />}
              <Text style={styles.menuItemText}>
                {pushLoading ? 'Wird geändert...' : pushEnabled ? 'Push-Benachrichtigungen aktiv' : 'Push-Benachrichtigungen aktivieren'}
              </Text>
            </View>
            <View style={[styles.toggleIndicator, pushEnabled && styles.toggleIndicatorActive]} />
          </TouchableOpacity>

          {(user?.role === 'trainer') && (
            <TouchableOpacity style={styles.menuItem} onPress={handleSwitchRole}>
              <View style={styles.menuItemLeft}>
                <Users size={20} color={Colors.textMuted} />
                <Text style={styles.menuItemText}>Zur Kundenansicht wechseln</Text>
              </View>
              <ChevronRight size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datenschutz & Daten</Text>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/privacy-policy')}>
            <View style={styles.menuItemLeft}>
              <Shield size={20} color={Colors.textMuted} />
              <Text style={styles.menuItemText}>Datenschutzerklärung</Text>
            </View>
            <ChevronRight size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleExportData} disabled={isExporting}>
            <View style={styles.menuItemLeft}>
              <Download size={20} color={Colors.textMuted} />
              <Text style={styles.menuItemText}>
                {isExporting ? 'Exportiere...' : 'Meine Daten exportieren'}
              </Text>
            </View>
            <ChevronRight size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => { setDeleteConfirmEmail(''); setShowDeleteAccountConfirm(true); }}
          >
            <View style={styles.menuItemLeft}>
              <Trash2 size={20} color={Colors.error} />
              <Text style={[styles.menuItemText, { color: Colors.error }]}>Konto und Daten löschen</Text>
            </View>
            <ChevronRight size={20} color={Colors.error} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Über</Text>

          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>App Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>

          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Gym</Text>
            <Text style={styles.aboutValue}>Functional Wiehl</Text>
          </View>

          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Entwicklung</Text>
            <Text style={styles.aboutValue}>SUPERBAND Marketing</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color={Colors.text} />
          <Text style={styles.logoutButtonText}>Abmelden</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Profil bearbeiten</Text>
            <TouchableOpacity onPress={handleSaveProfile} disabled={isSaving}>
              <Text style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}>
                {isSaving ? 'Speichert...' : 'Speichern'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.modalAvatarSection}>
              <View style={styles.modalAvatar}>
                <User size={50} color={Colors.text} />
              </View>
            </View>

            <Text style={styles.inputLabel}>Name</Text>
            <View style={styles.inputContainer}>
              <User size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Dein Name"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <Text style={styles.inputLabel}>Telefon</Text>
            <View style={styles.inputContainer}>
              <Phone size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Telefonnummer (optional)"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            <Text style={styles.inputLabel}>E-Mail</Text>
            <View style={[styles.inputContainer, styles.inputDisabled]}>
              <Text style={styles.inputDisabledText}>{user?.email || ''}</Text>
            </View>
            <Text style={styles.inputHint}>E-Mail kann nicht geändert werden</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (Colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.accent,
    position: 'relative',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.accent,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  roleBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  roleText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.warning,
    gap: 4,
  },
  levelBadgeText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.warning,
  },
  xpContainer: {
    width: '100%',
    paddingHorizontal: Spacing.md,
  },
  xpBarBg: {
    height: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: Colors.warning,
    borderRadius: 3,
  },
  xpLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickStatValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.accent,
  },
  quickStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  section: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: Spacing.md,
  },
  toggleIndicator: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleIndicatorActive: {
    backgroundColor: Colors.accent,
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  aboutLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  aboutValue: {
    fontSize: 16,
    color: Colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xl,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  logoutButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
    marginLeft: Spacing.sm,
  },
  statsCard: {
    backgroundColor: Colors.surfaceLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statsItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsInfo: {
    marginLeft: Spacing.md,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  statsLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  // Modal styles
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.accent,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  modalContent: {
    padding: Spacing.lg,
  },
  modalAvatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modalAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    color: Colors.text,
    fontSize: 16,
  },
  inputDisabled: {
    opacity: 0.6,
    paddingVertical: Spacing.md,
  },
  inputDisabledText: {
    color: Colors.textMuted,
    fontSize: 16,
  },
  inputHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  // Delete Account Modal styles
  deleteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  deleteDialog: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.error,
    marginBottom: Spacing.sm,
  },
  deleteMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  deleteInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  deleteButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  deleteCancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  deleteCancelText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '500' as const,
  },
  deleteConfirmBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.error,
    alignItems: 'center',
  },
  deleteConfirmBtnDisabled: {
    opacity: 0.4,
  },
  deleteConfirmText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
