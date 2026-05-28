import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { User } from '@/types/workout';
import { trpcClient } from '@/lib/trpc';

const CLIENTS_CACHE_KEY = 'clients_v2';
const CLIENTS_CACHE_KEY_LEGACY = 'clients';

// users.id ist eine 32-bit-SERIAL. Verwaiste Cache-Einträge aus früheren lokalen
// Fallbacks hatten Date.now()-IDs (> 2^31), die serverseitig nie auflösbar sind.
const PG_INT_MAX = 2147483647;
const isValidClientId = (id: string): boolean => /^\d+$/.test(id) && Number(id) <= PG_INT_MAX;

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
  isOffline: boolean;
  inviteClient: (payload: { name?: string; email?: string }) => Promise<Invitation>;
  addClient: (client: Omit<User, 'id' | 'joinDate' | 'role'> & { id?: string; phone?: string; starterPassword?: string; passwordChanged?: boolean }) => Promise<User>;
  removeClient: (userId: string) => Promise<void>;
  updateClient: (id: string, updates: { name?: string; email?: string; phone?: string }, lookupEmail?: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const [ClientsProvider, useClients] = createContextHook<ClientsState>(() => {
  const [clients, setClients] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  // Einmalige Migration: alten Cache-Key (Pre-Schema-Merge) löschen
  useEffect(() => {
    AsyncStorage.removeItem(CLIENTS_CACHE_KEY_LEGACY).catch(() => {});
  }, []);

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
        setIsOffline(false);

        // Cache locally as backup
        await Promise.all([
          AsyncStorage.setItem(CLIENTS_CACHE_KEY, JSON.stringify(serverClients)),
          AsyncStorage.setItem('invitations', JSON.stringify(serverInvitations))
        ]);
      } catch (serverError) {
        console.error('[Clients] Server load failed, trying local storage:', serverError);
        setIsOffline(true);

        // Fallback to local storage
        const [localClients, localInvitations] = await Promise.all([
          AsyncStorage.getItem(CLIENTS_CACHE_KEY),
          AsyncStorage.getItem('invitations')
        ]);

        // Cache-Hygiene: verwaiste Einträge mit ungültiger (Timestamp-)ID aussortieren
        if (localClients) {
          const parsed: User[] = JSON.parse(localClients);
          setClients(parsed.filter(c => isValidClientId(c.id)));
        }
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
    // Ensure starterPassword is provided
    if (!client.starterPassword) {
      throw new Error('Starter password is required');
    }

    try {
      const newClient = await trpcClient.clients.create.mutate({
        name: client.name,
        email: client.email,
        phone: client.phone,
        starterPassword: client.starterPassword,
      });
      console.log('[Clients] Added client via server', newClient.id);

      // Update local state
      const updatedClients = [newClient, ...clients];
      setClients(updatedClients);
      await AsyncStorage.setItem(CLIENTS_CACHE_KEY, JSON.stringify(updatedClients));

      return newClient;
    } catch (error: any) {
      console.error('[Clients] Server add failed:', error);
      const msg: string = error?.message ?? '';

      // Kunden MÜSSEN serverseitig in der users-Tabelle angelegt werden — sonst
      // entstehen verwaiste Einträge mit ungültiger ID, die später CLIENT_NOT_FOUND
      // auslösen. Daher KEIN lokaler Fallback, sondern klare Fehlermeldung.
      if (msg.includes('CLIENT_EMAIL_EXISTS')) {
        throw new Error('Ein Kunde mit dieser E-Mail-Adresse existiert bereits.');
      }
      if (msg.includes('CLIENT_PHONE_EXISTS')) {
        throw new Error('Ein Kunde mit dieser Telefonnummer existiert bereits.');
      }
      throw new Error('Kunde konnte nicht angelegt werden. Bitte Internetverbindung prüfen und erneut versuchen.');
    }
  }, [clients]);

  const updateClient = useCallback(async (id: string, updates: { name?: string; email?: string; phone?: string }, lookupEmail?: string) => {
    // lookupEmail erlaubt dem Backend, den Kunden bei ungültiger Cache-ID über die
    // E-Mail aufzulösen. Wenn nicht übergeben, aus dem State ableiten.
    const resolvedLookup = lookupEmail ?? clients.find(c => c.id === id)?.email;
    await trpcClient.clients.update.mutate({ id, ...updates, lookupEmail: resolvedLookup });
    const next = clients.map(c => c.id === id ? { ...c, ...updates } : c);
    setClients(next);
    await AsyncStorage.setItem(CLIENTS_CACHE_KEY, JSON.stringify(next));
  }, [clients]);

  const removeClient = useCallback(async (userId: string) => {
    try {
      await trpcClient.clients.delete.mutate({ id: userId });
      console.log('[Clients] Removed client via server', userId);
      
      // Update local state
      const updatedClients = clients.filter(c => c.id !== userId);
      setClients(updatedClients);
      await AsyncStorage.setItem(CLIENTS_CACHE_KEY, JSON.stringify(updatedClients));
    } catch (error) {
      console.error('[Clients] Server delete failed, removing locally', error);
      // Fallback to local removal
      const next = clients.filter(c => c.id !== userId);
      setClients(next);
      await AsyncStorage.setItem(CLIENTS_CACHE_KEY, JSON.stringify(next));
    }
  }, [clients]);

  return useMemo(() => ({
    clients,
    invitations,
    isLoading,
    isOffline,
    inviteClient,
    addClient,
    removeClient,
    updateClient,
    refresh: loadData,
  }), [clients, invitations, isLoading, isOffline, inviteClient, addClient, removeClient, updateClient, loadData]);
});