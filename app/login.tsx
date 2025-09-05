import React, { useState, useEffect } from 'react';
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
  Switch,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, MessageCircle } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Brand } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const router = useRouter();
  const { login, resetPassword, isAuthenticated, clearStorage } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [rememberPassword, setRememberPassword] = useState<boolean>(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('savedEmail');
      const savedPassword = await AsyncStorage.getItem('savedPassword');
      const rememberSetting = await AsyncStorage.getItem('rememberPassword');
      if (savedEmail) setEmail(savedEmail);
      if (savedPassword && rememberSetting === 'true') {
        setPassword(savedPassword);
        setRememberPassword(true);
      }
    } catch (error) {
      console.error('Fehler beim Laden der gespeicherten Anmeldedaten:', error);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Fehler', 'Bitte E-Mail und Passwort eingeben.');
      return;
    }
    setIsLoading(true);
    try {
      const user = await login(email, password);
      if (rememberPassword) {
        await AsyncStorage.setItem('savedEmail', email);
        await AsyncStorage.setItem('savedPassword', password);
        await AsyncStorage.setItem('rememberPassword', 'true');
      } else {
        await AsyncStorage.removeItem('savedPassword');
        await AsyncStorage.setItem('rememberPassword', 'false');
        await AsyncStorage.setItem('savedEmail', email);
      }
      if (user && user.role === 'client' && user.passwordChanged === false) {
        router.replace('/change-password');
      } else {
        router.replace('/(tabs)');
      }
    } catch (e) {
      console.log('🚨 Login Fehler:', e);
      if (e instanceof Error && e.message === 'CONNECTION_FAILED') {
        Alert.alert('Verbindungsfehler', 'Keine Verbindung zum Server. Bitte überprüfe deine Internetverbindung und versuche es erneut.');
      } else if (e instanceof Error && e.message === 'USER_NOT_INVITED') {
        showNotInvitedAlert();
      } else if (e instanceof Error && e.message === 'INVALID_PASSWORD') {
        Alert.alert('Fehler', 'Falsches Passwort. Bitte verwende das Einmalpasswort, das dir der Trainer gegeben hat.');
      } else {
        Alert.alert('Fehler', 'Ungültige Anmeldedaten. Überprüfe E-Mail und Passwort.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const showNotInvitedAlert = () => {
    Alert.alert(
      'Zugang nicht berechtigt',
      'Um die App zu verwenden, muss dich ein Trainer einladen.',
      [
        {
          text: 'Abbrechen',
          style: 'cancel',
        },
        {
          text: 'Trainer kontaktieren',
          onPress: handleContactTrainer,
        },
      ]
    );
  };

  const handleContactTrainer = () => {
    const whatsappUrl = 'https://api.whatsapp.com/send/?phone=492262752717&text=Hallo%2C+ich+m%C3%B6chte+in+die+Trainingsplan+App.&type=phone_number&app_absent=0';
    Linking.openURL(whatsappUrl).catch(() => {
      Alert.alert('Fehler', 'WhatsApp konnte nicht geöffnet werden.');
    });
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('E-Mail erforderlich', 'Bitte E-Mail-Adresse eingeben.');
      return;
    }
    try {
      await resetPassword(email);
      Alert.alert('Passwort zurücksetzen', `Wir haben eine E-Mail an ${email} gesendet.`);
    } catch {
      Alert.alert('Fehler', 'Passwort-Reset konnte nicht gestartet werden.');
    }
  };

  const handleClearStorage = async () => {
    try {
      await clearStorage();
      Alert.alert('Storage gelöscht', 'Alle gespeicherten Daten wurden entfernt.');
    } catch {
      Alert.alert('Fehler', 'Storage konnte nicht gelöscht werden.');
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
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />
          </View>

          <View style={styles.rememberContainer}>
            <Switch
              testID="remember-password"
              value={rememberPassword}
              onValueChange={setRememberPassword}
              trackColor={{ false: Colors.border, true: Colors.accent }}
              thumbColor={rememberPassword ? Colors.background : Colors.textMuted}
            />
            <Text style={styles.rememberText}>Passwort speichern</Text>
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

          <TouchableOpacity
            testID="clear-storage"
            style={styles.debugButton}
            onPress={handleClearStorage}
          >
            <Text style={styles.debugButtonText}>🗑️ Storage löschen (Debug)</Text>
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
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  rememberText: {
    marginLeft: Spacing.sm,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  forgotPasswordButton: {
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
  debugButton: {
    alignItems: 'center',
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.sm,
  },
  debugButtonText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '500' as const,
  },
});