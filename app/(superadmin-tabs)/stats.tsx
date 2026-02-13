import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart3 } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/colors';

export default function SuperadminStatsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.centered}>
        <BarChart3 size={48} color={Colors.textMuted} />
        <Text style={styles.title}>Cross-Studio Statistiken</Text>
        <Text style={styles.subtitle}>Wird in Phase 4 implementiert</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  title: { color: Colors.text, fontSize: 18, fontWeight: '600', marginTop: Spacing.md },
  subtitle: { color: Colors.textSecondary, fontSize: 14, marginTop: Spacing.sm, textAlign: 'center' },
});
