import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LogOut, User, Shield } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';

export default function SuperadminProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Shield size={32} color={Colors.accent} />
        </View>
        <Text style={styles.name}>SUPERBAND Admin</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>SUPERADMIN</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={20} color={Colors.error} />
        <Text style={styles.logoutText}>Abmelden</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { alignItems: 'center', padding: Spacing.xl },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  name: { color: Colors.text, fontSize: 20, fontWeight: '700', marginTop: Spacing.md },
  email: { color: Colors.textSecondary, fontSize: 14, marginTop: 4 },
  badge: {
    backgroundColor: Colors.accent, borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 4, marginTop: Spacing.sm,
  },
  badgeText: { color: Colors.text, fontSize: 11, fontWeight: '700' },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    margin: Spacing.md, padding: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
  },
  logoutText: { color: Colors.error, fontSize: 16, fontWeight: '600', marginLeft: Spacing.sm },
});
