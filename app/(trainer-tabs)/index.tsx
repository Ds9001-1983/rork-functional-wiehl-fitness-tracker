import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Animated, Dimensions, PanResponder, Linking } from 'react-native';
import { router } from 'expo-router';
import { UserPlus, User, Mail, Phone, Trash2, Users, Calendar } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { useClients } from '@/hooks/use-clients';
import { useWorkouts } from '@/hooks/use-workouts';
import ConfirmDialog from '@/components/ConfirmDialog';
import StatusBanner from '@/components/StatusBanner';

export default function TrainerClientsScreen() {
  const { user } = useAuth();
  const { clients, addClient, removeClient } = useClients();
  const { workoutPlans } = useWorkouts();

  const [clientFirstName, setClientFirstName] = useState('');
  const [clientLastName, setClientLastName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [swipedClientId, setSwipedClientId] = useState<string | null>(null);
  const [deleteHoldProgress, setDeleteHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const swipeAnimations = useRef<Map<string, Animated.Value>>(new Map()).current;

  const screenWidth = Dimensions.get('window').width;
  const swipeThreshold = screenWidth * 0.3;

  const generateStarterPassword = (): string => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    for (let i = 0; i < 4; i++) {
      result += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    return result.split('').sort(() => Math.random() - 0.5).join('');
  };

  const handleCreateClient = async () => {
    if (!clientFirstName.trim() || !clientLastName.trim()) {
      setStatusMessage({ type: 'error', text: 'Bitte Vor- und Nachname eingeben.' });
      return;
    }
    if (!clientEmail.trim() || !clientEmail.includes('@')) {
      setStatusMessage({ type: 'error', text: 'Bitte eine gueltige E-Mail eingeben.' });
      return;
    }
    if (!clientPhone.trim()) {
      setStatusMessage({ type: 'error', text: 'Bitte eine Telefonnummer eingeben.' });
      return;
    }

    const fullName = `${clientFirstName.trim()} ${clientLastName.trim()}`;
    const starterPassword = generateStarterPassword();

    try {
      await addClient({
        name: fullName,
        email: clientEmail.trim().toLowerCase(),
        phone: clientPhone.trim(),
        starterPassword,
      });

      const subject = encodeURIComponent(`Dein Zugang zur Functional Wiehl App`);
      const body = encodeURIComponent(
        `Hallo ${fullName},\n\nDein Trainer hat dir Zugang zur Functional Wiehl Fitness App eingerichtet.\n\nDeine Anmeldedaten:\nE-Mail: ${clientEmail.trim().toLowerCase()}\nPasswort: ${starterPassword}\n\nBitte melde dich an unter: https://app.functional-wiehl.de\n\nBitte aendere dein Passwort nach dem ersten Login.\n\nViel Spass beim Training!\nDein Functional Wiehl Team`
      );
      const mailtoUrl = `mailto:${clientEmail.trim().toLowerCase()}?subject=${subject}&body=${body}`;

      setStatusMessage({ type: 'success', text: `Kunde ${fullName} wurde angelegt. Starter-Passwort: ${starterPassword}` });
      setClientFirstName('');
      setClientLastName('');
      setClientEmail('');
      setClientPhone('');

      try {
        await Linking.openURL(mailtoUrl);
      } catch {
        // Email client couldn't open, but client was created
      }
    } catch (error: any) {
      const errorMsg = error?.message || '';
      const msg = errorMsg.includes('EMAIL_EXISTS') ? 'Diese E-Mail ist bereits registriert.' :
                  errorMsg.includes('PHONE_EXISTS') ? 'Diese Telefonnummer ist bereits registriert.' :
                  'Fehler beim Anlegen des Kunden.';
      setStatusMessage({ type: 'error', text: msg });
    }
  };

  const getSwipeAnim = (clientId: string) => {
    if (!swipeAnimations.has(clientId)) {
      swipeAnimations.set(clientId, new Animated.Value(0));
    }
    return swipeAnimations.get(clientId)!;
  };

  const resetSwipe = () => {
    swipeAnimations.forEach((anim) => {
      Animated.spring(anim, { toValue: 0, useNativeDriver: true }).start();
    });
    setSwipedClientId(null);
  };

  const createSwipeHandler = (clientId: string) => {
    const translateX = getSwipeAnim(clientId);
    const panResponder = PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 10,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -swipeThreshold * 1.2));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -swipeThreshold * 0.5) {
          Animated.spring(translateX, { toValue: -swipeThreshold, useNativeDriver: true }).start();
          setSwipedClientId(clientId);
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          setSwipedClientId(null);
        }
      },
    });
    return { panResponder, translateX };
  };

  const startDeleteHold = (clientId: string) => {
    setIsHolding(true);
    setSwipedClientId(clientId);
    setDeleteHoldProgress(0);
    const startTime = Date.now();
    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setDeleteHoldProgress(Math.min(elapsed / 5000, 1));
    }, 50);
    holdTimerRef.current = setTimeout(async () => {
      cancelDeleteHold();
      try {
        await removeClient(clientId);
        resetSwipe();
        setStatusMessage({ type: 'success', text: 'Kunde wurde entfernt.' });
      } catch {
        setStatusMessage({ type: 'error', text: 'Kunde konnte nicht entfernt werden.' });
      }
    }, 5000);
  };

  const cancelDeleteHold = () => {
    setIsHolding(false);
    setDeleteHoldProgress(0);
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
      {statusMessage && (
        <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
          <StatusBanner type={statusMessage.type} text={statusMessage.text} onDismiss={() => setStatusMessage(null)} />
        </View>
      )}

      {/* Neuen Kunden anlegen */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Neuen Kunden anlegen</Text>
          <UserPlus size={20} color={Colors.accent} />
        </View>
        <View style={styles.row}>
          <User size={18} color={Colors.textSecondary} />
          <TextInput value={clientFirstName} onChangeText={setClientFirstName} placeholder="Vorname *" placeholderTextColor={Colors.textMuted} style={styles.input} />
        </View>
        <View style={styles.row}>
          <User size={18} color={Colors.textSecondary} />
          <TextInput value={clientLastName} onChangeText={setClientLastName} placeholder="Nachname *" placeholderTextColor={Colors.textMuted} style={styles.input} />
        </View>
        <View style={styles.row}>
          <Phone size={18} color={Colors.textSecondary} />
          <TextInput value={clientPhone} onChangeText={setClientPhone} placeholder="Handynummer *" placeholderTextColor={Colors.textMuted} style={styles.input} keyboardType="phone-pad" />
        </View>
        <View style={styles.row}>
          <Mail size={18} color={Colors.textSecondary} />
          <TextInput value={clientEmail} onChangeText={setClientEmail} placeholder="E-Mail-Adresse *" placeholderTextColor={Colors.textMuted} style={styles.input} keyboardType="email-address" autoCapitalize="none" />
        </View>
        <View style={styles.infoBox}>
          <Mail size={16} color={Colors.accent} />
          <Text style={styles.infoText}>Ihr E-Mail-Client wird geoeffnet, um dem Kunden seine Anmeldedaten zu senden.</Text>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={handleCreateClient}>
          <UserPlus size={18} color={Colors.text} />
          <Text style={styles.primaryButtonText}>Kunde anlegen</Text>
        </TouchableOpacity>
      </View>

      {/* Training planen */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Training planen</Text>
          <TouchableOpacity style={styles.scheduleButton} onPress={() => router.push('/schedule-training')}>
            <Calendar size={18} color={Colors.text} />
            <Text style={styles.scheduleButtonText}>Planen</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.cardDescription}>Waehlen Sie einen Kunden und erstellen Sie geplante Trainings mit Kalender-Integration.</Text>
      </View>

      {/* Kundenliste */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <TouchableOpacity onPress={() => router.push('/customer-management')}>
            <Text style={styles.cardTitle}>Meine Kunden ({clients.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.manageButton} onPress={() => router.push('/customer-management')}>
            <Users size={18} color={Colors.text} />
            <Text style={styles.manageButtonText}>Verwalten</Text>
          </TouchableOpacity>
        </View>
        {clients.length === 0 ? (
          <Text style={styles.muted}>Noch keine Kunden angelegt</Text>
        ) : (
          clients.map((c) => {
            const { panResponder, translateX } = createSwipeHandler(c.id);
            return (
              <View key={c.id} style={styles.clientCardContainer}>
                <Animated.View style={[styles.clientCard, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
                  <TouchableOpacity style={styles.clientCardContent} onPress={resetSwipe} activeOpacity={0.7}>
                    <View style={styles.clientInfo}>
                      <Text style={styles.clientName}>{c.name}</Text>
                      <Text style={styles.clientDetails}>{c.email}</Text>
                      {c.phone && <Text style={styles.clientDetails}>{c.phone}</Text>}
                      <View style={styles.clientStatusRow}>
                        <Text style={styles.clientStats}>{c.stats?.totalWorkouts || 0} Workouts</Text>
                        {c.passwordChanged === false && (
                          <View style={styles.passwordBadge}>
                            <Text style={styles.passwordBadgeText}>PW aendern</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
                <View style={styles.deleteButtonContainer}>
                  <TouchableOpacity
                    style={[styles.holdDeleteButton, isHolding && swipedClientId === c.id && styles.holdDeleteButtonActive]}
                    onPressIn={() => startDeleteHold(c.id)}
                    onPressOut={cancelDeleteHold}
                    activeOpacity={0.8}
                  >
                    <View style={styles.deleteButtonContent}>
                      <Trash2 size={20} color={Colors.text} />
                      <Text style={styles.deleteButtonText}>5s halten</Text>
                      {isHolding && swipedClientId === c.id && (
                        <View style={styles.progressContainer}>
                          <View style={[styles.progressBar, { width: `${deleteHoldProgress * 100}%` }]} />
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  card: { backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginTop: Spacing.lg, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  cardTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },
  cardDescription: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  input: { flex: 1, height: 44, paddingHorizontal: Spacing.sm, color: Colors.text, fontSize: 15 },
  infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, gap: Spacing.sm },
  infoText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.accent, padding: Spacing.md, borderRadius: BorderRadius.md },
  primaryButtonText: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  scheduleButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.accent, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md },
  scheduleButtonText: { color: Colors.text, fontSize: 14, fontWeight: '500' },
  manageButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.surfaceLight, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  manageButtonText: { color: Colors.text, fontSize: 14, fontWeight: '500' },
  muted: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: Spacing.lg },
  clientCardContainer: { position: 'relative', marginBottom: Spacing.sm, overflow: 'hidden', borderRadius: BorderRadius.md },
  clientCard: { backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, zIndex: 1 },
  clientCardContent: { padding: Spacing.md },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  clientDetails: { fontSize: 13, color: Colors.textSecondary, marginBottom: 1 },
  clientStatusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  clientStats: { fontSize: 12, color: Colors.textMuted },
  passwordBadge: { backgroundColor: Colors.accent, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  passwordBadgeText: { fontSize: 11, color: Colors.text, fontWeight: '500' },
  deleteButtonContainer: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 120, justifyContent: 'center', alignItems: 'center' },
  holdDeleteButton: { backgroundColor: Colors.error, width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', borderRadius: BorderRadius.md },
  holdDeleteButtonActive: { backgroundColor: '#CC0000' },
  deleteButtonContent: { alignItems: 'center', gap: 4 },
  deleteButtonText: { color: Colors.text, fontSize: 11, fontWeight: '500' },
  progressContainer: { width: 60, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, marginTop: 4 },
  progressBar: { height: '100%', backgroundColor: Colors.text, borderRadius: 2 },
});
