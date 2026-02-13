import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Building2 } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { trpcClient } from '@/lib/trpc';

interface StudioInfo {
  id: string;
  name: string;
  slug: string;
  accentColor: string;
  memberCount: number;
  createdAt: string;
}

export default function StudiosScreen() {
  const [studios, setStudios] = useState<StudioInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStudios();
  }, []);

  async function loadStudios() {
    try {
      const result = await trpcClient.studios.list.query();
      setStudios(result as StudioInfo[]);
    } catch (err) {
      console.error('[Superadmin] Failed to load studios:', err);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SUPERBAND Studios</Text>
        <Text style={styles.subtitle}>{studios.length} Studio{studios.length !== 1 ? 's' : ''} verwaltet</Text>
      </View>

      <FlatList
        data={studios}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 32 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={[styles.indicator, { backgroundColor: item.accentColor || Colors.accent }]} />
            <View style={styles.cardContent}>
              <Text style={styles.studioName}>{item.name}</Text>
              <Text style={styles.studioSlug}>{item.slug}</Text>
              <Text style={styles.studioMembers}>{item.memberCount} Mitglieder</Text>
            </View>
            <Building2 size={20} color={Colors.textMuted} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Building2 size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Keine Studios vorhanden</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { padding: Spacing.md },
  title: { color: Colors.text, fontSize: 24, fontWeight: '700' },
  subtitle: { color: Colors.textSecondary, fontSize: 14, marginTop: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  indicator: { width: 4, height: 40, borderRadius: 2, marginRight: Spacing.sm },
  cardContent: { flex: 1 },
  studioName: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  studioSlug: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  studioMembers: { color: Colors.textSecondary, fontSize: 13, marginTop: 4 },
  emptyText: { color: Colors.textMuted, fontSize: 16, marginTop: Spacing.md },
});
