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
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
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

// Trend-faehige Metriken (nur solche mit genug Datenpunkten zeigen)
const TREND_METRICS: { key: keyof Omit<Measurement, 'id' | 'userId' | 'date'>; label: string; unit: string; color: string }[] = [
  { key: 'gewicht', label: 'Gewicht', unit: 'kg', color: '#FF6B35' },
  { key: 'koerperfett', label: 'Koerperfett', unit: '%', color: '#4CAF50' },
  { key: 'brust', label: 'Brust', unit: 'cm', color: '#2196F3' },
  { key: 'taille', label: 'Taille', unit: 'cm', color: '#FF9800' },
  { key: 'huefte', label: 'Huefte', unit: 'cm', color: '#9C27B0' },
  { key: 'bizepsLinks', label: 'Bizeps L', unit: 'cm', color: '#00BCD4' },
  { key: 'bizepsRechts', label: 'Bizeps R', unit: 'cm', color: '#009688' },
  { key: 'oberschenkelLinks', label: 'Oberschenkel L', unit: 'cm', color: '#E91E63' },
  { key: 'oberschenkelRechts', label: 'Oberschenkel R', unit: 'cm', color: '#F44336' },
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
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [formExpanded, setFormExpanded] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string>('gewicht');

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

  // Available metrics (those that have at least 2 data points)
  const availableMetrics = useMemo(() => {
    return TREND_METRICS.filter(metric => {
      const count = sortedMeasurements.filter(m => (m as any)[metric.key] != null).length;
      return count >= 2;
    });
  }, [sortedMeasurements]);

  // Trend entries for selected metric (last 8, chronological)
  const trendEntries = useMemo(() => {
    const withValue = sortedMeasurements.filter(m => (m as any)[selectedMetric] != null);
    return withValue.slice(0, 8).reverse();
  }, [sortedMeasurements, selectedMetric]);

  const selectedMetricInfo = TREND_METRICS.find(m => m.key === selectedMetric);

  const trendValues = useMemo(() => {
    return trendEntries.map(m => (m as any)[selectedMetric] as number);
  }, [trendEntries, selectedMetric]);

  const maxValue = useMemo(() => {
    if (trendValues.length === 0) return 0;
    return Math.max(...trendValues);
  }, [trendValues]);

  const minValue = useMemo(() => {
    if (trendValues.length === 0) return 0;
    return Math.min(...trendValues);
  }, [trendValues]);

  const valueChange = useMemo(() => {
    if (trendValues.length < 2) return null;
    return trendValues[trendValues.length - 1] - trendValues[0];
  }, [trendValues]);

  const updateFormValue = (key: string, value: string) => {
    const sanitized = value.replace(',', '.').replace(/[^0-9.]/g, '');
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

    for (const field of FIELDS) {
      const raw = formValues[field.key];
      if (raw && raw.trim() !== '') {
        const parsed = parseFloat(raw);
        if (!isNaN(parsed) && parsed > 0) {
          (newMeasurement as any)[field.key] = parsed;
        }
      }
    }

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

  const getBarWidth = (value: number): number => {
    if (maxValue === minValue) return 80;
    const range = maxValue - minValue;
    const padding = range * 0.1 || 1;
    const adjustedMin = minValue - padding;
    const adjustedMax = maxValue + padding;
    const percentage = ((value - adjustedMin) / (adjustedMax - adjustedMin)) * 100;
    return Math.max(20, Math.min(95, percentage));
  };

  // Determine if weight metric should show inverse coloring (down = good)
  const isInverseMetric = selectedMetric === 'gewicht' || selectedMetric === 'koerperfett' || selectedMetric === 'taille' || selectedMetric === 'huefte';

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
    // Show metric selector even if no data (to switch between metrics)
    const metricColor = selectedMetricInfo?.color || Colors.accent;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.iconContainer, { backgroundColor: metricColor + '25' }]}>
              <TrendingUp size={20} color={metricColor} />
            </View>
            <Text style={styles.cardTitle}>Verlauf</Text>
          </View>
          {valueChange !== null && (
            <View style={[
              styles.changeBadge,
              valueChange > 0
                ? (isInverseMetric ? styles.changeBadgeUp : styles.changeBadgeDown)
                : valueChange < 0
                  ? (isInverseMetric ? styles.changeBadgeDown : styles.changeBadgeUp)
                  : styles.changeBadgeNeutral,
            ]}>
              <Text style={[
                styles.changeBadgeText,
                valueChange > 0
                  ? (isInverseMetric ? styles.changeBadgeTextUp : styles.changeBadgeTextDown)
                  : valueChange < 0
                    ? (isInverseMetric ? styles.changeBadgeTextDown : styles.changeBadgeTextUp)
                    : styles.changeBadgeTextNeutral,
              ]}>
                {valueChange > 0 ? '+' : ''}{valueChange.toFixed(1)} {selectedMetricInfo?.unit}
              </Text>
            </View>
          )}
        </View>

        {/* Metric Selector */}
        {availableMetrics.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.metricSelectorScroll}
            contentContainerStyle={styles.metricSelectorContent}
          >
            {availableMetrics.map(metric => (
              <TouchableOpacity
                key={metric.key}
                style={[
                  styles.metricTab,
                  selectedMetric === metric.key && { backgroundColor: metric.color + '25', borderColor: metric.color },
                ]}
                onPress={() => setSelectedMetric(metric.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.metricDot, { backgroundColor: metric.color }]} />
                <Text style={[
                  styles.metricTabText,
                  selectedMetric === metric.key && { color: metric.color },
                ]}>
                  {metric.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {trendEntries.length < 2 ? (
          <View style={styles.emptyTrend}>
            <Text style={styles.emptyText}>
              Mindestens 2 Messungen fuer {selectedMetricInfo?.label || 'diese Metrik'} noetig.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.chartContainer}>
              {trendEntries.map((entry, index) => {
                const value = (entry as any)[selectedMetric] ?? 0;
                return (
                  <View key={entry.id} style={styles.chartRow}>
                    <Text style={styles.chartDate}>{formatDateShort(entry.date)}</Text>
                    <View style={styles.chartBarContainer}>
                      <View
                        style={[
                          styles.chartBar,
                          {
                            width: `${getBarWidth(value)}%`,
                            backgroundColor: index === trendEntries.length - 1
                              ? metricColor
                              : metricColor + '70',
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.chartValue}>{value.toFixed(1)}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.chartSummary}>
              <View style={styles.chartSummaryItem}>
                <Text style={styles.chartSummaryLabel}>Min</Text>
                <Text style={styles.chartSummaryValue}>
                  {minValue.toFixed(1)} {selectedMetricInfo?.unit}
                </Text>
              </View>
              <View style={styles.chartSummaryItem}>
                <Text style={styles.chartSummaryLabel}>Max</Text>
                <Text style={styles.chartSummaryValue}>
                  {maxValue.toFixed(1)} {selectedMetricInfo?.unit}
                </Text>
              </View>
              <View style={styles.chartSummaryItem}>
                <Text style={styles.chartSummaryLabel}>Aktuell</Text>
                <Text style={[styles.chartSummaryValue, { color: metricColor }]}>
                  {(trendValues[trendValues.length - 1] ?? 0).toFixed(1)} {selectedMetricInfo?.unit}
                </Text>
              </View>
            </View>
          </>
        )}
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
          <Text style={styles.cardTitle}>Messungen</Text>
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

const createStyles = (Colors: any) => StyleSheet.create({
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

  // Metric selector
  metricSelectorScroll: {
    maxHeight: 44,
    marginBottom: Spacing.sm,
  },
  metricSelectorContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  metricTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  metricDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metricTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
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
