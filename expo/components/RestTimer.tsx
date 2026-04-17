import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import { Play, Pause, RotateCcw, Plus, Minus, X } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';

interface RestTimerProps {
  defaultSeconds?: number;
  onTimerEnd?: () => void;
  autoStart?: boolean;
  onDefaultChange?: (newDefault: number) => void;
  onDismiss?: () => void;
  stepSeconds?: number;
}

export const RestTimer: React.FC<RestTimerProps> = ({
  defaultSeconds = 90,
  onTimerEnd,
  autoStart = false,
  onDefaultChange,
  onDismiss,
  stepSeconds = 10,
}) => {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [seconds, setSeconds] = useState(defaultSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [totalSeconds, setTotalSeconds] = useState(defaultSeconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            Vibration.vibrate([0, 500, 200, 500]);
            onTimerEnd?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, seconds > 0]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = totalSeconds > 0 ? seconds / totalSeconds : 0;

  const adjustTime = (delta: number) => {
    const newTotal = Math.max(stepSeconds, totalSeconds + delta);
    setTotalSeconds(newTotal);
    // Laufende Restzeit mit anpassen (proportional den gleichen Abstand zum Ende halten)
    setSeconds(prev => Math.max(0, prev + delta));
    onDefaultChange?.(newTotal);
  };

  const reset = () => {
    setIsRunning(false);
    setSeconds(totalSeconds);
  };

  const toggle = () => setIsRunning(!isRunning);

  const progressColor = seconds <= 10 ? Colors.error : seconds <= 30 ? Colors.warning : Colors.accent;

  return (
    <View style={styles.container}>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} style={styles.closeButton} hitSlop={10} accessibilityLabel="Timer schließen">
          <X size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      )}

      <Text style={styles.label}>Pausenzeit</Text>
      <Text style={[styles.bigTimer, seconds === 0 && styles.timerDone, { color: seconds === 0 ? Colors.success : Colors.text }]}>
        {seconds === 0 ? 'Weiter!' : formatTime(seconds)}
      </Text>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: progressColor }]} />
      </View>

      <View style={styles.controlsRow}>
        <TouchableOpacity onPress={() => adjustTime(-stepSeconds)} style={styles.bigButton} hitSlop={6}>
          <Minus size={20} color={Colors.text} />
          <Text style={styles.buttonLabel}>{stepSeconds}s</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={toggle} style={[styles.primaryBigButton, isRunning && styles.pauseButton]} hitSlop={6}>
          {isRunning ? <Pause size={22} color={Colors.text} /> : <Play size={22} color={Colors.text} />}
        </TouchableOpacity>

        <TouchableOpacity onPress={reset} style={styles.bigButton} hitSlop={6}>
          <RotateCcw size={20} color={Colors.text} />
          <Text style={styles.buttonLabel}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => adjustTime(stepSeconds)} style={styles.bigButton} hitSlop={6}>
          <Plus size={20} color={Colors.text} />
          <Text style={styles.buttonLabel}>{stepSeconds}s</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (Colors: any) => StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    padding: Spacing.xs,
    zIndex: 1,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bigTimer: {
    fontSize: 72,
    fontWeight: '700' as const,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  timerDone: {
    color: Colors.success,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  bigButton: {
    minWidth: 64,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    gap: 2,
  },
  buttonLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '600' as const,
  },
  primaryBigButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseButton: {
    backgroundColor: Colors.warning,
  },
});
