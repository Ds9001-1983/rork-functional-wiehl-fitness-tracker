import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Brand } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { user, updatePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Fehler', 'Bitte alle Felder ausfüllen');
      return;
    }

    if (!validatePassword(newPassword)) {
      Alert.alert('Fehler', 'Das neue Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Fehler', 'Die Passwörter stimmen nicht überein');
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert('Fehler', 'Das neue Passwort muss sich vom aktuellen unterscheiden');
      return;
    }

    setIsLoading(true);
    try {
      await updatePassword(newPassword);
      
      Alert.alert(
        'Passwort geändert! 🎉',
        'Ihr Passwort wurde erfolgreich geändert. Sie können jetzt die App verwenden.',
        [
          {
            text: 'Weiter zur App',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (error) {
      console.error('Fehler beim Ändern des Passworts:', error);
      Alert.alert('Fehler', 'Passwort konnte nicht geändert werden. Bitte versuchen Sie es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Passwort später ändern?',
      'Sie können Ihr Passwort jederzeit in den Einstellungen ändern. Möchten Sie trotzdem fortfahren?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Fortfahren',
          onPress: () => router.replace('/(tabs)'),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              accessibilityIgnoresInvertColors
              source={{ uri: Brand.logoUrl }}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Passwort ändern</Text>
          <Text style={styles.subtitle}>
            Willkommen {user?.name}! Bitte ändern Sie Ihr Starter-Passwort für mehr Sicherheit.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Lock size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Aktuelles Passwort"
              placeholderTextColor={Colors.textMuted}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrentPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowCurrentPassword(!showCurrentPassword)}
            >
              {showCurrentPassword ? (
                <EyeOff size={20} color={Colors.textMuted} />
              ) : (
                <Eye size={20} color={Colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Lock size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Neues Passwort (min. 6 Zeichen)"
              placeholderTextColor={Colors.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowNewPassword(!showNewPassword)}
            >
              {showNewPassword ? (
                <EyeOff size={20} color={Colors.textMuted} />
              ) : (
                <Eye size={20} color={Colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <CheckCircle size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Neues Passwort bestätigen"
              placeholderTextColor={Colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff size={20} color={Colors.textMuted} />
              ) : (
                <Eye size={20} color={Colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>

          {newPassword.length > 0 && (
            <View style={styles.passwordStrength}>
              <Text
                style={[
                  styles.strengthText,
                  {
                    color: validatePassword(newPassword)
                      ? Colors.success
                      : Colors.warning,
                  },
                ]}
              >
                {validatePassword(newPassword)
                  ? '✓ Passwort ist stark genug'
                  : '⚠ Passwort zu kurz (min. 6 Zeichen)'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.changeButton, isLoading && styles.disabledButton]}
            onPress={handleChangePassword}
            disabled={isLoading}
          >
            <Text style={styles.changeButtonText}>
              {isLoading ? 'Wird geändert...' : 'Passwort ändern'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={isLoading}
          >
            <Text style={styles.skipButtonText}>Später ändern</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  logoImage: {
    width: 200,
    height: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputIcon: {
    marginLeft: Spacing.md,
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: Spacing.md,
    color: Colors.text,
    fontSize: 16,
  },
  eyeButton: {
    padding: Spacing.md,
  },
  passwordStrength: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  changeButton: {
    backgroundColor: Colors.accent,
    height: 50,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  changeButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  disabledButton: {
    opacity: 0.5,
  },
  skipButton: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  skipButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '500' as const,
  },
});