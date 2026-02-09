import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LogOut, User, Settings, Award, Users, Lock, Edit3, Phone, ChevronRight, X } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { useClients } from '@/hooks/use-clients';
import { useWorkouts } from '@/hooks/use-workouts';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, switchRole, updateProfile, isAuthenticated, isLoading } = useAuth();
  const { clients } = useClients();
  const { getWorkoutHistory, getPersonalRecords } = useWorkouts();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditPhone(user.phone || '');
    }
  }, [user]);

  const userWorkouts = getWorkoutHistory();
  const personalRecords = getPersonalRecords();
  const recordCount = Object.keys(personalRecords).length;

  const handleLogout = async () => {
    Alert.alert(
      'Abmelden',
      'Moechtest du dich wirklich abmelden?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Abmelden',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/login');
            } catch (error) {
              console.error('[Profile] Fehler beim Logout:', error);
              Alert.alert('Fehler', 'Beim Abmelden ist ein Fehler aufgetreten.');
            }
          },
        },
      ]
    );
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Fehler', 'Name darf nicht leer sein.');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
      });
      setShowEditModal(false);
      Alert.alert('Gespeichert', 'Dein Profil wurde aktualisiert.');
    } catch (error) {
      Alert.alert('Fehler', 'Profil konnte nicht gespeichert werden.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSwitchRole = () => {
    if (user?.role === 'trainer') {
      // Trainer can switch to client view
      switchRole();
    } else if (user?.role === 'client') {
      // Only allow switch back if originally a trainer
      switchRole();
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.avatar} onPress={() => setShowEditModal(true)}>
            <User size={40} color={Colors.text} />
            <View style={styles.editBadge}>
              <Edit3 size={12} color={Colors.text} />
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>Hallo {user?.name || 'Benutzer'}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {user?.role === 'trainer' ? 'Trainer' : 'Kunde'}
            </Text>
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
            <Text style={styles.quickStatValue}>{recordCount}</Text>
            <Text style={styles.quickStatLabel}>Rekorde</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>{user?.stats?.currentStreak || 0}</Text>
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

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/change-password')}>
            <View style={styles.menuItemLeft}>
              <Lock size={20} color={Colors.textMuted} />
              <Text style={styles.menuItemText}>Passwort aendern</Text>
            </View>
            <ChevronRight size={20} color={Colors.textMuted} />
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
          <Text style={styles.sectionTitle}>Ueber</Text>

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
            <Text style={styles.inputHint}>E-Mail kann nicht geaendert werden</Text>
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
});
