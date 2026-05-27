import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { trpc } from '@/lib/trpc';

export default function DeleteAccountButton() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const deleteMut = trpc.privacy.deleteAccount.useMutation();

  const close = () => {
    if (deleteMut.isPending) return;
    setOpen(false);
    setEmailInput('');
    setError(null);
  };

  const confirm = async () => {
    setError(null);
    try {
      await deleteMut.mutateAsync({ confirmEmail: emailInput.trim().toLowerCase() });
      await logout();
      router.replace('/login');
    } catch (e: any) {
      setError(e?.message ?? 'Konto konnte nicht gelöscht werden.');
    }
  };

  const canConfirm =
    emailInput.trim().length > 0 &&
    emailInput.trim().toLowerCase() === (user?.email ?? '').toLowerCase() &&
    !deleteMut.isPending;

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setOpen(true)}
        testID="delete-account-button"
      >
        <Trash2 size={18} color={Colors.error} />
        <Text style={styles.buttonText}>Konto endgültig löschen</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.title}>Konto löschen</Text>
            <Text style={styles.message}>
              Dein Konto und alle gespeicherten Daten (Workouts, Körpermaße,
              Fortschrittsfotos, Routinen, Nachrichten) werden unwiderruflich
              gelöscht. Dieser Vorgang kann nicht rückgängig gemacht werden.
              {'\n\n'}
              Gib zur Bestätigung deine E-Mail-Adresse ein:
            </Text>
            <Text style={styles.emailHint}>{user?.email}</Text>
            <TextInput
              style={styles.input}
              value={emailInput}
              onChangeText={setEmailInput}
              placeholder="E-Mail-Adresse"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!deleteMut.isPending}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.cancelButton, deleteMut.isPending && styles.disabled]}
                onPress={close}
                disabled={deleteMut.isPending}
              >
                <Text style={styles.cancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, !canConfirm && styles.disabled]}
                onPress={confirm}
                disabled={!canConfirm}
              >
                {deleteMut.isPending ? (
                  <ActivityIndicator color={Colors.text} />
                ) : (
                  <Text style={styles.confirmText}>Endgültig löschen</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (Colors: any) =>
  StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.xl,
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: Colors.error,
      backgroundColor: 'transparent',
      gap: Spacing.sm,
    },
    buttonText: {
      color: Colors.error,
      fontSize: 15,
      fontWeight: '600',
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.xl,
    },
    dialog: {
      backgroundColor: Colors.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.xl,
      width: '100%',
      maxWidth: 400,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: Colors.text,
      marginBottom: Spacing.sm,
    },
    message: {
      fontSize: 15,
      color: Colors.textSecondary,
      lineHeight: 22,
      marginBottom: Spacing.sm,
    },
    emailHint: {
      fontSize: 14,
      color: Colors.textMuted,
      marginBottom: Spacing.sm,
      fontStyle: 'italic',
    },
    input: {
      backgroundColor: Colors.surfaceLight,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      color: Colors.text,
      fontSize: 15,
      borderWidth: 1,
      borderColor: Colors.border,
      marginBottom: Spacing.md,
    },
    error: {
      color: Colors.error,
      fontSize: 14,
      marginBottom: Spacing.md,
    },
    buttons: {
      flexDirection: 'row',
      gap: Spacing.md,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.md,
      backgroundColor: Colors.surfaceLight,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: Colors.border,
    },
    cancelText: {
      color: Colors.textSecondary,
      fontSize: 15,
      fontWeight: '500',
    },
    confirmButton: {
      flex: 1,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.md,
      backgroundColor: Colors.error,
      alignItems: 'center',
    },
    confirmText: {
      color: Colors.text,
      fontSize: 15,
      fontWeight: '600',
    },
    disabled: {
      opacity: 0.5,
    },
  });
