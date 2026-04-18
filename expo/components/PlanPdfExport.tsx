import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Printer } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { useExercises } from '@/hooks/use-exercises';
import { WorkoutPlan } from '@/types/workout';

interface PlanPdfExportProps {
  plan: WorkoutPlan;
  clientName?: string;
}

export const PlanPdfExport: React.FC<PlanPdfExportProps> = ({ plan, clientName }) => {
  const Colors = useColors();
  const { exercises: exerciseDb } = useExercises();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const handleExport = () => {
    if (Platform.OS !== 'web') return;

    const getExerciseName = (id: string) => exerciseDb.find(e => e.id === id)?.name || id;

    const rows = plan.exercises.map(ex => {
      const name = getExerciseName(ex.exerciseId);
      const setsCount = ex.sets.length;
      const reps = ex.sets[0]?.reps || '-';
      const weight = ex.sets[0]?.weight ? `${ex.sets[0].weight} kg` : '-';
      const rest = ex.sets[0]?.restTime ? `${ex.sets[0].restTime}s` : '-';
      return `<tr><td>${name}</td><td>${setsCount}</td><td>${reps}</td><td>${weight}</td><td>${rest}</td></tr>`;
    }).join('');

    const html = `
      <html>
      <head>
        <title>${plan.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { font-size: 24px; margin-bottom: 4px; }
          .meta { color: #666; margin-bottom: 20px; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { background: #f5f5f5; text-align: left; padding: 10px; border-bottom: 2px solid #ddd; font-size: 14px; }
          td { padding: 10px; border-bottom: 1px solid #eee; font-size: 14px; }
          .footer { margin-top: 30px; color: #999; font-size: 12px; text-align: center; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>${plan.name}</h1>
        <div class="meta">
          ${clientName ? `Kunde: ${clientName} · ` : ''}
          Erstellt: ${new Date().toLocaleDateString('de-DE')}
          ${plan.description ? `<br>${plan.description}` : ''}
        </div>
        <table>
          <thead>
            <tr><th>Übung</th><th>Sätze</th><th>Wdh.</th><th>Gewicht</th><th>Pause</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">Functional Wiehl - Fitness App</div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 300);
    }
  };

  if (Platform.OS !== 'web') return null;

  return (
    <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
      <Printer size={16} color={Colors.accent} />
      <Text style={styles.exportText}>PDF exportieren</Text>
    </TouchableOpacity>
  );
};

const createStyles = (Colors: any) => StyleSheet.create({
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  exportText: {
    fontSize: 13,
    color: Colors.accent,
    fontWeight: '500' as const,
  },
});
