import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, PanResponder, Animated, Dimensions } from 'react-native';
import { openExternalUrl } from '@/lib/open-url';
import { Stack, router } from 'expo-router';
import { UserPlus, ClipboardList, Mail, User, Trash2, Phone, Users, Calendar, ChevronRight } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { useClients } from '@/hooks/use-clients';

export default function TrainerCenterScreen() {
  const { user } = useAuth();
  const { clients, addClient, removeClient } = useClients();

  const [clientFirstName, setClientFirstName] = useState<string>('');
  const [clientLastName, setClientLastName] = useState<string>('');
  const [clientEmail, setClientEmail] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [swipedClientId, setSwipedClientId] = useState<string | null>(null);
  const [deleteHoldProgress, setDeleteHoldProgress] = useState<number>(0);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const swipeAnimations = useRef<Map<string, Animated.Value>>(new Map()).current;

  const isTrainer = user?.role === 'trainer' || user?.role === 'admin';
  const screenWidth = Dimensions.get('window').width;
  const swipeThreshold = screenWidth * 0.3;

  const generateStarterPassword = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const array = new Uint8Array(8);
    // getRandomValues ist in React Native via expo verfügbar
    if (typeof globalThis.crypto?.getRandomValues === 'function') {
      globalThis.crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < 8; i++) array[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(array, b => chars[b % chars.length]).join('');
  };

  const sendWelcomeEmail = async (email: string, name: string, password: string): Promise<boolean> => {
    try {
      console.log(`📧 E-Mail wird gesendet an: ${email}`);
      console.log(`👤 Kunde: ${name}`);
      console.log(`🔑 Starter-Passwort für ${name}: ${password}`);
      
      // E-Mail-Betreff und -Inhalt
      const subject = 'Willkommen bei Functional Wiehl - Ihre Anmeldedaten';
      const body = `Hallo ${name},

willkommen bei Functional Wiehl!

Ihr Trainer hat Ihnen einen Account erstellt.

Ihre Anmeldedaten:
E-Mail: ${email}
Starter-Passwort: ${password}

Bitte loggen Sie sich in der App ein und ändern Sie Ihr Passwort beim ersten Login.

Viel Erfolg beim Training!
Ihr Functional Wiehl Team`;
      
      // mailto: URL erstellen
      const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      console.log('📧 Öffne E-Mail-Client für:', email);
      return await openExternalUrl(mailtoUrl);
    } catch (error) {
      console.error('Fehler beim E-Mail-Versand:', error);
      return false;
    }
  };

  const handleCreateClient = async () => {
    if (!clientFirstName || !clientLastName) {
      Alert.alert('Fehler', 'Bitte Vor- und Nachname eingeben');
      return;
    }
    
    if (!clientPhone) {
      Alert.alert('Fehler', 'Bitte Handynummer eingeben');
      return;
    }
    
    if (!clientEmail) {
      Alert.alert('Fehler', 'Bitte E-Mail-Adresse eingeben');
      return;
    }
    
    // E-Mail-Format validieren
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientEmail)) {
      Alert.alert('Fehler', 'Bitte gültige E-Mail-Adresse eingeben');
      return;
    }
    
    const fullName = `${clientFirstName} ${clientLastName}`;
    const starterPassword = generateStarterPassword();
    
    console.log('[Trainer] Creating client with password:', starterPassword);
    
    try {
      // Kunde erstellen
      await addClient({
        name: fullName,
        email: clientEmail,
        phone: clientPhone,
        avatar: undefined,
        starterPassword, // Temporäres Passwort speichern
        passwordChanged: false, // Flag für Passwort-Änderung
        stats: {
          totalWorkouts: 0,
          totalVolume: 0,
          currentStreak: 0,
          longestStreak: 0,
          personalRecords: {}
        }
      });
      
      console.log('[Trainer] Client created successfully, sending welcome email');
      
      // Willkommens-E-Mail senden
      const emailSent = await sendWelcomeEmail(clientEmail, fullName, starterPassword);
      
      if (emailSent) {
        Alert.alert(
          '✅ Kunde erfolgreich erstellt!',
          `${fullName} wurde erfolgreich hinzugefügt.\n\n📧 Ihr E-Mail-Client wurde geöffnet, um die Willkommens-E-Mail zu versenden.\n\n💡 Bitte senden Sie die E-Mail ab, damit der Kunde seine Anmeldedaten erhält.\n\n🔑 Passwort: ${starterPassword}`,
          [
            { text: 'Verstanden', style: 'default' }
          ]
        );
      } else {
        Alert.alert(
          '⚠️ Kunde erstellt - E-Mail-Client nicht verfügbar',
          `${fullName} wurde erfolgreich hinzugefügt.\n\n❌ Kein E-Mail-Client verfügbar.\n\n🔑 Starter-Passwort: ${starterPassword}\n\n📱 Bitte teilen Sie dem Kunden das Passwort manuell mit (z.B. per WhatsApp oder Anruf).`,
          [
            { text: 'Passwort kopieren', onPress: () => {
              // Hier könnte Clipboard.setString(starterPassword) verwendet werden
              console.log('Passwort zum Kopieren:', starterPassword);
            }},
            { text: 'OK', style: 'default' }
          ]
        );
      }
      
      // Felder zurücksetzen
      setClientFirstName('');
      setClientLastName('');
      setClientEmail('');
      setClientPhone('');
      
    } catch (error: any) {
      console.error('Fehler beim Erstellen des Kunden:', error);
      
      if (error.message === 'CLIENT_EMAIL_EXISTS') {
        Alert.alert(
          'Kunde bereits vorhanden', 
          `Ein Kunde mit der E-Mail-Adresse "${clientEmail}" existiert bereits.\n\nBitte verwenden Sie eine andere E-Mail-Adresse oder suchen Sie den bestehenden Kunden in der Kundenverwaltung.`
        );
      } else if (error.message === 'CLIENT_PHONE_EXISTS') {
        Alert.alert(
          'Kunde bereits vorhanden', 
          `Ein Kunde mit der Telefonnummer "${clientPhone}" existiert bereits.\n\nBitte verwenden Sie eine andere Telefonnummer oder suchen Sie den bestehenden Kunden in der Kundenverwaltung.`
        );
      } else if (error.message === 'CLIENT_ALREADY_EXISTS') {
        // Fallback für alte Fehlermeldung
        Alert.alert('Fehler', 'Ein Kunde mit diesen Daten existiert bereits.');
      } else {
        Alert.alert('Fehler', 'Kunde konnte nicht erstellt werden. Bitte versuchen Sie es erneut.');
      }
    }
  };

  const getSwipeAnimation = (clientId: string) => {
    if (!swipeAnimations.has(clientId)) {
      swipeAnimations.set(clientId, new Animated.Value(0));
    }
    return swipeAnimations.get(clientId)!;
  };

  const createSwipeHandler = (clientId: string) => {
    const translateX = getSwipeAnimation(clientId);
    
    const panResponder = PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 50;
      },
      onPanResponderGrant: () => {
        // @ts-ignore - _value exists on Animated.Value
        translateX.setOffset(translateX._value);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -swipeThreshold));
        } else {
          translateX.setValue(Math.max(0, gestureState.dx));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        translateX.flattenOffset();
        
        if (gestureState.dx < -swipeThreshold / 2) {
          // Swipe left - show delete button
          Animated.spring(translateX, {
            toValue: -swipeThreshold,
            useNativeDriver: true,
          }).start();
          setSwipedClientId(clientId);
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
          if (swipedClientId === clientId) {
            setSwipedClientId(null);
          }
        }
      },
    });
    
    return { panResponder, translateX };
  };

  const startDeleteHold = (clientId: string) => {
    setIsHolding(true);
    setDeleteHoldProgress(0);
    
    const startTime = Date.now();
    const duration = 5000; // 5 seconds
    
    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setDeleteHoldProgress(progress);
      
      if (progress >= 1) {
        // Hold completed - delete client
        clearInterval(progressTimerRef.current!);
        setIsHolding(false);
        setDeleteHoldProgress(0);
        setSwipedClientId(null);
        
        const client = clients.find(c => c.id === clientId);
        if (client) {
          removeClient(clientId);
          Alert.alert('Kunde gelöscht', `${client.name} wurde erfolgreich gelöscht.`);
        }
      }
    }, 50);
    
    holdTimerRef.current = setTimeout(() => {
      clearInterval(progressTimerRef.current!);
      setIsHolding(false);
      setDeleteHoldProgress(0);
    }, duration);
  };

  const cancelDeleteHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setIsHolding(false);
    setDeleteHoldProgress(0);
  };

  const resetSwipe = () => {
    if (swipedClientId) {
      const translateX = getSwipeAnimation(swipedClientId);
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
    setSwipedClientId(null);
    cancelDeleteHold();
  };

  if (!isTrainer) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centeredText}>Nur für Trainer</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Trainer Center' }} />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Neuen Kunden anlegen</Text>
            <UserPlus size={20} color={Colors.accent} />
          </View>
          <View style={styles.row}>
            <User size={18} color={Colors.textSecondary} />
            <TextInput
              testID="client-firstname"
              value={clientFirstName}
              onChangeText={setClientFirstName}
              placeholder="Vorname *"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
            />
          </View>
          <View style={styles.row}>
            <User size={18} color={Colors.textSecondary} />
            <TextInput
              testID="client-lastname"
              value={clientLastName}
              onChangeText={setClientLastName}
              placeholder="Nachname *"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
            />
          </View>
          <View style={styles.row}>
            <Phone size={18} color={Colors.textSecondary} />
            <TextInput
              testID="client-phone"
              value={clientPhone}
              onChangeText={setClientPhone}
              placeholder="Handynummer *"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.row}>
            <Mail size={18} color={Colors.textSecondary} />
            <TextInput
              testID="client-email"
              value={clientEmail}
              onChangeText={setClientEmail}
              placeholder="E-Mail-Adresse *"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.infoBox}>
            <Mail size={16} color={Colors.accent} />
            <Text style={styles.infoText}>
              Ihr E-Mail-Client wird geöffnet, um dem Kunden seine Anmeldedaten zu senden.
            </Text>
          </View>
          <TouchableOpacity testID="create-client" style={styles.primaryButton} onPress={handleCreateClient}>
            <UserPlus size={18} color={Colors.text} />
            <Text style={styles.primaryButtonText}>Kunde anlegen</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Training planen</Text>
            <TouchableOpacity
              style={styles.scheduleTrainingButton}
              onPress={() => router.push('/customer-management')}
            >
              <Calendar size={18} color={Colors.text} />
              <Text style={styles.scheduleTrainingButtonText}>Kunde wählen</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.cardDescription}>
            Wählen Sie einen Kunden aus und weisen Sie eine Trainingsplan-Vorlage als persönliche Kopie zu.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: Spacing.md }]}
          onPress={() => router.push('/(trainer-tabs)/plans' as any)}
        >
          <ClipboardList size={24} color={Colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Trainingspläne verwalten</Text>
            <Text style={styles.cardDescription}>
              Vorlagen erstellen, bearbeiten und Kunden zuweisen.
            </Text>
          </View>
          <ChevronRight size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Meine Kunden ({clients.length})</Text>
            <TouchableOpacity 
              style={styles.manageClientsButton}
              onPress={() => router.push('/customer-management')}
            >
              <Users size={18} color={Colors.text} />
              <Text style={styles.manageClientsButtonText}>Verwalten</Text>
            </TouchableOpacity>
          </View>
          {clients.length === 0 ? (
            <Text style={styles.muted}>Noch keine Kunden angelegt</Text>
          ) : (
            clients.map((c) => {
              const { panResponder, translateX } = createSwipeHandler(c.id);
              // const isSwipedOpen = swipedClientId === c.id;
              
              return (
                <View key={c.id} style={styles.clientCardContainer}>
                  <Animated.View 
                    style={[
                      styles.clientCard,
                      {
                        transform: [{ translateX }]
                      }
                    ]}
                    {...panResponder.panHandlers}
                  >
                    <TouchableOpacity 
                      style={styles.clientCardContent}
                      onPress={resetSwipe}
                      activeOpacity={0.7}
                    >
                      <View style={styles.clientInfo}>
                        <Text style={styles.clientName}>{c.name}</Text>
                        <Text style={styles.clientDetails}>📧 {c.email}</Text>
                        {c.phone && <Text style={styles.clientDetails}>📱 {c.phone}</Text>}
                        <View style={styles.clientStatusRow}>
                          <Text style={styles.clientStats}>
                            {c.stats?.totalWorkouts || 0} Workouts • Streak: {c.stats?.currentStreak || 0}
                          </Text>
                          {c.passwordChanged === false && (
                            <View style={styles.passwordBadge}>
                              <Text style={styles.passwordBadgeText}>Passwort ändern</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                  
                  {/* Delete button behind the card */}
                  <View style={styles.deleteButtonContainer}>
                    <TouchableOpacity 
                      testID={`remove-${c.id}`}
                      style={[
                        styles.holdDeleteButton,
                        isHolding && swipedClientId === c.id && styles.holdDeleteButtonActive
                      ]}
                      onPressIn={() => startDeleteHold(c.id)}
                      onPressOut={cancelDeleteHold}
                      activeOpacity={0.8}
                    >
                      <View style={styles.deleteButtonContent}>
                        <Trash2 size={20} color={Colors.text} />
                        <Text style={styles.deleteButtonText}>5s halten</Text>
                        {isHolding && swipedClientId === c.id && (
                          <View style={styles.progressContainer}>
                            <View 
                              style={[
                                styles.progressBar,
                                { width: `${deleteHoldProgress * 100}%` }
                              ]} 
                            />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
        
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  centeredText: { color: Colors.text, fontSize: 16 },
  card: {
    backgroundColor: Colors.surface,
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  cardTitle: { color: Colors.text, fontSize: 18, fontWeight: '600' as const },
  addButton: {
    backgroundColor: Colors.accent,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  scheduleTrainingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  scheduleTrainingButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  cardDescription: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: -Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    marginBottom: Spacing.sm,
  },
  input: { flex: 1, color: Colors.text, fontSize: 16, marginLeft: Spacing.sm },
  primaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.accent, padding: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.sm,
  },
  primaryButtonText: { color: Colors.text, fontSize: 16, fontWeight: '600' as const, marginLeft: Spacing.sm },
  invites: { marginTop: Spacing.md },
  inviteRow: { paddingVertical: Spacing.xs },
  inviteText: { color: Colors.textSecondary, fontSize: 14 },
  listRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  listText: { color: Colors.text, fontSize: 16 },
  smallButton: { backgroundColor: Colors.accent, paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.sm },
  muted: { color: Colors.textMuted },
  sectionSubtitle: { color: Colors.textSecondary, fontSize: 14, marginBottom: Spacing.md },
  clientSelector: { marginBottom: Spacing.md },
  clientOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clientOptionSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  clientOptionText: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginLeft: Spacing.sm,
  },
  clientOptionTextSelected: {
    color: Colors.text,
    fontWeight: '600' as const,
  },
  clientCardContainer: {
    marginBottom: Spacing.sm,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: BorderRadius.md,
  },
  clientCard: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    zIndex: 1,
  },
  clientCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  clientDetails: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 2,
  },
  clientStats: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    flex: 1,
  },
  clientStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  passwordBadge: {
    backgroundColor: Colors.warning || '#FFA500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  passwordBadgeText: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: '600' as const,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.accent + '20',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  infoText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginLeft: Spacing.sm,
    flex: 1,
    lineHeight: 18,
  },
  deleteButtonContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: Dimensions.get('window').width * 0.3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.error || '#FF4444',
    zIndex: 0,
  },
  holdDeleteButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    position: 'relative',
  },
  holdDeleteButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  deleteButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600' as const,
    marginTop: 4,
    textAlign: 'center',
  },
  progressContainer: {
    position: 'absolute',
    bottom: -10,
    left: -20,
    right: -20,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.text,
    borderRadius: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '500' as const,
    marginTop: Spacing.sm,
  },
  emptySubtext: {
    color: Colors.textMuted,
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  plansList: {
    marginTop: Spacing.sm,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  planDesc: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 2,
  },
  planMeta: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  assignButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  cancelButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '500' as const,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  clientOptionInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  clientOptionPhone: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  planSelector: {
    marginBottom: Spacing.lg,
  },
  planSelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  planSelectorInfo: {
    flex: 1,
  },
  planSelectorName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  planSelectorDesc: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  manageClientsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  manageClientsButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
});