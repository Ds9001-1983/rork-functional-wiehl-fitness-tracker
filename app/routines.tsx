import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ClipboardList, ChevronRight } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { useWorkouts } from '@/hooks/use-workouts';
import { useAuth } from '@/hooks/use-auth';

export default function TrainingPlansScreen() {
  const router = useRouter();
  const { workoutPlans } = useWorkouts();
  const { user } = useAuth();
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  // Assigned training plans from trainer
  const assignedPlans = useMemo(() => {
    if (!user?.id) return [];
    return workoutPlans.filter(p =>
      p.assignedTo?.includes(user.id) || p.assignedUserId === user.id
    );
  }, [workoutPlans, user?.id]);

  return (
    <>
      <Stack.Screen options={{ title: 'Trainingspläne' }} />
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Meine Trainingspläne</Text>
            <Text style={styles.subtitle}>Vom Trainer zugewiesene Pläne</Text>
          </View>

          {assignedPlans.length > 0 ? (
            assignedPlans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={styles.planCard}
                onPress={() => router.push(`/plan-detail/${plan.id}` as any)}
              >
                <View style={styles.planIcon}>
                  <ClipboardList size={20} color={Colors.accent} />
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planDetails}>
                    {plan.exercises.length} Übungen
                    {plan.description ? ` · ${plan.description}` : ''}
                  </Text>
                </View>
                <ChevronRight size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <ClipboardList size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Keine Trainingspläne vorhanden</Text>
              <Text style={styles.emptySubtext}>
                Dein Trainer kann dir Pläne zuweisen.
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </>
  );
}

const createStyles = (Colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xxl,
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  planIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  planDetails: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});
