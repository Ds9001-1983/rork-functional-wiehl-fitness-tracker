import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Lock, ArrowLeft, Check } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { trpcClient } from '@/lib/trpc';
import StatusBanner from '@/components/StatusBanner';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async () => {
    if (newPassword.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen haben.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwoerter stimmen nicht ueberein.');
      return;
    }
    if (!token) {
      setError('Ungueltiger Reset-Link.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await trpcClient.auth.resetPassword.mutate({ token, newPassword });
      setSuccess(true);
    } catch (err: any) {
      setError('Link ist ungueltig oder abgelaufen. Bitte fordere einen neuen an.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <>
        <Stack.Screen options={{ title: 'Passwort zurueckgesetzt' }} />
        <View style={styles.container}>
          <View style={styles.successCard}>
            <Check size={48} color={Colors.success} />
            <Text style={styles.successTitle}>Passwort geaendert!</Text>
            <Text style={styles.successText}>Du kannst dich jetzt mit deinem neuen Passwort anmelden.</Text>
            <TouchableOpacity style={styles.button} onPress={() => router.replace('/login')}>
              <Text style={styles.buttonText}>Zum Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Passwort zuruecksetzen' }} />
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.text} />
          <Text style={styles.backText}>Zurueck</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Lock size={32} color={Colors.accent} />
          <Text style={styles.title}>Neues Passwort</Text>
          <Text style={styles.subtitle}>Gib dein neues Passwort ein.</Text>

          {error ? <StatusBanner type="error" text={error} onDismiss={() => setError('')} /> : null}

          <TextInput
            style={styles.input}
            placeholder="Neues Passwort (min. 6 Zeichen)"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TextInput
            style={styles.input}
            placeholder="Passwort bestaetigen"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading}>
            {loading ? <ActivityIndicator color={Colors.text} /> : <Text style={styles.buttonText}>Passwort aendern</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const createStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xl },
  backText: { color: Colors.text, fontSize: 16 },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  title: { fontSize: 22, fontWeight: '700' as const, color: Colors.text, marginTop: Spacing.md },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.lg, textAlign: 'center' },
  input: { width: '100%', backgroundColor: Colors.background, borderRadius: BorderRadius.sm, padding: Spacing.md, color: Colors.text, fontSize: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md },
  button: { width: '100%', backgroundColor: Colors.accent, borderRadius: BorderRadius.sm, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  buttonText: { color: Colors.text, fontSize: 16, fontWeight: '600' as const },
  successCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, marginTop: 100 },
  successTitle: { fontSize: 22, fontWeight: '700' as const, color: Colors.success, marginTop: Spacing.md },
  successText: { fontSize: 14, color: Colors.textSecondary, marginVertical: Spacing.md, textAlign: 'center' },
});
