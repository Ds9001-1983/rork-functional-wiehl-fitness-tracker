import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <>
      <Stack.Screen options={{ title: 'Datenschutz' }} />
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Datenschutzerklärung</Text>
          <Text style={styles.lastUpdated}>Stand: Mai 2026</Text>

          <Text style={styles.sectionTitle}>1. Verantwortliche Stelle</Text>
          <Text style={styles.paragraph}>
            SUPERBAND Marketing{'\n'}
            Verantwortlich für die Datenverarbeitung in der Functional Wiehl Fitness App.{'\n'}
            Kontakt: datenschutz@functional-wiehl.de
          </Text>

          <Text style={styles.sectionTitle}>2. Welche Daten wir erheben</Text>
          <Text style={styles.paragraph}>
            Bei der Nutzung unserer App werden folgende personenbezogene Daten erhoben:{'\n\n'}
            - <Text style={styles.bold}>Kontodaten:</Text> Name, E-Mail-Adresse, Telefonnummer{'\n'}
            - <Text style={styles.bold}>Trainingsdaten:</Text> Workouts, Übungen, Gewichte, Wiederholungen, Dauer{'\n'}
            - <Text style={styles.bold}>Körperdaten:</Text> Körpermaße (optional, nur wenn du sie eingibst){'\n'}
            - <Text style={styles.bold}>Nutzungsdaten:</Text> Streaks, Badges, XP-Punkte, Trainingsfortschritt{'\n'}
            - <Text style={styles.bold}>Technische Daten:</Text> Geraetyp, App-Version (kein Tracking durch Dritte)
          </Text>

          <Text style={styles.sectionTitle}>3. Zweck der Verarbeitung</Text>
          <Text style={styles.paragraph}>
            Deine Daten werden ausschließlich verwendet für:{'\n\n'}
            - Bereitstellung der Fitness-Tracking-Funktionen{'\n'}
            - Personalisierte Trainingspläne durch deinen Trainer{'\n'}
            - Fortschrittsverfolgung und Gamification (XP, Badges, Streaks){'\n'}
            - Studio-interne Ranglisten und Challenges
          </Text>

          <Text style={styles.sectionTitle}>4. Rechtsgrundlage</Text>
          <Text style={styles.paragraph}>
            Die Verarbeitung erfolgt auf Grundlage deiner Einwilligung (Art. 6 Abs. 1 lit. a DSGVO)
            sowie zur Vertragsdurchführung (Art. 6 Abs. 1 lit. b DSGVO).
          </Text>

          <Text style={styles.sectionTitle}>5. Datenspeicherung</Text>
          <Text style={styles.paragraph}>
            Deine Daten werden auf einem Server in Deutschland (Hetzner, Nürnberg) gespeichert.
            Die Übertragung erfolgt verschlüsselt via HTTPS/TLS.
            Passwörter werden mit bcrypt gehasht gespeichert — wir kennen dein Passwort nicht.
          </Text>

          <Text style={styles.sectionTitle}>6. Weitergabe an Dritte</Text>
          <Text style={styles.paragraph}>
            Deine Daten werden <Text style={styles.bold}>nicht</Text> an Dritte weitergegeben,
            verkauft oder für Werbezwecke genutzt.
            Es findet kein Tracking durch Google Analytics, Facebook oder andere Dienste statt.
          </Text>

          <Text style={styles.sectionTitle}>7. Deine Rechte (DSGVO)</Text>
          <Text style={styles.paragraph}>
            Du hast jederzeit das Recht auf:{'\n\n'}
            - <Text style={styles.bold}>Auskunft</Text> über deine gespeicherten Daten{'\n'}
            - <Text style={styles.bold}>Datenexport</Text> — alle deine Daten als JSON-Datei{'\n'}
            - <Text style={styles.bold}>Löschung</Text> — vollständige Kontolöschung (siehe Abschnitt 8){'\n'}
            - <Text style={styles.bold}>Widerruf</Text> deiner Einwilligung{'\n\n'}
            Für Auskunft, Export oder Widerruf wende dich an datenschutz@functional-wiehl.de.
          </Text>

          <Text style={styles.sectionTitle}>8. Konto und Daten löschen</Text>
          <Text style={styles.paragraph}>
            Du kannst dein Konto und alle damit verbundenen Daten jederzeit
            <Text style={styles.bold}> direkt in der App </Text>
            unwiderruflich löschen:{'\n\n'}
            <Text style={styles.bold}>Schritt 1:</Text> Öffne die Functional Wiehl Fitness-App.{'\n'}
            <Text style={styles.bold}>Schritt 2:</Text> Tippe unten rechts auf den Tab „Profil".{'\n'}
            <Text style={styles.bold}>Schritt 3:</Text> Scrolle ganz nach unten zum rot umrandeten Button „Konto endgültig löschen".{'\n'}
            <Text style={styles.bold}>Schritt 4:</Text> Bestätige durch Eingabe deiner E-Mail-Adresse.{'\n\n'}
            <Text style={styles.bold}>Welche Daten gelöscht werden:</Text> Kontodaten (Name, E-Mail, Telefon),
            sämtliche Workouts und Übungsverläufe, Körpermaße, Fortschrittsfotos, Routinen,
            Chat-Nachrichten, Gamification-Daten (XP, Badges, Streaks), Push-Tokens.
            Die Löschung erfolgt sofort und unwiderruflich.{'\n\n'}
            <Text style={styles.bold}>Was wir kurzzeitig aufbewahren:</Text> Anonymisierte Server-Logs (max. 30 Tage,
            ohne personenbezogenen Bezug) sowie ggf. Buchhaltungsbelege gemäß § 257 HGB.{'\n\n'}
            <Text style={styles.bold}>Alternativ:</Text> Hast du die App bereits deinstalliert oder keinen Zugriff mehr?
            Sende eine formlose E-Mail mit deiner registrierten E-Mail-Adresse an{'\n'}
            datenschutz@functional-wiehl.de. Wir löschen dein Konto innerhalb von 7 Tagen
            und bestätigen die Löschung schriftlich.
          </Text>

          <Text style={styles.sectionTitle}>9. Speicherdauer</Text>
          <Text style={styles.paragraph}>
            Deine Daten werden gespeichert, solange dein Konto aktiv ist.
            Bei Kontolöschung werden alle personenbezogenen Daten unwiderruflich gelöscht
            (siehe Abschnitt 8).
          </Text>

          <Text style={styles.sectionTitle}>10. Kontakt</Text>
          <Text style={styles.paragraph}>
            Bei Fragen zum Datenschutz wende dich an:{'\n'}
            datenschutz@functional-wiehl.de
          </Text>

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      </View>
    </>
  );
}

const createStyles = (Colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  lastUpdated: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.accent,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  paragraph: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  bold: {
    fontWeight: '600' as const,
    color: Colors.text,
  },
});
