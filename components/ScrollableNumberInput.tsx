import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  PanResponder,
  Animated,
  Vibration,
  Platform,
} from 'react-native';
import { ChevronUp, ChevronDown } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';

interface ScrollableNumberInputProps {
  value: number;
  onValueChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  precision?: number;
  placeholder?: string;
  suffix?: string;
}

export const ScrollableNumberInput: React.FC<ScrollableNumberInputProps> = ({
  value,
  onValueChange,
  step = 1,
  min = 0,
  max = 9999,
  precision = 0,
  placeholder = '0',
  suffix,
}) => {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [isEditing, setIsEditing] = useState(false);
  const [textValue, setTextValue] = useState(value > 0 ? value.toFixed(precision) : '');
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Track accumulated drag distance for step thresholds
  const accumulatedDelta = useRef(0);
  const lastValue = useRef(value);
  const dragActive = useRef(false);

  // Animated values for visual feedback
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const arrowOpacity = useRef(new Animated.Value(0)).current;
  const arrowDirection = useRef(new Animated.Value(0)).current; // -1 = up, 1 = down

  useEffect(() => {
    if (!isEditing) {
      setTextValue(value > 0 ? value.toFixed(precision) : '');
    }
    lastValue.current = value;
  }, [value, isEditing, precision]);

  const clamp = useCallback((v: number) => {
    return Math.min(max, Math.max(min, v));
  }, [min, max]);

  const vibrateStep = useCallback(() => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(5);
    }
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture vertical gestures (threshold to avoid accidental captures)
        return Math.abs(gestureState.dy) > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5;
      },
      onPanResponderGrant: () => {
        dragActive.current = true;
        accumulatedDelta.current = 0;
        setIsDragging(true);
        // Dismiss keyboard if editing
        if (isEditing) {
          inputRef.current?.blur();
          setIsEditing(false);
        }
        Animated.spring(scaleAnim, {
          toValue: 1.1,
          useNativeDriver: true,
          friction: 8,
        }).start();
        Animated.timing(arrowOpacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        if (!dragActive.current) return;

        // Pixels per step - smaller = more sensitive
        const pixelsPerStep = 25;
        const totalSteps = Math.round(-gestureState.dy / pixelsPerStep);
        const newValue = clamp(
          parseFloat((lastValue.current + totalSteps * step).toFixed(precision))
        );

        // Direction indicator
        if (gestureState.dy < -5) {
          arrowDirection.current.setValue(-1);
        } else if (gestureState.dy > 5) {
          arrowDirection.current.setValue(1);
        }

        if (newValue !== value) {
          vibrateStep();
          onValueChange(newValue);
        }
      },
      onPanResponderRelease: () => {
        dragActive.current = false;
        lastValue.current = value;
        setIsDragging(false);
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 8,
        }).start();
        Animated.timing(arrowOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        dragActive.current = false;
        lastValue.current = value;
        setIsDragging(false);
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 8,
        }).start();
        Animated.timing(arrowOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const handleFocus = () => {
    setIsEditing(true);
    setTextValue(value > 0 ? value.toFixed(precision) : '');
  };

  const handleBlur = () => {
    setIsEditing(false);
    const parsed = parseFloat(textValue);
    const newValue = isNaN(parsed) ? 0 : clamp(parseFloat(parsed.toFixed(precision)));
    onValueChange(newValue);
    lastValue.current = newValue;
    setTextValue(newValue > 0 ? newValue.toFixed(precision) : '');
  };

  const upOpacity = arrowOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });
  const downOpacity = arrowOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <View style={styles.wrapper} {...panResponder.panHandlers}>
      <Animated.View style={[styles.arrowContainer, { opacity: upOpacity }]}>
        <ChevronUp size={12} color={isDragging ? Colors.accent : Colors.textMuted} />
      </Animated.View>
      <Animated.View style={[styles.inputContainer, isDragging && styles.inputDragging, { transform: [{ scale: scaleAnim }] }]}>
        <TextInput
          ref={inputRef}
          style={[styles.input, isDragging && styles.inputTextDragging]}
          value={textValue}
          onChangeText={setTextValue}
          onFocus={handleFocus}
          onBlur={handleBlur}
          keyboardType={precision > 0 ? 'decimal-pad' : 'number-pad'}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          selectTextOnFocus
          editable={!isDragging}
        />
        {suffix && <Text style={styles.suffix}>{suffix}</Text>}
      </Animated.View>
      <Animated.View style={[styles.arrowContainer, { opacity: downOpacity }]}>
        <ChevronDown size={12} color={isDragging ? Colors.accent : Colors.textMuted} />
      </Animated.View>
    </View>
  );
};

const createStyles = (Colors: any) => StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
  },
  arrowContainer: {
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 36,
    width: '100%',
    justifyContent: 'center',
  },
  inputDragging: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accent + '15',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    paddingHorizontal: Spacing.xs,
    height: '100%',
  },
  inputTextDragging: {
    color: Colors.accent,
    fontWeight: '700' as const,
  },
  suffix: {
    fontSize: 11,
    color: Colors.textMuted,
    marginRight: Spacing.xs,
  },
});
