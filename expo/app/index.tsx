import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import LoadingScreen from '@/components/LoadingScreen';

export default function IndexRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Redirect href="/login" />;

  if (user?.role === 'admin') return <Redirect href="/(admin-tabs)" />;
  if (user?.role === 'trainer') return <Redirect href="/(trainer-tabs)" />;
  return <Redirect href="/(tabs)" />;
}
