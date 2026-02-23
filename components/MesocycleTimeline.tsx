import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';

interface Phase {
  name: string;
  weeks: number;
  intensity: number;
  planId?: string;
  description?: string;
}

interface MesocycleTimelineProps {
  name: string;
  startDate: string;
  endDate: string;
  phases: Phase[];
}

const PHASE_COLORS = ['#FF6B35', '#4CAF50', '#2196F3', '#9C27B0', '#FF9800'];

export const MesocycleTimeline: React.FC<MesocycleTimelineProps> = ({ name, startDate, endDate, phases }) => {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const totalWeeks = phases.reduce((sum, p) => sum + p.weeks, 0);
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.max(0, (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const progressPct = Math.min(100, (elapsedDays / totalDays) * 100);

  // Find current phase
  let weeksSoFar = 0;
  let currentPhaseIdx = -1;
  const currentWeek = Math.floor(elapsedDays / 7);
  for (let i = 0; i < phases.length; i++) {
    if (currentWeek >= weeksSoFar && currentWeek < weeksSoFar + phases[i].weeks) {
      currentPhaseIdx = i;
      break;
    }
    weeksSoFar += phases[i].weeks;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.dates}>
          {new Date(startDate).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })} — {new Date(endDate).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>

      {/* Phase blocks */}
      <View style={styles.phasesRow}>
        {phases.map((phase, i) => {
          const widthPct = totalWeeks > 0 ? (phase.weeks / totalWeeks) * 100 : 0;
          const color = PHASE_COLORS[i % PHASE_COLORS.length];
          const isCurrent = i === currentPhaseIdx;

          return (
            <View key={i} style={[styles.phaseBlock, { width: `${widthPct}%` }]}>
              <View style={[styles.phaseBar, { backgroundColor: color }, isCurrent && styles.phaseBarCurrent]}>
                <Text style={styles.phaseBarText} numberOfLines={1}>{phase.name}</Text>
              </View>
              <Text style={styles.phaseWeeks}>{phase.weeks}W · {phase.intensity}%</Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.totalWeeks}>{totalWeeks} Wochen gesamt</Text>
    </View>
  );
};

const createStyles = (Colors: any) => StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  name: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  dates: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 2,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  phasesRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: Spacing.sm,
  },
  phaseBlock: {
    alignItems: 'center',
  },
  phaseBar: {
    width: '100%',
    paddingVertical: Spacing.xs,
    paddingHorizontal: 4,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  phaseBarCurrent: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  phaseBarText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  phaseWeeks: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  totalWeeks: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'right',
  },
});
