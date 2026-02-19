import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ruler, Plus, TrendingUp, ChevronDown, ChevronUp, Trash2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { trpcClient } from '@/lib/trpc';
import StatusBanner from '@/components/StatusBanner';
import ConfirmDialog from '@/components/ConfirmDialog';

const STORAGE_KEY = 'body_measurements';

interface Measurement {
  id: string;
  userId: string;
  date: string;
  gewicht?: number;
  koerperfett?: number;
  brust?: number;
  taille?: number;
  huefte?: number;
  bizepsLinks?: number;
  bizepsRechts?: number;
  oberschenkelLinks?: number;
  oberschenkelRechts?: number;
}

interface MeasurementField {
  key: keyof Omit<Measurement, 'id' | 'userId' | 'date'>;
  label: string;
  unit: string;
  placeholder: string;
}

const FIELDS: MeasurementField[] = [
  { key: 'gewicht', label: 'Gewicht', unit: 'kg', placeholder: 'z.B. 78.5' },
  { key: 'koerperfett', label: 'Koerperfett', unit: '%', placeholder: 'z.B. 18.0' },
  { key: 'brust', label: 'Brust', unit: 'cm', placeholder: 'z.B. 100' },
  { key: 'taille', label: 'Taille', unit: 'cm', placeholder: 'z.B. 82' },
  { key: 'huefte', label: 'Huefte', unit: 'cm', placeholder: 'z.B. 96' },
  { key: 'bizepsLinks', label: 'Bizeps Links', unit: 'cm', placeholder: 'z.B. 35' },
  { key: 'bizepsRechts', label: 'Bizeps Rechts', unit: 'cm', placeholder: 'z.B. 35.5' },
  { key: 'oberschenkelLinks', label: 'Oberschenkel Links', unit: 'cm', placeholder: 'z.B. 56' },
  { key: 'oberschenkelRechts', label: 'Oberschenkel Rechts', unit: 'cm', placeholder: 'z.B. 56.5' },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

export default function BodyMeasurementsScreen() {
  const { user } = useAuth();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [formExpanded, setFormExpanded] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Form state
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  // Load measurements
  const loadMeasurements = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);

    try {
      const result = await trpcClient.measurements.list.query({ userId: user.id });
      if (Array.isArray(result)) {
        setMeasurements(result);
        setIsUsingCache(false);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(result));
      }
    } catch (error) {
      console.log('[BodyMeasurements] Server nicht erreichbar, lade lokal');
      setIsUsingCache(true);
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: Measurement[] = JSON.parse(stored);
          setMeasurements(parsed.filter(m => m.userId === user.id));
        }
      } catch (storageError) {
        console.error('[BodyMeasurements] Lokaler Speicher Fehler:', storageError);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadMeasurements();
  }, [loadMeasurements]);

  // Sort measurements by date descending
  const sortedMeasurements = useMemo(() => {
    return [...measurements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [measurements]);

  // Last 6 entries for trend chart (chronological order)
  const trendEntries = useMemo(() => {
    const withWeight = sortedMeasurements.filter(m => m.gewicht != null);
    return withWeight.slice(0, 6).reverse();
  }, [sortedMeasurements]);

  const maxWeight = useMemo(() => {
    if (trendEntries.length === 0) return 0;
    return Math.max(...trendEntries.map(m => m.gewicht ?? 0));
  }, [trendEntries]);

  const minWeight = useMemo(() => {
    if (trendEntries.length === 0) return 0;
    return Math.min(...trendEntries.map(m => m.gewicht ?? 0));
  }, [trendEntries]);

  const weightChange = useMemo(() => {
    if (trendEntries.length < 2) return null;
    const first = trendEntries[0].gewicht ?? 0;
    const last = trendEntries[trendEntries.length - 1].gewicht ?? 0;
    return last - first;
  }, [trendEntries]);

  const updateFormValue = (key: string, value: string) => {
    // Allow only valid numeric input (digits, single dot, single comma)
    const sanitized = value.replace(',', '.').replace(/[^0-9.]/g, '');
    // Prevent multiple dots
    const parts = sanitized.split('.');
    const cleaned = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : sanitized;
    setFormValues(prev => ({ ...prev, [key]: cleaned }));
  };

  const resetForm = () => {
    setFormValues({});
  };

  const hasAnyValue = Object.values(formValues).some(v => v.trim() !== '');

  const handleSave = async () => {
    if (!user?.id) return;
    if (!hasAnyValue) {
      setStatusMessage({ type: 'error', text: 'Bitte gib mindestens einen Wert ein.' });
      return;
    }

    setIsSaving(true);

    const newMeasurement: Measurement = {
      id: `m_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user.id,
      date: new Date().toISOString(),
    };

    // Parse form values into measurement
    for (const field of FIELDS) {
      const raw = formValues[field.key];
      if (raw && raw.trim() !== '') {
        const parsed = parseFloat(raw);
        if (!isNaN(parsed) && parsed > 0) {
          (newMeasurement as any)[field.key] = parsed;
        }
      }
    }

    // Check if at least one valid value was parsed
    const hasValidValue = FIELDS.some(f => (newMeasurement as any)[f.key] != null);
    if (!hasValidValue) {
      setStatusMessage({ type: 'error', text: 'Bitte gib mindestens einen gueltigen Wert ein.' });
      setIsSaving(false);
      return;
    }

    try {
      await trpcClient.measurements.create.mutate(newMeasurement);
    } catch (error) {
      console.log('[BodyMeasurements] Server-Speicherung fehlgeschlagen, speichere lokal');
    }

    // Always update local state and AsyncStorage
    const updated = [newMeasurement, ...measurements];
    setMeasurements(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (storageError) {
      console.error('[BodyMeasurements] AsyncStorage Fehler:', storageError);
    }

    resetForm();
    setFormExpanded(false);
    setStatusMessage({ type: 'success', text: 'Messung gespeichert!' });
    setIsSaving(false);
  };

  const confirmDelete = (id: string) => {
    setDeleteTargetId(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    const updated = measurements.filter(m => m.id !== deleteTargetId);
    setMeasurements(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('[BodyMeasurements] Loeschen Fehler:', e);
    }
    setDeleteTargetId(null);
    setShowDeleteConfirm(false);
    setStatusMessage({ type: 'success', text: 'Messung geloescht.' });
  };

  // Calculate bar width as percentage of range
  const getBarWidth = (weight: number): number => {
    if (maxWeight === minWeight) return 80;
    const range = maxWeight - minWeight;
    const padding = range * 0.1 || 1;
    const adjustedMin = minWeight - padding;
    const adjustedMax = maxWeight + padding;
    const percentage = ((weight - adjustedMin) / (adjustedMax - adjustedMin)) * 100;
    return Math.max(20, Math.min(95, percentage));
  };

  const renderForm = () => (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => setFormExpanded(!formExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeaderLeft}>
          <View style={styles.iconContainer}>
            <Plus size={20} color={Colors.accent} />
          </View>
          <Text style={styles.cardTitle}>Neue Messung</Text>
        </View>
        {formExpanded ? (
          <ChevronUp size={20} color={Colors.textSecondary} />
        ) : (
          <ChevronDown size={20} color={Colors.textSecondary} />
        )}
      </TouchableOpacity>

      {formExpanded && (
        <View style={styles.formContent}>
          {FIELDS.map(field => (
            <View key={field.key} style={styles.inputRow}>
              <Text style={styles.inputLabel}>{field.label}</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={formValues[field.key] || ''}
                  onChangeText={(v) => updateFormValue(field.key, v)}
                  placeholder={field.placeholder}
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
                <Text style={styles.unitLabel}>{field.unit}</Text>
              </View>
            </View>
          ))}

          <View style={styles.formActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                resetForm();
                setFormExpanded(false);
              }}
            >
              <Text style={styles.cancelButtonText}>Abbrechen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, (!hasAnyValue || isSaving) && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!hasAnyValue || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={Colors.text} />
              ) : (
                <Text style={styles.saveButtonText}>Speichern</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  const renderTrend = () => {
    if (trendEntries.length < 2) {
      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.iconContainer}>
                <TrendingUp size={20} color={Colors.accent} />
              </View>
              <Text style={styles.cardTitle}>Gewichtsverlauf</Text>
            </View>
          </View>
          <View style={styles.emptyTrend}>
            <Text style={styles.emptyText}>
              Mindestens 2 Gewichtsmessungen noetig fuer den Verlauf.
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.iconContainer}>
              <TrendingUp size={20} color={Colors.accent} />
            </View>
            <Text style={styles.cardTitle}>Gewichtsverlauf</Text>
          </View>
          {weightChange !== null && (
            <View style={[
              styles.changeBadge,
              weightChange > 0 ? styles.changeBadgeUp : weightChange < 0 ? styles.changeBadgeDown : styles.changeBadgeNeutral,
            ]}>
              <Text style={[
                styles.changeBadgeText,
                weightChange > 0 ? styles.changeBadgeTextUp : weightChange < 0 ? styles.changeBadgeTextDown : styles.changeBadgeTextNeutral,
              ]}>
                {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
              </Text>
            </View>
          )}
        </View>

        <View style={styles.chartContainer}>
          {trendEntries.map((entry, index) => (
            <View key={entry.id} style={styles.chartRow}>
              <Text style={styles.chartDate}>{formatDateShort(entry.date)}</Text>
              <View style={styles.chartBarContainer}>
                <View
                  style={[
                    styles.chartBar,
                    {
                      width: `${getBarWidth(entry.gewicht ?? 0)}%`,
                      backgroundColor: index === trendEntries.length - 1 ? Colors.accent : 'rgba(255, 107, 53, 0.5)',
                    },
                  ]}
                />
              </View>
              <Text style={styles.chartValue}>{(entry.gewicht ?? 0).toFixed(1)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.chartSummary}>
          <View style={styles.chartSummaryItem}>
            <Text style={styles.chartSummaryLabel}>Min</Text>
            <Text style={styles.chartSummaryValue}>{minWeight.toFixed(1)} kg</Text>
          </View>
          <View style={styles.chartSummaryItem}>
            <Text style={styles.chartSummaryLabel}>Max</Text>
            <Text style={styles.chartSummaryValue}>{maxWeight.toFixed(1)} kg</Text>
          </View>
          <View style={styles.chartSummaryItem}>
            <Text style={styles.chartSummaryLabel}>Aktuell</Text>
            <Text style={[styles.chartSummaryValue, { color: Colors.accent }]}>
              {(trendEntries[trendEntries.length - 1]?.gewicht ?? 0).toFixed(1)} kg
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderHistoryItem = (measurement: Measurement) => {
    const displayValues: { label: string; value: string }[] = [];

    for (const field of FIELDS) {
      const val = (measurement as any)[field.key];
      if (val != null) {
        displayValues.push({
          label: field.label,
          value: `${val} ${field.unit}`,
        });
      }
    }

    if (displayValues.length === 0) return null;

    return (
      <View key={measurement.id} style={styles.historyItem}>
        <View style={styles.historyHeader}>
          <View style={styles.historyDateContainer}>
            <Ruler size={14} color={Colors.accent} />
            <Text style={styles.historyDate}>{formatDate(measurement.date)}</Text>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => confirmDelete(measurement.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Trash2 size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
        <View style={styles.historyValues}>
          {displayValues.map((dv, i) => (
            <View key={i} style={styles.historyValueItem}>
              <Text style={styles.historyValueLabel}>{dv.label}</Text>
              <Text style={styles.historyValueText}>{dv.value}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderHistory = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.iconContainer}>
            <Ruler size={20} color={Colors.accent} />
          </View>
          <Text style={styles.cardTitle}>Verlauf</Text>
        </View>
        <Text style={styles.countBadge}>{sortedMeasurements.length}</Text>
      </View>

      {sortedMeasurements.length === 0 ? (
        <View style={styles.emptyTrend}>
          <Text style={styles.emptyText}>
            Noch keine Messungen vorhanden. Trage deine erste Messung ein!
          </Text>
        </View>
      ) : (
        <View style={styles.historyList}>
          {sortedMeasurements.map(m => renderHistoryItem(m))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Koerpermasse',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {statusMessage && (
          <StatusBanner
            type={statusMessage.type}
            text={statusMessage.text}
            onDismiss={() => setStatusMessage(null)}
          />
        )}

        {isUsingCache && !isLoading && (
          <StatusBanner
            type="info"
            text="Offline-Modus — lokale Daten werden angezeigt"
            autoDismiss={0}
          />
        )}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.loadingText}>Messungen werden geladen...</Text>
          </View>
        ) : (
          <>
            {renderForm()}
            {renderTrend()}
            {renderHistory()}
          </>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Messung loeschen"
        message="Diese Messung wirklich loeschen? Diese Aktion kann nicht rueckgaengig gemacht werden."
        confirmText="Loeschen"
        cancelText="Abbrechen"
        destructive
        onConfirm={handleDelete}
        onCancel={() => { setShowDeleteConfirm(false); setDeleteTargetId(null); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
    gap: Spacing.md,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },

  // Form
  formContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  inputLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1.2,
    gap: Spacing.xs,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm : Spacing.xs,
    color: Colors.text,
    fontSize: 15,
    textAlign: 'right',
  },
  unitLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    width: 24,
    textAlign: 'left',
  },
  formActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },

  // Trend chart
  emptyTrend: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  chartContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  chartDate: {
    width: 44,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'right',
  },
  chartBarContainer: {
    flex: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  chartBar: {
    height: '100%',
    borderRadius: BorderRadius.sm,
    minWidth: 4,
  },
  chartValue: {
    width: 42,
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
    textAlign: 'right',
  },
  chartSummary: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.xs,
  },
  chartSummaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  chartSummaryLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  chartSummaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },

  // Change badge
  changeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  changeBadgeUp: {
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
  },
  changeBadgeDown: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  changeBadgeNeutral: {
    backgroundColor: 'rgba(160, 160, 176, 0.15)',
  },
  changeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  changeBadgeTextUp: {
    color: '#FFC107',
  },
  changeBadgeTextDown: {
    color: Colors.success,
  },
  changeBadgeTextNeutral: {
    color: Colors.textSecondary,
  },

  // Count badge
  countBadge: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },

  // History
  historyList: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  historyItem: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  historyDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  historyValues: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  historyValueItem: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    minWidth: 80,
  },
  historyValueLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 1,
  },
  historyValueText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
});
