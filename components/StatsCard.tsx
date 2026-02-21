import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color: colorProp,
}) => {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const color = colorProp ?? Colors.accent;
  return (
    <View style={styles.container} testID="stats-card">
      {icon && (
        <View
          style={[styles.iconContainer, { backgroundColor: (color ?? Colors.accent) + '20' }]}
          testID="stats-card-icon"
        >
          {icon}
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const createStyles = (Colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});