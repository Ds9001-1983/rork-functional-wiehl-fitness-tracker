import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, MessageCircle, Eye, EyeOff } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Brand } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { trpcClient } from '@/lib/trpc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConfirmDialog from '@/components/ConfirmDialog';
import StatusBanner from '@/components/StatusBanner';

export default function LoginScreen() {
  const router = useRouter();
  const { login, resetPassword, isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{type: 'error' | 'success'; text: string} | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showNotInvitedConfirm, setShowNotInvitedConfirm] = useState(false);
  const [lastErrorType, setLastErrorType] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (user?.role === 'admin') {
      router.replace('/(admin-tabs)');
    } else if (user?.role === 'trainer') {
      router.replace('/(trainer-tabs)');
    } else {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, user?.role, router]);

  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('savedEmail');
      if (savedEmail) setEmail(savedEmail);
    } catch (error) {
      console.error('Fehler beim Laden der gespeicherten Anmeldedaten:', error);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setStatusMessage({ type: 'error', text: 'Bitte E-Mail und Passwort eingeben.' });
      return;
    }
    setIsLoading(true);
    setLastErrorType(null);
    try {
      const user = await login(email, password);
      await AsyncStorage.setItem('savedEmail', email);
      if (!user) {
        return;
      }
      if (user.role === 'admin') {
        router.replace('/(admin-tabs)');
        return;
      }
      if (user.role === 'trainer') {
        router.replace('/(trainer-tabs)');
        return;
      }
      if (user.role === 'client' && user.passwordChanged === false) {
        router.replace('/change-password');
      } else {
        router.replace('/(tabs)');
      }
    } catch (e) {
      if (e instanceof Error && e.message === 'CONNECTION_FAILED') {
        setLastErrorType('CONNECTION_FAILED');
        setStatusMessage({ type: 'error', text: 'Keine Verbindung zum Server. Bitte überprüfe deine Internetverbindung.' });
      } else if (e instanceof Error && e.message === 'USER_NOT_INVITED') {
        setShowNotInvitedConfirm(true);
      } else if (e instanceof Error && e.message === 'INVALID_PASSWORD') {
        setStatusMessage({ type: 'error', text: 'Falsches Passwort. Bitte verwende das Einmalpasswort, das dir der Trainer gegeben hat.' });
      } else {
        setStatusMessage({ type: 'error', text: 'Ungültige Anmeldedaten. Überprüfe E-Mail und Passwort.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactTrainer = () => {
    const whatsappUrl = 'https://api.whatsapp.com/send/?phone=492262752717&text=Hallo%2C+ich+m%C3%B6chte+in+die+Trainingsplan+App.&type=phone_number&app_absent=0';
    Linking.openURL(whatsappUrl).catch(() => {
      setStatusMessage({ type: 'error', text: 'WhatsApp konnte nicht geöffnet werden.' });
    });
  };

  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleForgotPassword = async () => {
    const targetEmail = resetEmail || email;
    if (!targetEmail) {
      setStatusMessage({ type: 'error', text: 'Bitte gib zuerst deine E-Mail-Adresse ein.' });
      return;
    }
    setResetLoading(true);
    try {
      await trpcClient.auth.requestReset.mutate({ email: targetEmail });
      setStatusMessage({
        type: 'success',
        text: 'Falls ein Konto mit dieser E-Mail existiert, wurde ein Reset-Link gesendet.',
      });
    } catch {
      setStatusMessage({
        type: 'success',
        text: 'Falls ein Konto mit dieser E-Mail existiert, wurde ein Reset-Link gesendet.',
      });
    } finally {
      setResetLoading(false);
    }
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
          <Text style={styles.subtitle}>Dein digitaler Trainingspartner</Text>
        </View>

        <View style={styles.form}>
          {statusMessage && (
            <StatusBanner
              type={statusMessage.type}
              text={statusMessage.text}
              onDismiss={() => { setStatusMessage(null); setLastErrorType(null); }}
            />
          )}

          {lastErrorType === 'CONNECTION_FAILED' && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.retryButtonText}>
                {isLoading ? 'Verbinde...' : 'Erneut versuchen'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.inputContainer}>
            <Mail size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              testID="login-email"
              style={styles.input}
              placeholder="E-Mail"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              testID="login-password"
              style={styles.input}
              placeholder="Passwort"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff size={20} color={Colors.textMuted} />
              ) : (
                <Eye size={20} color={Colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            testID="login-button"
            style={[styles.loginButton, isLoading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? 'Anmelden...' : 'Anmelden'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="forgot-password"
            style={styles.forgotPasswordButton}
            onPress={handleForgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Passwort vergessen?</Text>
          </TouchableOpacity>

          <View style={styles.inviteSection}>
            <Text style={styles.inviteText}>
              Noch kein Zugang? Ein Trainer muss dich einladen.
            </Text>
            <TouchableOpacity
              testID="contact-trainer"
              style={styles.contactTrainerButton}
              onPress={handleContactTrainer}
            >
              <MessageCircle size={18} color={Colors.background} style={styles.contactIcon} />
              <Text style={styles.contactTrainerText}>
                Einen Trainer bitten dich einzuladen
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={showNotInvitedConfirm}
        title="Zugang nicht berechtigt"
        message="Um die App zu verwenden, muss dich ein Trainer einladen."
        confirmText="Trainer kontaktieren"
        cancelText="Abbrechen"
        onConfirm={() => {
          setShowNotInvitedConfirm(false);
          handleContactTrainer();
        }}
        onCancel={() => setShowNotInvitedConfirm(false)}
      />
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
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  logoImage: {
    width: 260,
    height: 64,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
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
  passwordToggle: {
    padding: Spacing.sm,
    marginRight: Spacing.xs,
  },
  loginButton: {
    backgroundColor: Colors.accent,
    height: 50,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  loginButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  disabledButton: {
    opacity: 0.5,
  },
  retryButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  retryButtonText: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '600' as const,
  },
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  forgotPasswordText: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  inviteSection: {
    marginTop: Spacing.xl,
    alignItems: 'center',
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  inviteText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  contactTrainerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  contactIcon: {
    marginRight: Spacing.sm,
  },
  contactTrainerText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '600' as const,
  },
});