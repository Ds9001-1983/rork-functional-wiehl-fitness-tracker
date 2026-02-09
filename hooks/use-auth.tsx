import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { User } from '@/types/workout';
import { trpcClient } from '@/lib/trpc';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  switchRole: () => void;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateProfile: (updates: { name?: string; phone?: string; avatar?: string }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearStorage: () => Promise<void>;
}

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('[Auth] Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (email: string, password: string): Promise<User | null> => {
    try {
      // Test connection first
      try {
        await trpcClient.example.hi.query({ name: 'connection-test' });
      } catch (connectionError) {
        throw new Error('CONNECTION_FAILED');
      }

      const result = await trpcClient.auth.login.mutate({ email, password });

      if (result.success && result.user) {
        await AsyncStorage.setItem('user', JSON.stringify(result.user));
        setUser(result.user);
        return result.user;
      }

      throw new Error('LOGIN_FAILED');
    } catch (error: any) {
      const errorMessage = error.message || error.data?.message || error.shape?.message || error.code;

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
      await AsyncStorage.removeItem('user');
      setUser(null);
    } catch (error) {
      console.error('[Auth] Logout Fehler:', error);
      setUser(null);
      throw error;
    }
  }, []);

  const switchRole = useCallback(() => {
    if (user) {
      const newUser = {
        ...user,
        role: user.role === 'client' ? 'trainer' : 'client',
      } as User;
      setUser(newUser);
      AsyncStorage.setItem('user', JSON.stringify(newUser));
    }
  }, [user]);

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!user) throw new Error('NOT_AUTHENTICATED');

    try {
      // Call server to update password
      await trpcClient.auth.updatePassword.mutate({
        userId: user.id,
        currentPassword,
        newPassword,
      });

      // Update local state
      const updatedUser = { ...user, passwordChanged: true };
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

      // Update saved password if "remember" is enabled
      const rememberSetting = await AsyncStorage.getItem('rememberPassword');
      if (rememberSetting === 'true') {
        await AsyncStorage.setItem('savedPassword', newPassword);
      }

      console.log('[Auth] Passwort erfolgreich auf dem Server geaendert fuer:', user.email);
    } catch (error: any) {
      const errorMessage = error.message || error.data?.message || '';

      if (errorMessage.includes('INVALID_CURRENT_PASSWORD')) {
        throw new Error('INVALID_CURRENT_PASSWORD');
      }
      if (errorMessage.includes('CONNECTION_FAILED') || errorMessage.includes('fetch')) {
        // Fallback: Update locally only
        console.log('[Auth] Server nicht erreichbar, lokales Update.');
        const updatedUser = { ...user, passwordChanged: true };
        setUser(updatedUser);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        return;
      }
      throw error;
    }
  }, [user]);

  const updateProfile = useCallback(async (updates: { name?: string; phone?: string; avatar?: string }) => {
    if (!user) throw new Error('NOT_AUTHENTICATED');

    try {
      await trpcClient.profile.update.mutate({
        userId: user.id,
        ...updates,
      });
    } catch (error) {
      console.log('[Auth] Server-Profilupdate fehlgeschlagen, lokal gespeichert.');
    }

    // Update local state regardless
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
  }, [user]);

  const resetPassword = useCallback(async (email: string) => {
    console.log('[Auth] Passwort-Reset angefordert fuer:', email);
    // TODO: Implement email-based password reset when email service is available
    return Promise.resolve();
  }, []);

  const clearStorage = useCallback(async () => {
    try {
      await AsyncStorage.clear();
      setUser(null);
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
    switchRole,
    updatePassword,
    updateProfile,
    resetPassword,
    clearStorage,
  }), [user, isLoading, login, logout, switchRole, updatePassword, updateProfile, resetPassword, clearStorage]);

  return authState;
});
