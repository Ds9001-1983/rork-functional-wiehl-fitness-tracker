import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';

const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const PLATE_COLORS: Record<number, string> = {
  25: '#E53E3E', 20: '#3182CE', 15: '#D69E2E', 10: '#38A169',
  5: '#FFFFFF', 2.5: '#E53E3E', 1.25: '#A0AEC0',
};

interface PlateCalculatorProps {
  initialWeight?: number;
  barWeight?: number;
}

export const PlateCalculator: React.FC<PlateCalculatorProps> = ({ initialWeight, barWeight: initBarWeight }) => {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [targetWeight, setTargetWeight] = useState(initialWeight?.toString() || '');
  const [barWeight, setBarWeight] = useState(initBarWeight || 20);

  const plates = useMemo(() => {
    const target = parseFloat(targetWeight);
    if (!target || target <= barWeight) return [];

    let remaining = (target - barWeight) / 2; // per side
    const result: number[] = [];

    for (const plate of PLATES) {
      while (remaining >= plate) {
        result.push(plate);
        remaining -= plate;
      }
    }

    return result;
  }, [targetWeight, barWeight]);

  const actualWeight = barWeight + plates.reduce((sum, p) => sum + p, 0) * 2;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hantelrechner</Text>

      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Zielgewicht (kg)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={targetWeight}
            onChangeText={setTargetWeight}
            placeholder="100"
            placeholderTextColor="#666"
          />
        </View>
        <View style={styles.barToggle}>
          <Text style={styles.inputLabel}>Stange</Text>
          <View style={styles.barButtons}>
            <TouchableOpacity
              style={[styles.barBtn, barWeight === 20 && styles.barBtnActive]}
              onPress={() => setBarWeight(20)}
            >
              <Text style={[styles.barBtnText, barWeight === 20 && styles.barBtnTextActive]}>20kg</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.barBtn, barWeight === 10 && styles.barBtnActive]}
              onPress={() => setBarWeight(10)}
            >
              <Text style={[styles.barBtnText, barWeight === 10 && styles.barBtnTextActive]}>10kg</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {plates.length > 0 && (
        <>
          {/* Visual barbell */}
          <View style={styles.barbellContainer}>
            <View style={styles.barbellBar}>
              {/* Left plates */}
              <View style={styles.platesRow}>
                {[...plates].reverse().map((plate, i) => (
                  <View
                    key={`l-${i}`}
                    style={[
                      styles.plateVisual,
                      {
                        backgroundColor: PLATE_COLORS[plate] || '#888',
                        height: 20 + plate * 1.5,
                        width: plate >= 10 ? 12 : 8,
                      },
                    ]}
                  />
                ))}
              </View>
              <View style={styles.barCenter} />
              {/* Right plates */}
              <View style={styles.platesRow}>
                {plates.map((plate, i) => (
                  <View
                    key={`r-${i}`}
                    style={[
                      styles.plateVisual,
                      {
                        backgroundColor: PLATE_COLORS[plate] || '#888',
                        height: 20 + plate * 1.5,
                        width: plate >= 10 ? 12 : 8,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* Plate list */}
          <View style={styles.plateList}>
            <Text style={styles.plateListTitle}>Pro Seite:</Text>
            {(() => {
              const counts = new Map<number, number>();
              plates.forEach(p => counts.set(p, (counts.get(p) || 0) + 1));
              return Array.from(counts.entries()).map(([plate, count]) => (
                <View key={plate} style={styles.plateItem}>
                  <View style={[styles.plateDot, { backgroundColor: PLATE_COLORS[plate] || '#888' }]} />
                  <Text style={styles.plateText}>{count}× {plate} kg</Text>
                </View>
              ));
            })()}
          </View>

          <Text style={styles.totalWeight}>
            = {actualWeight} kg {actualWeight !== parseFloat(targetWeight) ? `(Ziel: ${targetWeight} kg)` : ''}
          </Text>
        </>
      )}
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
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: 'center',
  },
  barToggle: {
    flex: 1,
  },
  barButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  barBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  barBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  barBtnText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  barBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  barbellContainer: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  barbellBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barCenter: {
    width: 60,
    height: 8,
    backgroundColor: '#888',
    borderRadius: 4,
  },
  platesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  plateVisual: {
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  plateList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  plateListTitle: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  plateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  plateDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  plateText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  totalWeight: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '700' as const,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
