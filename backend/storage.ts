// Database storage with PostgreSQL
// Falls back to in-memory storage if database is not available

import { Pool } from 'pg';

export interface StoredClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'client' | 'trainer';
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

// Database connection
let pool: Pool | null = null;
let useDatabase = false;

// In-memory fallback storage
let clients: StoredClient[] = [
  // Default trainer account for in-memory fallback
  {
    id: 'trainer-1',
    name: 'Functional Wiehl Trainer',
    email: 'app@functional-wiehl.de',
    role: 'trainer',
    joinDate: new Date().toISOString(),
    starterPassword: 'Ds9001Ds9001',
    passwordChanged: true,
    stats: {
      totalWorkouts: 0,
      totalVolume: 0,
      currentStreak: 0,
      longestStreak: 0,
      personalRecords: {},
    },
  },
];
let invitations: StoredInvitation[] = [];
let nextClientId = 2; // Start at 2 since trainer is ID 1

// Initialize database connection
if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    // Test connection
    pool.connect().then(client => {
      console.log('[Storage] ✅ PostgreSQL connected successfully');
      client.release();
      useDatabase = true;
      initializeTables();
    }).catch(err => {
      console.log('[Storage] ❌ PostgreSQL connection failed:', err.message);
      console.log('[Storage] 📝 Falling back to in-memory storage');
      useDatabase = false;
    });
  } catch (err) {
    console.log('[Storage] ❌ PostgreSQL setup failed:', err);
    console.log('[Storage] 📝 Using in-memory storage');
    useDatabase = false;
  }
} else {
  console.log('[Storage] 📝 No DATABASE_URL provided, using in-memory storage');
}

// Initialize database tables
async function initializeTables() {
  if (!pool) return;
  
  try {
    // Create users table (matches the schema from setup-trainer.js)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'client',
        password_changed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create clients table for additional client data
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_workouts INTEGER DEFAULT 0,
        total_volume INTEGER DEFAULT 0,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        personal_records JSONB DEFAULT '{}'
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invitations (
        code VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('[Storage] ✅ Database tables initialized');
  } catch (err) {
    console.log('[Storage] ❌ Failed to initialize tables:', err);
    useDatabase = false;
  }
}

console.log('[Storage] Initializing storage system...');

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
    getAll: async (): Promise<StoredClient[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(`
            SELECT 
              id::text,
              name,
              email,
              phone,
              role,
              join_date as "joinDate",
              starter_password as "starterPassword",
              password_changed as "passwordChanged",
              total_workouts as "totalWorkouts",
              total_volume as "totalVolume",
              current_streak as "currentStreak",
              longest_streak as "longestStreak",
              personal_records as "personalRecords"
            FROM clients
          `);
          
          const dbClients = result.rows.map(row => ({
            ...row,
            stats: {
              totalWorkouts: row.totalWorkouts || 0,
              totalVolume: row.totalVolume || 0,
              currentStreak: row.currentStreak || 0,
              longestStreak: row.longestStreak || 0,
              personalRecords: row.personalRecords || {}
            }
          }));
          
          console.log('[Storage] Getting all clients from DB, count:', dbClients.length);
          return dbClients;
        } catch (err) {
          console.log('[Storage] ❌ DB query failed, using memory:', err);
          useDatabase = false;
        }
      }
      
      console.log('[Storage] Getting all clients from memory, count:', clients.length);
      return clients;
    },
    
    create: async (client: Omit<StoredClient, 'id'>): Promise<StoredClient> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(`
            INSERT INTO clients (
              name, email, phone, role, join_date, starter_password, password_changed,
              total_workouts, total_volume, current_streak, longest_streak, personal_records
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id::text, name, email, phone, role, join_date as "joinDate", 
                     starter_password as "starterPassword", password_changed as "passwordChanged"
          `, [
            client.name,
            client.email,
            client.phone,
            client.role,
            client.joinDate,
            client.starterPassword,
            client.passwordChanged,
            client.stats.totalWorkouts,
            client.stats.totalVolume,
            client.stats.currentStreak,
            client.stats.longestStreak,
            JSON.stringify(client.stats.personalRecords)
          ]);
          
          const newClient: StoredClient = {
            ...result.rows[0],
            stats: client.stats
          };
          
          console.log('[Storage] Created client in DB:', newClient.id, 'email:', newClient.email);
          return newClient;
        } catch (err) {
          console.log('[Storage] ❌ DB insert failed, using memory:', err);
          useDatabase = false;
        }
      }
      
      // Fallback to memory
      const newClient: StoredClient = {
        ...client,
        id: nextClientId.toString(),
      };
      clients.push(newClient);
      nextClientId++;
      console.log('[Storage] Created client in memory:', newClient.id, 'email:', newClient.email);
      return newClient;
    },
    
    delete: async (id: string): Promise<boolean> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query('DELETE FROM clients WHERE id = $1', [id]);
          const success = (result.rowCount ?? 0) > 0;
          console.log('[Storage] Deleted client from DB:', id, 'success:', success);
          return success;
        } catch (err) {
          console.log('[Storage] ❌ DB delete failed, using memory:', err);
          useDatabase = false;
        }
      }
      
      // Fallback to memory
      const initialLength = clients.length;
      clients = clients.filter(client => client.id !== id);
      const success = clients.length < initialLength;
      console.log('[Storage] Deleted client from memory:', id, 'success:', success);
      return success;
    },
  },
  
  invitations: {
    getAll: async (): Promise<StoredInvitation[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(`
            SELECT code, name, email, created_at as "createdAt"
            FROM invitations
          `);
          console.log('[Storage] Getting all invitations from DB, count:', result.rows.length);
          return result.rows;
        } catch (err) {
          console.log('[Storage] ❌ DB query failed, using memory:', err);
          useDatabase = false;
        }
      }
      
      console.log('[Storage] Getting all invitations from memory, count:', invitations.length);
      return invitations;
    },
    
    create: async (invitation: StoredInvitation): Promise<StoredInvitation> => {
      if (useDatabase && pool) {
        try {
          await pool.query(`
            INSERT INTO invitations (code, name, email, created_at)
            VALUES ($1, $2, $3, $4)
          `, [invitation.code, invitation.name, invitation.email, invitation.createdAt]);
          
          console.log('[Storage] Created invitation in DB:', invitation.code);
          return invitation;
        } catch (err) {
          console.log('[Storage] ❌ DB insert failed, using memory:', err);
          useDatabase = false;
        }
      }
      
      // Fallback to memory
      invitations.push(invitation);
      console.log('[Storage] Created invitation in memory:', invitation.code);
      return invitation;
    },
    
    remove: async (code: string): Promise<boolean> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query('DELETE FROM invitations WHERE code = $1', [code]);
          const success = (result.rowCount ?? 0) > 0;
          console.log('[Storage] Removed invitation from DB:', code, 'success:', success);
          return success;
        } catch (err) {
          console.log('[Storage] ❌ DB delete failed, using memory:', err);
          useDatabase = false;
        }
      }
      
      // Fallback to memory
      const initialLength = invitations.length;
      invitations = invitations.filter(inv => inv.code !== code);
      const success = invitations.length < initialLength;
      console.log('[Storage] Removed invitation from memory:', code, 'success:', success);
      return success;
    },
  },
};

// Export the debug function for potential use
export { logStorageState };