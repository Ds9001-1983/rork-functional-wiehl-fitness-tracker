import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import { Play, Pause, RotateCcw, Plus, Minus } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';

interface RestTimerProps {
  defaultSeconds?: number;
  onTimerEnd?: () => void;
  autoStart?: boolean;
  onDefaultChange?: (newDefault: number) => void;
}

export const RestTimer: React.FC<RestTimerProps> = ({
  defaultSeconds = 90,
  onTimerEnd,
  autoStart = false,
  onDefaultChange,
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
    const newTotal = Math.max(15, totalSeconds + delta);
    setTotalSeconds(newTotal);
    if (!isRunning) {
      setSeconds(newTotal);
    }
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
      <View style={styles.timerRow}>
        <TouchableOpacity onPress={() => adjustTime(-15)} style={styles.adjustButton}>
          <Minus size={16} color={Colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.timerDisplay}>
          <View style={[styles.progressBar, { width: `${progress * 100}%`, backgroundColor: progressColor }]} />
          <Text style={[styles.timerText, seconds === 0 && styles.timerDone]}>
            {seconds === 0 ? 'Weiter!' : formatTime(seconds)}
          </Text>
        </View>

        <TouchableOpacity onPress={() => adjustTime(15)} style={styles.adjustButton}>
          <Plus size={16} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity onPress={toggle} style={[styles.controlButton, isRunning && styles.pauseButton]}>
          {isRunning ? <Pause size={16} color={Colors.text} /> : <Play size={16} color={Colors.text} />}
        </TouchableOpacity>

        <TouchableOpacity onPress={reset} style={styles.controlButton}>
          <RotateCcw size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (Colors: any) => StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  adjustButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timerDisplay: {
    flex: 1,
    height: 36,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    opacity: 0.3,
    borderRadius: BorderRadius.sm,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  timerDone: {
    color: Colors.success,
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseButton: {
    backgroundColor: Colors.warning,
  },
});
