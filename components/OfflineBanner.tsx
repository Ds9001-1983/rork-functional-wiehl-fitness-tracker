import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { WifiOff, RefreshCw, Check, Cloud } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/colors';
import { trpcClient } from '@/lib/trpc';
import { syncQueue, SyncStatus } from '@/lib/sync-queue';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    pendingCount: 0,
    isSyncing: false,
    lastSyncTime: null,
    lastError: null,
  });
  const [justSynced, setJustSynced] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const wasOffline = useRef(false);

  // Subscribe to sync queue status
  useEffect(() => {
    const unsubscribe = syncQueue.subscribe(setSyncStatus);
    return unsubscribe;
  }, []);

  const check = useCallback(async () => {
    try {
      await trpcClient.auth.login.mutate({ email: '__ping__', password: '' });
    } catch (error: any) {
      if (error?.message?.includes('fetch') || error?.message?.includes('network') || error?.message?.includes('Network')) {
        setIsOffline(true);
        wasOffline.current = true;
        return;
      }
      // Server responded (even with error) = online
      setIsOffline(false);

      // Process queue when coming back online
      if (wasOffline.current) {
        wasOffline.current = false;
        const result = await syncQueue.processQueue();
        if (result.processed > 0) {
          setJustSynced(true);
          setTimeout(() => setJustSynced(false), 3000);
        }
      } else {
        // Also try processing queue periodically when online
        const status = syncQueue.getStatus();
        if (status.pendingCount > 0 && !status.isSyncing) {
          syncQueue.processQueue();
        }
      }
    }
  }, []);

  useEffect(() => {
    syncQueue.init();
    check();
    const interval = setInterval(check, 30000);
    return () => { clearInterval(interval); };
  }, [check]);

  const handleManualSync = useCallback(async () => {
    if (syncStatus.isSyncing) return;
    const result = await syncQueue.processQueue();
    if (result.processed > 0) {
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 3000);
    }
  }, [syncStatus.isSyncing]);

  const showBanner = isOffline || syncStatus.pendingCount > 0 || syncStatus.isSyncing || justSynced;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: showBanner ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showBanner]);

  if (!showBanner) return null;

  // Just synced successfully
  if (justSynced && !isOffline) {
    return (
      <Animated.View style={[styles.banner, styles.successBanner, { opacity }]}>
        <Check size={14} color={Colors.background} />
        <Text style={styles.text}>Alle Daten synchronisiert</Text>
      </Animated.View>
    );
  }

  // Currently syncing
  if (syncStatus.isSyncing) {
    return (
      <Animated.View style={[styles.banner, styles.syncBanner, { opacity }]}>
        <RefreshCw size={14} color={Colors.background} />
        <Text style={styles.text}>Synchronisiere...</Text>
      </Animated.View>
    );
  }

  // Offline
  if (isOffline) {
    return (
      <Animated.View style={[styles.banner, { opacity }]}>
        <WifiOff size={14} color={Colors.background} />
        <Text style={styles.text}>
          Offline{syncStatus.pendingCount > 0 ? ` - ${syncStatus.pendingCount} ausstehend` : ' - Daten werden lokal gespeichert'}
        </Text>
      </Animated.View>
    );
  }

  // Online but has pending items
  if (syncStatus.pendingCount > 0) {
    return (
      <Animated.View style={[styles.banner, styles.pendingBanner, { opacity }]}>
        <TouchableOpacity style={styles.syncRow} onPress={handleManualSync} activeOpacity={0.7}>
          <Cloud size={14} color={Colors.background} />
          <Text style={styles.text}>{syncStatus.pendingCount} Aenderung{syncStatus.pendingCount !== 1 ? 'en' : ''} warten auf Sync</Text>
          <RefreshCw size={12} color={Colors.background} />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return null;
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
  successBanner: {
    backgroundColor: '#22c55e',
  },
  syncBanner: {
    backgroundColor: Colors.accent,
  },
  pendingBanner: {
    backgroundColor: '#3b82f6',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.background,
  },
});
