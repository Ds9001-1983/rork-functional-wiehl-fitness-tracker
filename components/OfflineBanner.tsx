import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/colors';
import { trpcClient } from '@/lib/trpc';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        await trpcClient.auth.login.mutate({ email: '__ping__', password: '' });
      } catch (error: any) {
        if (!mounted) return;
        if (error?.message?.includes('fetch') || error?.message?.includes('network') || error?.message?.includes('Network')) {
          setIsOffline(true);
        } else {
          setIsOffline(false);
        }
      }
    };

    check();
    const interval = setInterval(check, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: isOffline ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOffline]);

  if (!isOffline) return null;

  return (
    <Animated.View style={[styles.banner, { opacity }]}>
      <WifiOff size={14} color={Colors.text} />
      <Text style={styles.text}>Offline - Daten werden lokal gespeichert</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.warning,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
  },
  text: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.background,
  },
});
