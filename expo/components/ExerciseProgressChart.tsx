import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { WorkoutSet, calculate1RM } from '@/types/workout';

type ChartPeriod = '1m' | '3m' | '6m' | 'all';
type ChartMetric = '1rm' | 'volume';

interface ExerciseProgressChartProps {
  history: Array<{ date: string; sets: WorkoutSet[] }>;
}

const CHART_WIDTH = 280;
const CHART_HEIGHT = 160;
const PADDING = { top: 10, right: 15, bottom: 30, left: 45 };
const INNER_WIDTH = CHART_WIDTH - PADDING.left - PADDING.right;
const INNER_HEIGHT = CHART_HEIGHT - PADDING.top - PADDING.bottom;

export const ExerciseProgressChart: React.FC<ExerciseProgressChartProps> = ({ history }) => {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [period, setPeriod] = useState<ChartPeriod>('all');
  const [metric, setMetric] = useState<ChartMetric>('1rm');

  const filteredHistory = useMemo(() => {
    if (period === 'all') return history;
    const months = period === '1m' ? 1 : period === '3m' ? 3 : 6;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return history.filter(h => new Date(h.date) >= cutoff);
  }, [history, period]);

  const dataPoints = useMemo(() => {
    return filteredHistory.map(entry => {
      if (metric === '1rm') {
        let best1RM = 0;
        for (const set of entry.sets) {
          if (set.weight > 0 && set.reps > 0) {
            const e1rm = calculate1RM(set.weight, set.reps);
            if (e1rm > best1RM) best1RM = e1rm;
          }
        }
        return { date: new Date(entry.date), value: best1RM };
      } else {
        const vol = entry.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
        return { date: new Date(entry.date), value: vol };
      }
    }).filter(d => d.value > 0);
  }, [filteredHistory, metric]);

  if (dataPoints.length < 2) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyChart}>
          <Text style={styles.emptyText}>
            {dataPoints.length === 0
              ? 'Noch keine Daten vorhanden'
              : 'Mindestens 2 Workouts nötig für den Chart'}
          </Text>
        </View>
      </View>
    );
  }

  const minVal = Math.min(...dataPoints.map(d => d.value));
  const maxVal = Math.max(...dataPoints.map(d => d.value));
  const valRange = maxVal - minVal || 1;
  const minDate = dataPoints[0].date.getTime();
  const maxDate = dataPoints[dataPoints.length - 1].date.getTime();
  const dateRange = maxDate - minDate || 1;

  const scaleX = (date: Date) => PADDING.left + ((date.getTime() - minDate) / dateRange) * INNER_WIDTH;
  const scaleY = (val: number) => PADDING.top + INNER_HEIGHT - ((val - minVal) / valRange) * INNER_HEIGHT;

  // Build SVG path
  const pathD = dataPoints
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(d.date).toFixed(1)} ${scaleY(d.value).toFixed(1)}`)
    .join(' ');

  // Y-axis labels (3 ticks)
  const yTicks = [minVal, minVal + valRange / 2, maxVal];

  // X-axis labels (first and last date)
  const formatDate = (d: Date) => d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });

  // Trend calculation
  const firstVal = dataPoints[0].value;
  const lastVal = dataPoints[dataPoints.length - 1].value;
  const trendPct = firstVal > 0 ? Math.round(((lastVal - firstVal) / firstVal) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* Metric Toggle */}
      <View style={styles.toggleRow}>
        <View style={styles.toggleGroup}>
          <TouchableOpacity
            style={[styles.toggleBtn, metric === '1rm' && styles.toggleBtnActive]}
            onPress={() => setMetric('1rm')}
          >
            <Text style={[styles.toggleText, metric === '1rm' && styles.toggleTextActive]}>1RM</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, metric === 'volume' && styles.toggleBtnActive]}
            onPress={() => setMetric('volume')}
          >
            <Text style={[styles.toggleText, metric === 'volume' && styles.toggleTextActive]}>Volumen</Text>
          </TouchableOpacity>
        </View>
        {trendPct !== 0 && (
          <Text style={[styles.trendText, { color: trendPct > 0 ? Colors.success : Colors.error }]}>
            {trendPct > 0 ? '↑' : '↓'} {Math.abs(trendPct)}%
          </Text>
        )}
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {/* Grid lines */}
          {yTicks.map((tick, i) => (
            <Line
              key={i}
              x1={PADDING.left}
              y1={scaleY(tick)}
              x2={CHART_WIDTH - PADDING.right}
              y2={scaleY(tick)}
              stroke={Colors.border}
              strokeWidth={0.5}
              strokeDasharray="4,4"
            />
          ))}

          {/* Y-axis labels */}
          {yTicks.map((tick, i) => (
            <SvgText
              key={`y-${i}`}
              x={PADDING.left - 5}
              y={scaleY(tick) + 4}
              fontSize={10}
              fill={Colors.textMuted}
              textAnchor="end"
            >
              {metric === 'volume' ? `${(tick / 1000).toFixed(1)}t` : `${Math.round(tick)}`}
            </SvgText>
          ))}

          {/* X-axis labels */}
          <SvgText
            x={PADDING.left}
            y={CHART_HEIGHT - 5}
            fontSize={10}
            fill={Colors.textMuted}
            textAnchor="start"
          >
            {formatDate(dataPoints[0].date)}
          </SvgText>
          <SvgText
            x={CHART_WIDTH - PADDING.right}
            y={CHART_HEIGHT - 5}
            fontSize={10}
            fill={Colors.textMuted}
            textAnchor="end"
          >
            {formatDate(dataPoints[dataPoints.length - 1].date)}
          </SvgText>

          {/* Line */}
          <Path d={pathD} stroke={Colors.accent} strokeWidth={2} fill="none" />

          {/* Data points */}
          {dataPoints.map((d, i) => (
            <Circle
              key={i}
              cx={scaleX(d.date)}
              cy={scaleY(d.value)}
              r={3}
              fill={Colors.accent}
            />
          ))}
        </Svg>
      </View>

      {/* Period filter */}
      <View style={styles.periodRow}>
        {([
          { key: '1m', label: '1M' },
          { key: '3m', label: '3M' },
          { key: '6m', label: '6M' },
          { key: 'all', label: 'Alle' },
        ] as const).map(p => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  toggleGroup: {
    flexDirection: 'row',
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    backgroundColor: Colors.background,
  },
  toggleBtnActive: {
    backgroundColor: Colors.accent,
  },
  toggleText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  toggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  trendText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  chartContainer: {
    alignItems: 'center',
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  periodBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background,
  },
  periodBtnActive: {
    backgroundColor: Colors.accent,
  },
  periodText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  periodTextActive: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  emptyChart: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});
