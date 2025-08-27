import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { User } from '@/types/workout';
import { trpcClient } from '@/lib/trpc';

export interface Invitation {
  code: string;
  email?: string;
  name?: string;
  createdAt: string;
}

interface ClientsState {
  clients: User[];
  invitations: Invitation[];
  isLoading: boolean;
  inviteClient: (payload: { name?: string; email?: string }) => Promise<Invitation>;
  addClient: (client: Omit<User, 'id' | 'joinDate' | 'role'> & { id?: string; phone?: string; starterPassword?: string; passwordChanged?: boolean }) => Promise<User>;
  removeClient: (userId: string) => Promise<void>;
}

export const [ClientsProvider, useClients] = createContextHook<ClientsState>(() => {
  const [clients, setClients] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load data from server and local storage
  const loadData = useCallback(async () => {
    try {
      console.log('[Clients] Loading data...');
      setIsLoading(true);
      
      // Try to load from server first
      try {
        const [serverClients, serverInvitations] = await Promise.all([
          trpcClient.clients.list.query(),
          trpcClient.invitations.list.query()
        ]);
        
        console.log('[Clients] Loaded from server:', { clients: serverClients.length, invitations: serverInvitations.length });
        setClients(serverClients);
        setInvitations(serverInvitations);
        
        // Cache locally as backup
        await Promise.all([
          AsyncStorage.setItem('clients', JSON.stringify(serverClients)),
          AsyncStorage.setItem('invitations', JSON.stringify(serverInvitations))
        ]);
      } catch (serverError) {
        console.error('[Clients] Server load failed, trying local storage:', serverError);
        
        // Fallback to local storage
        const [localClients, localInvitations] = await Promise.all([
          AsyncStorage.getItem('clients'),
          AsyncStorage.getItem('invitations')
        ]);
        
        if (localClients) setClients(JSON.parse(localClients));
        if (localInvitations) setInvitations(JSON.parse(localInvitations));
        
        console.log('[Clients] Loaded from local storage');
      }
    } catch (error) {
      console.error('[Clients] Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const inviteClient = useCallback(async ({ name, email }: { name?: string; email?: string }) => {
    try {
      const invite = await trpcClient.invitations.create.mutate({ name, email });
      console.log('[Clients] Created invite via server', invite.code);
      
      // Update local state
      const updatedInvitations = [invite, ...invitations];
      setInvitations(updatedInvitations);
      await AsyncStorage.setItem('invitations', JSON.stringify(updatedInvitations));
      
      return invite;
    } catch (error) {
      console.error('[Clients] Server invite failed, creating locally', error);
      // Fallback to local creation
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      const invite: Invitation = { code, email, name, createdAt: new Date().toISOString() };
      const nextInvites = [invite, ...invitations];
      setInvitations(nextInvites);
      await AsyncStorage.setItem('invitations', JSON.stringify(nextInvites));
      return invite;
    }
  }, [invitations]);

  const addClient = useCallback(async (client: Omit<User, 'id' | 'joinDate' | 'role'> & { id?: string; phone?: string; starterPassword?: string; passwordChanged?: boolean }) => {
    try {
      // Ensure starterPassword is provided
      if (!client.starterPassword) {
        throw new Error('Starter password is required');
      }
      
      const newClient = await trpcClient.clients.create.mutate({
        name: client.name,
        email: client.email,
        phone: client.phone,
        starterPassword: client.starterPassword,
      });
      console.log('[Clients] Added client via server', newClient.id, 'with password:', newClient.starterPassword);
      
      // Update local state
      const updatedClients = [newClient, ...clients];
      setClients(updatedClients);
      await AsyncStorage.setItem('clients', JSON.stringify(updatedClients));
      
      return newClient;
    } catch (error: any) {
      console.error('[Clients] Server add failed:', error);
      
      if (error.message === 'CLIENT_ALREADY_EXISTS') {
        throw new Error('CLIENT_ALREADY_EXISTS');
      }
      
      // Fallback to local creation only if server is completely unavailable
      console.log('[Clients] Creating client locally as fallback');
      const newClient: User = {
        id: client.id ?? Date.now().toString(),
        name: client.name,
        email: client.email,
        role: 'client',
        avatar: client.avatar,
        joinDate: new Date().toISOString(),
        stats: client.stats || {
          totalWorkouts: 0,
          totalVolume: 0,
          currentStreak: 0,
          longestStreak: 0,
          personalRecords: {},
        },
        phone: client.phone,
        starterPassword: client.starterPassword,
        passwordChanged: client.passwordChanged ?? false,
      };
      const next = [newClient, ...clients];
      setClients(next);
      await AsyncStorage.setItem('clients', JSON.stringify(next));
      return newClient;
    }
  }, [clients]);

  const removeClient = useCallback(async (userId: string) => {
    try {
      await trpcClient.clients.delete.mutate({ id: userId });
      console.log('[Clients] Removed client via server', userId);
      
      // Update local state
      const updatedClients = clients.filter(c => c.id !== userId);
      setClients(updatedClients);
      await AsyncStorage.setItem('clients', JSON.stringify(updatedClients));
    } catch (error) {
      console.error('[Clients] Server delete failed, removing locally', error);
      // Fallback to local removal
      const next = clients.filter(c => c.id !== userId);
      setClients(next);
      await AsyncStorage.setItem('clients', JSON.stringify(next));
    }
  }, [clients]);

  return useMemo(() => ({
    clients,
    invitations,
    isLoading,
    inviteClient,
    addClient,
    removeClient,
  }), [clients, invitations, isLoading, inviteClient, addClient, removeClient]);
});