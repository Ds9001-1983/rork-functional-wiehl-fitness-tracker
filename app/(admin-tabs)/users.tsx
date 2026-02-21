import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Users, Search, User, Shield, Trash2 } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { trpcClient } from '@/lib/trpc';
import { useClients } from '@/hooks/use-clients';
import ConfirmDialog from '@/components/ConfirmDialog';

interface UserEntry {
  id: string;
  email: string;
  role: string;
  passwordChanged: boolean;
  createdAt: string;
}

export default function AdminUsersScreen() {
  const { removeClient } = useClients();
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const result = await trpcClient.admin.users.query();
      setUsers(result as UserEntry[]);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return '#9C27B0';
      case 'trainer': return Colors.accent;
      case 'client': return '#2196F3';
      default: return Colors.textMuted;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'trainer': return 'Trainer';
      case 'client': return 'Kunde';
      default: return role;
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;
    try {
      await removeClient(deleteUserId);
      setUsers(prev => prev.filter(u => u.id !== deleteUserId));
      setShowDeleteConfirm(false);
      setDeleteUserId(null);
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
      <Text style={styles.pageTitle}>Benutzerverwaltung</Text>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Suche nach E-Mail oder Rolle..."
          placeholderTextColor={Colors.textMuted}
        />
      </View>

      <Text style={styles.resultCount}>{filteredUsers.length} Benutzer gefunden</Text>

      {filteredUsers.map((u) => (
        <View key={u.id} style={styles.userCard}>
          <View style={styles.userIcon}>
            {u.role === 'admin' ? <Shield size={20} color="#9C27B0" /> : <User size={20} color={Colors.textSecondary} />}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userEmail}>{u.email}</Text>
            <View style={styles.userMeta}>
              <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(u.role) + '30', borderColor: getRoleBadgeColor(u.role) }]}>
                <Text style={[styles.roleText, { color: getRoleBadgeColor(u.role) }]}>{getRoleLabel(u.role)}</Text>
              </View>
              <Text style={styles.userDate}>Seit {new Date(u.createdAt).toLocaleDateString('de-DE')}</Text>
            </View>
          </View>
          {!u.passwordChanged && (
            <View style={styles.pwBadge}>
              <Text style={styles.pwBadgeText}>PW</Text>
            </View>
          )}
          {u.role === 'client' && (
            <TouchableOpacity
              style={styles.deleteIcon}
              onPress={() => {
                setDeleteUserId(u.id);
                setShowDeleteConfirm(true);
              }}
            >
              <Trash2 size={18} color={Colors.error} />
            </TouchableOpacity>
          )}
        </View>
      ))}

      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Benutzer loeschen"
        message={`Moechten Sie "${users.find(u => u.id === deleteUserId)?.email || ''}" wirklich loeschen? Diese Aktion kann nicht rueckgaengig gemacht werden.`}
        confirmText="Loeschen"
        cancelText="Abbrechen"
        destructive
        onConfirm={handleDeleteUser}
        onCancel={() => { setShowDeleteConfirm(false); setDeleteUserId(null); }}
      />
    </ScrollView>
  );
}

const createStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  pageTitle: { fontSize: 24, fontWeight: '700', color: Colors.text, padding: Spacing.lg, paddingBottom: Spacing.sm },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm },
  searchInput: { flex: 1, height: 44, color: Colors.text, fontSize: 15 },
  resultCount: { color: Colors.textMuted, fontSize: 13, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.sm },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.md },
  userIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  userInfo: { flex: 1 },
  userEmail: { fontSize: 15, fontWeight: '500', color: Colors.text },
  userMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  roleText: { fontSize: 11, fontWeight: '600' },
  userDate: { fontSize: 12, color: Colors.textMuted },
  pwBadge: { backgroundColor: Colors.accent, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pwBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.text },
  deleteIcon: { padding: Spacing.xs, marginLeft: Spacing.sm },
});
