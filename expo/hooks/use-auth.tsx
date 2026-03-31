import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { User } from '@/types/workout';
import { trpcClient, setCachedToken } from '@/lib/trpc';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearStorage: () => Promise<void>;
}

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      console.log('🔄 Loading user from AsyncStorage...');
      const [storedUser, storedToken] = await Promise.all([
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('authToken'),
      ]);
      console.log('📱 Stored user data:', storedUser);
      if (storedUser && storedToken) {
        const parsedUser = JSON.parse(storedUser);
        console.log('👤 Parsed user:', parsedUser);
        setCachedToken(storedToken);
        setUser(parsedUser);
      } else if (storedUser && !storedToken) {
        // User exists but no token (pre-JWT session) -> force re-login
        console.log('⚠️ User ohne Token gefunden - erzwinge Re-Login');
        await AsyncStorage.removeItem('user');
        setUser(null);
      } else {
        console.log('❌ No stored user found');
      }
    } catch (error) {
      console.error('❌ Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (email: string, password: string): Promise<User | null> => {
    try {
      console.log('🔄 Attempting login with backend for:', email);
      console.log('🔄 tRPC client available:', !!trpcClient);
      console.log('🔄 tRPC auth available:', !!trpcClient.auth);
      console.log('🔄 tRPC login available:', !!trpcClient.auth.login);
      
      // Test connection first
      try {
        console.log('🔄 Testing tRPC connection...');
        await trpcClient.example.hi.query({ name: 'connection-test' });
        console.log('✅ tRPC connection successful');
      } catch (connectionError) {
        console.log('❌ tRPC connection failed:', connectionError);
        throw new Error('CONNECTION_FAILED');
      }
      
      const result = await trpcClient.auth.login.mutate({ email, password });
      
      if (result.success && result.user) {
        console.log('✅ Backend login successful for:', email);
        console.log('✅ User data:', result.user);
        await Promise.all([
          AsyncStorage.setItem('user', JSON.stringify(result.user)),
          AsyncStorage.setItem('authToken', result.token),
        ]);
        setCachedToken(result.token);
        setUser(result.user);
        return result.user;
      }
      
      throw new Error('LOGIN_FAILED');
    } catch (error: any) {
      console.log('🚨 Backend login error:', error);
      console.log('🚨 Error message:', error.message);
      console.log('🚨 Error data:', error.data);
      console.log('🚨 Error shape:', error.shape);
      console.log('🚨 Full error object:', JSON.stringify(error, null, 2));
      
      // Check for tRPC error format
      const errorMessage = error.message || error.data?.message || error.shape?.message || error.code;
      console.log('🚨 Extracted error message:', errorMessage);
      
      if (errorMessage === 'CONNECTION_FAILED' || errorMessage?.includes('fetch')) {
        throw new Error('CONNECTION_FAILED');
      }
      if (errorMessage === 'USER_NOT_INVITED' || errorMessage?.includes('USER_NOT_INVITED')) {
        throw new Error('USER_NOT_INVITED');
      }
      if (errorMessage === 'INVALID_PASSWORD' || errorMessage?.includes('INVALID_PASSWORD')) {
        throw new Error('INVALID_PASSWORD');
      }
      throw new Error('INVALID_CREDENTIALS');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      console.log('🔄 Logout: Entferne Benutzerdaten aus AsyncStorage...');
      await Promise.all([
        AsyncStorage.removeItem('user'),
        AsyncStorage.removeItem('authToken'),
      ]);
      setCachedToken(null);
      console.log('✅ Logout: Benutzerdaten erfolgreich entfernt');
      setUser(null);
      console.log('✅ Logout: User State zurückgesetzt');
    } catch (error) {
      console.error('❌ Logout Fehler:', error);
      setCachedToken(null);
      setUser(null);
      throw error;
    }
  }, []);

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!user) return;

    // Passwort auf dem Server ändern
    await trpcClient.auth.changePassword.mutate({ currentPassword, newPassword });

    const updatedUser = { ...user, passwordChanged: true };
    setUser(updatedUser);
    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    console.log('[Auth] Passwort erfolgreich geändert');
  }, [user]);

  const resetPassword = useCallback(async (email: string) => {
    console.log('🔄 Passwort-Reset angefordert für:', email);
    return Promise.resolve();
  }, []);

  const clearStorage = useCallback(async () => {
    try {
      console.log('[Auth] Clearing user data from AsyncStorage...');
      // workouts_migrated bewahren um Duplikate zu vermeiden
      const migrated = await AsyncStorage.getItem('workouts_migrated');
      await AsyncStorage.clear();
      if (migrated) {
        await AsyncStorage.setItem('workouts_migrated', migrated);
      }
      setCachedToken(null);
      setUser(null);
      console.log('[Auth] AsyncStorage cleared');
    } catch (error) {
      console.error('[Auth] Error clearing AsyncStorage:', error);
      throw error;
    }
  }, []);

  const authState = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updatePassword,
    resetPassword,
    clearStorage,
  }), [user, isLoading, login, logout, updatePassword, resetPassword, clearStorage]);

  return authState;
});