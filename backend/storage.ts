// Shared in-memory storage for demo purposes
// In production, replace with a real database like PostgreSQL, MongoDB, etc.

export interface StoredClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'client';
  joinDate: string;
  starterPassword?: string;
  passwordChanged: boolean;
  stats: {
    totalWorkouts: number;
    totalVolume: number;
    currentStreak: number;
    longestStreak: number;
    personalRecords: Record<string, number>;
  };
}

export interface StoredInvitation {
  code: string;
  name?: string;
  email?: string;
  createdAt: string;
}

// In-memory storage - this will reset when server restarts
// In production, use a persistent database
let clients: StoredClient[] = [];
let invitations: StoredInvitation[] = [];
let nextClientId = 1;

// Add some logging to track storage operations
console.log('[Storage] Initializing in-memory storage');

// Debug function to log current storage state
const logStorageState = () => {
  console.log('[Storage] Current state:', {
    clientsCount: clients.length,
    clients: clients.map(c => ({ id: c.id, email: c.email, hasPassword: !!c.starterPassword })),
    invitationsCount: invitations.length,
    nextClientId
  });
};

export const storage = {
  clients: {
    getAll: (): StoredClient[] => {
      console.log('[Storage] Getting all clients, count:', clients.length);
      return clients;
    },
    create: (client: Omit<StoredClient, 'id'>): StoredClient => {
      const newClient: StoredClient = {
        ...client,
        id: nextClientId.toString(),
      };
      clients.push(newClient);
      nextClientId++;
      console.log('[Storage] Created client:', newClient.id, 'email:', newClient.email, 'password:', newClient.starterPassword);
      console.log('[Storage] Total clients now:', clients.length);
      return newClient;
    },
    delete: (id: string): boolean => {
      const initialLength = clients.length;
      clients = clients.filter(client => client.id !== id);
      console.log('[Storage] Deleted client:', id, 'success:', clients.length < initialLength);
      return clients.length < initialLength;
    },
  },
  invitations: {
    getAll: (): StoredInvitation[] => {
      console.log('[Storage] Getting all invitations, count:', invitations.length);
      return invitations;
    },
    create: (invitation: StoredInvitation): StoredInvitation => {
      invitations.push(invitation);
      console.log('[Storage] Created invitation:', invitation.code);
      return invitation;
    },
    remove: (code: string): boolean => {
      const initialLength = invitations.length;
      invitations = invitations.filter(inv => inv.code !== code);
      console.log('[Storage] Removed invitation:', code, 'success:', invitations.length < initialLength);
      return invitations.length < initialLength;
    },
  },
};

// Export the debug function for potential use
export { logStorageState };