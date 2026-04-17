import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { LogOut, User, Lock, Edit3, Phone, ChevronRight, X, Shield } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import ConfirmDialog from '@/components/ConfirmDialog';
import StatusBanner from '@/components/StatusBanner';
import { getAppVersion } from '@/lib/app-version';

export default function AdminProfileScreen() {
  const router = useRouter();
  const { user, logout, updateProfile, isAuthenticated, isLoading } = useAuth();
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditPhone(user.phone || '');
    }
  }, [user]);

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    try {
      await logout();
      router.replace('/login');
    } catch {
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
      await updateProfile({ name: editName.trim(), phone: editPhone.trim() || undefined });
      setShowEditModal(false);
      setStatusMessage({ type: 'success', text: 'Profil wurde aktualisiert.' });
    } catch {
      setStatusMessage({ type: 'error', text: 'Profil konnte nicht gespeichert werden.' });
    } finally {
      setIsSaving(false);
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
      <ScrollView showsVerticalScrollIndicator={false}>
        {statusMessage && (
          <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
            <StatusBanner type={statusMessage.type} text={statusMessage.text} onDismiss={() => setStatusMessage(null)} />
          </View>
        )}

        <View style={styles.header}>
          <TouchableOpacity style={styles.avatar} onPress={() => setShowEditModal(true)}>
            <Shield size={40} color="#9C27B0" />
            <View style={styles.editBadge}>
              <Edit3 size={12} color={Colors.text} />
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>Hallo {user?.name || 'Admin'}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>
          <View style={[styles.roleBadge, { backgroundColor: '#9C27B0' }]}>
            <Text style={styles.roleText}>Administrator</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

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
              <Text style={styles.menuItemText}>Passwort ändern</Text>
            </View>
            <ChevronRight size={20} color={Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/privacy-policy' as any)}>
            <View style={styles.menuItemLeft}>
              <Shield size={20} color={Colors.textMuted} />
              <Text style={styles.menuItemText}>Datenschutz</Text>
            </View>
            <ChevronRight size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Über</Text>
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>App Version</Text>
            <Text style={styles.aboutValue}>{getAppVersion()}</Text>
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

        <TouchableOpacity style={styles.logoutButton} onPress={() => setShowLogoutConfirm(true)}>
          <LogOut size={20} color={Colors.text} />
          <Text style={styles.logoutButtonText}>Abmelden</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Profil bearbeiten</Text>
            <TouchableOpacity onPress={handleSaveProfile} disabled={isSaving}>
              <Text style={[styles.saveButton, isSaving && { opacity: 0.5 }]}>{isSaving ? 'Speichert...' : 'Speichern'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <View style={styles.modalAvatarSection}>
              <View style={styles.modalAvatar}>
                <Shield size={50} color="#9C27B0" />
              </View>
            </View>
            <Text style={styles.inputLabel}>Name</Text>
            <View style={styles.inputContainer}>
              <User size={18} color={Colors.textMuted} />
              <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Dein Name" placeholderTextColor={Colors.textMuted} />
            </View>
            <Text style={styles.inputLabel}>Telefon</Text>
            <View style={styles.inputContainer}>
              <Phone size={18} color={Colors.textMuted} />
              <TextInput style={styles.input} value={editPhone} onChangeText={setEditPhone} placeholder="Telefonnummer (optional)" placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" />
            </View>
            <Text style={styles.inputLabel}>E-Mail</Text>
            <View style={[styles.inputContainer, { opacity: 0.6 }]}>
              <Text style={{ color: Colors.textMuted, fontSize: 16 }}>{user?.email || ''}</Text>
            </View>
            <Text style={styles.inputHint}>E-Mail kann nicht geändert werden</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md, borderWidth: 2, borderColor: '#9C27B0', position: 'relative' as const },
  editBadge: { position: 'absolute' as const, bottom: 0, right: 0, backgroundColor: Colors.accent, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 24, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  email: { fontSize: 16, color: Colors.textSecondary, marginBottom: Spacing.sm },
  roleBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  roleText: { color: Colors.text, fontSize: 14, fontWeight: '500' },
  section: { padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: Spacing.md },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuItemText: { fontSize: 16, color: Colors.text, marginLeft: Spacing.md },
  aboutItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  aboutLabel: { fontSize: 16, color: Colors.textSecondary },
  aboutValue: { fontSize: 16, color: Colors.text },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.error, marginHorizontal: Spacing.lg, marginVertical: Spacing.xl, padding: Spacing.md, borderRadius: BorderRadius.md },
  logoutButtonText: { color: Colors.text, fontSize: 16, fontWeight: '600', marginLeft: Spacing.sm },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },
  saveButton: { fontSize: 16, fontWeight: '600', color: Colors.accent },
  modalContent: { padding: Spacing.lg },
  modalAvatarSection: { alignItems: 'center', marginBottom: Spacing.xl },
  modalAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#9C27B0' },
  inputLabel: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.md },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm },
  input: { flex: 1, height: 48, color: Colors.text, fontSize: 16 },
  inputHint: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
});
