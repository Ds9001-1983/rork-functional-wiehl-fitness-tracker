import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Colors, Spacing, BorderRadius } from '@/constants/colors';

export default function NotFoundScreen() {
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

const styles = StyleSheet.create({
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
