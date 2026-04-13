import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { Colors } from '@/constants/colors';

export function TrainerOnly({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const allowed = user?.role === 'trainer' || user?.role === 'admin';

  useEffect(() => {
    if (!isLoading && !allowed) {
      const t = setTimeout(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)');
      }, 50);
      return () => clearTimeout(t);
    }
  }, [isLoading, allowed]);

  if (isLoading) return null;
  if (!allowed) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Kein Zugriff</Text>
      </View>
    );
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  text: { color: Colors.text },
});
