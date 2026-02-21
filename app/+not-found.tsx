import React, { useMemo } from 'react';
import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';

export default function NotFoundScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <>
      <Stack.Screen options={{ title: "Nicht gefunden" }} />
      <View style={styles.container}>
        <Text style={styles.title}>Diese Seite existiert nicht.</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Zur Startseite</Text>
        </Link>
      </View>
    </>
  );
}

const createStyles = (Colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
  },
  link: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
  },
  linkText: {
    fontSize: 14,
    color: Colors.accent,
  },
});
