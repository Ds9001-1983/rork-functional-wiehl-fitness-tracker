import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link2, Repeat, ArrowDown } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import type { ExerciseGroupType } from '@/types/workout';

interface ExerciseGroupProps {
  groupType: ExerciseGroupType;
  children: React.ReactNode;
}

const GROUP_CONFIG: Record<ExerciseGroupType, { label: string; color: string }> = {
  superset: { label: 'Supersatz', color: '#FF6B35' },
  circuit: { label: 'Zirkel', color: '#4CAF50' },
  dropset: { label: 'Dropsatz', color: '#9C27B0' },
};

export const ExerciseGroup: React.FC<ExerciseGroupProps> = ({ groupType, children }) => {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const config = GROUP_CONFIG[groupType];

  const Icon = groupType === 'superset' ? Link2 : groupType === 'circuit' ? Repeat : ArrowDown;

  return (
    <View style={[styles.container, { borderLeftColor: config.color }]}>
      <View style={[styles.badge, { backgroundColor: config.color + '20' }]}>
        <Icon size={12} color={config.color} />
        <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
      </View>
      {children}
    </View>
  );
};

const createStyles = (Colors: any) => StyleSheet.create({
  container: {
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B35',
    marginLeft: Spacing.sm,
    paddingLeft: Spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
});
