import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { trpcClient } from '@/lib/trpc';
import { Colors as DefaultColors } from '@/constants/colors';

export interface StudioBranding {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
}

const DEFAULT_STUDIO: StudioBranding = {
  id: '1',
  name: 'Functional Wiehl',
  slug: 'functional-wiehl',
  logoUrl: null,
  primaryColor: DefaultColors.primary,
  accentColor: DefaultColors.accent,
};

export const [StudioProvider, useStudio] = createContextHook(() => {
  const [studio, setStudio] = useState<StudioBranding>(DEFAULT_STUDIO);
  const [isLoading, setIsLoading] = useState(true);

  const loadStudio = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('studio');
      if (stored) {
        const parsed = JSON.parse(stored);
        setStudio({
          id: parsed.id || '1',
          name: parsed.name || DEFAULT_STUDIO.name,
          slug: parsed.slug || DEFAULT_STUDIO.slug,
          logoUrl: parsed.logoUrl || null,
          primaryColor: parsed.primaryColor || DEFAULT_STUDIO.primaryColor,
          accentColor: parsed.accentColor || DEFAULT_STUDIO.accentColor,
        });
      }
    } catch {
      // Use defaults
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudio();
  }, [loadStudio]);

  const refreshStudio = useCallback(async () => {
    try {
      const serverStudio = await trpcClient.studios.get.query();
      if (serverStudio) {
        const branding: StudioBranding = {
          id: serverStudio.id,
          name: serverStudio.name,
          slug: serverStudio.slug,
          logoUrl: serverStudio.logoUrl,
          primaryColor: serverStudio.primaryColor,
          accentColor: serverStudio.accentColor,
        };
        setStudio(branding);
        await AsyncStorage.setItem('studio', JSON.stringify(branding));
      }
    } catch {
      // Keep cached data
    }
  }, []);

  const studioColors = useMemo(() => ({
    ...DefaultColors,
    primary: studio.primaryColor || DefaultColors.primary,
    accent: studio.accentColor || DefaultColors.accent,
    tabBar: studio.primaryColor || DefaultColors.tabBar,
    tabBarActive: studio.accentColor || DefaultColors.tabBarActive,
  }), [studio.primaryColor, studio.accentColor]);

  return useMemo(() => ({
    studio,
    studioColors,
    isLoading,
    refreshStudio,
  }), [studio, studioColors, isLoading, refreshStudio]);
});
