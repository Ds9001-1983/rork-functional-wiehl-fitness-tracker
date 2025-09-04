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
  updatePassword: (newPassword: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearStorage: () => Promise<void>;
}

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      console.log('🔄 Loading user from AsyncStorage...');
      const storedUser = await AsyncStorage.getItem('user');
      console.log('📱 Stored user data:', storedUser);
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        console.log('👤 Parsed user:', parsedUser);
        setUser(parsedUser);
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
      console.log('🔄 Attempting login with backend for:', email, 'with password:', password);
      const result = await trpcClient.auth.login.mutate({ email, password });
      
      if (result.success && result.user) {
        console.log('✅ Backend login successful for:', email);
        console.log('✅ User data:', result.user);
        await AsyncStorage.setItem('user', JSON.stringify(result.user));
        setUser(result.user);
        return result.user;
      }
      
      throw new Error('LOGIN_FAILED');
    } catch (error: any) {
      console.log('🚨 Backend login error:', error);
      console.log('🚨 Error message:', error.message);
      console.log('🚨 Full error object:', error);
      
      // Check for tRPC error format
      const errorMessage = error.message || error.data?.message || error.code;
      console.log('🚨 Extracted error message:', errorMessage);
      
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
      await AsyncStorage.removeItem('user');
      console.log('✅ Logout: Benutzerdaten erfolgreich entfernt');
      setUser(null);
      console.log('✅ Logout: User State zurückgesetzt');
    } catch (error) {
      console.error('❌ Logout Fehler:', error);
      // Auch bei Fehlern den User State zurücksetzen
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

  const updatePassword = useCallback(async (newPassword: string) => {
    if (user) {
      const updatedUser = {
        ...user,
        passwordChanged: true,
      };
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      console.log('🔑 Passwort erfolgreich geändert für:', user.email);

      const rememberSetting = await AsyncStorage.getItem('rememberPassword');
      if (rememberSetting === 'true') {
        await AsyncStorage.setItem('savedPassword', newPassword);
      }
    }
  }, [user]);

  const resetPassword = useCallback(async (email: string) => {
    console.log('🔄 Passwort-Reset angefordert für:', email);
    return Promise.resolve();
  }, []);

  const clearStorage = useCallback(async () => {
    try {
      console.log('🗑️ Clearing all AsyncStorage data...');
      await AsyncStorage.clear();
      setUser(null);
      console.log('✅ AsyncStorage cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing AsyncStorage:', error);
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
    resetPassword,
    clearStorage,
  }), [user, isLoading, login, logout, switchRole, updatePassword, resetPassword, clearStorage]);

  return authState;
});