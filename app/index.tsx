import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoadingScreen from '@/components/LoadingScreen';

export default function IndexRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'client') {
      AsyncStorage.getItem('onboardingComplete').then(value => {
        setOnboardingComplete(value === 'true');
        setOnboardingChecked(true);
      }).catch(() => {
        setOnboardingChecked(true);
      });
    } else {
      setOnboardingChecked(true);
    }
  }, [isAuthenticated, user?.role]);

  if (isLoading || !onboardingChecked) return <LoadingScreen />;

  if (!isAuthenticated) return <Redirect href="/login" />;

  if (user?.role === 'admin') return <Redirect href="/(admin-tabs)" />;
  if (user?.role === 'trainer') return <Redirect href="/(trainer-tabs)" />;

  if (!onboardingComplete) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
