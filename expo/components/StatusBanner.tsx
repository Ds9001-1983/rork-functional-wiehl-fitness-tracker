import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';

interface StatusBannerProps {
  type: 'error' | 'success' | 'info';
  text: string;
  onDismiss?: () => void;
  autoDismiss?: number; // ms, default 4000
}

export default function StatusBanner({ type, text, onDismiss, autoDismiss = 4000 }: StatusBannerProps) {
  useEffect(() => {
    if (onDismiss && autoDismiss > 0) {
      const timer = setTimeout(onDismiss, autoDismiss);
      return () => clearTimeout(timer);
    }
  }, [onDismiss, autoDismiss]);

  const icon = type === 'success' ? '✓' : type === 'error' ? '!' : 'i';

  return (
    <View style={[styles.banner, styles[type]]}>
      <View style={[styles.iconCircle, styles[`${type}Icon`]]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <Text style={styles.text}>{text}</Text>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
          <X size={16} color={Colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  error: {
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
    borderColor: 'rgba(244, 67, 54, 0.4)',
  },
  success: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderColor: 'rgba(76, 175, 80, 0.4)',
  },
  info: {
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    borderColor: 'rgba(33, 150, 243, 0.4)',
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIcon: {
    backgroundColor: 'rgba(244, 67, 54, 0.3)',
  },
  successIcon: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
  },
  infoIcon: {
    backgroundColor: 'rgba(33, 150, 243, 0.3)',
  },
  iconText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  text: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
  },
});
