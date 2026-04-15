import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { PlateCalculator } from '@/components/PlateCalculator';
import { Spacing } from '@/constants/colors';

export default function PlateCalculatorScreen() {
  const Colors = useColors();

  return (
    <ScrollView style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={styles.content}>
        <PlateCalculator />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
});
