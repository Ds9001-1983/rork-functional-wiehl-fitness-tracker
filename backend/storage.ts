// Database storage with PostgreSQL
// Falls back to in-memory storage if database is not available

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

export interface StoredUser {
  id: string;
  email: string;
  password: string;
  role: 'client' | 'trainer' | 'admin' | 'superadmin';
  passwordChanged: boolean;
  createdAt: string;
  studioId?: string;
}

export interface StoredClient {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone?: string;
  role: 'client' | 'trainer';
  joinDate: string;
  starterPassword?: string;
  passwordChanged: boolean;
  avatar?: string;
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

export interface StoredWorkout {
  id: string;
  userId: string;
  name: string;
  date: string;
  duration?: number;
  exercises: any[];
  completed: boolean;
  createdBy?: string;
  studioId?: string;
}

export interface StoredWorkoutPlan {
  id: string;
  name: string;
  description?: string;
  exercises: any[];
  createdBy: string;
  assignedTo: string[];
  schedule?: any[];
  studioId?: string;
}

export interface StoredStudio {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  ownerEmail: string | null;
  maxUsers: number;
  createdAt: string;
}

// Database connection
let pool: Pool | null = null;
let useDatabase = false;

// In-memory fallback storage
let users: StoredUser[] = [
  {
    id: 'admin-1',
    email: 'admin@functional-wiehl.de',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    passwordChanged: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'trainer-1',
    email: 'trainer@functional-wiehl.de',
    password: bcrypt.hashSync('trainer123', 10),
    role: 'trainer',
    passwordChanged: true,
    createdAt: new Date().toISOString(),
  },
];

let clients: StoredClient[] = [
  {
    id: 'client-trainer-1',
    userId: 'trainer-1',
    name: 'Functional Wiehl Trainer',
    email: 'app@functional-wiehl.de',
    role: 'trainer',
    joinDate: new Date().toISOString(),
    starterPassword: 'trainer123',
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
let workouts: StoredWorkout[] = [];
let workoutPlans: StoredWorkoutPlan[] = [];
let passwordResetTokens: { token: string; userId: string; expiresAt: string; used: boolean }[] = [];
let bodyMeasurements: { id: string; userId: string; date: string; measurements: Record<string, number> }[] = [];
let gamificationData: { userId: string; xp: number; level: number; badges: any[]; currentStreak: number; longestStreak: number; streakFreezes: number; streakFreezesUsed: string[]; lastActiveDate: string; coachingTone: string }[] = [];
let routinesData: { id: string; userId: string; name: string; exercises: any[]; timesUsed: number; lastUsed: string | null; createdAt: string }[] = [];
let challengesData: { id: string; name: string; description: string; type: string; target: number; startDate: string; endDate: string; createdBy: string }[] = [];
let challengeProgressData: { challengeId: string; userId: string; currentValue: number; updatedAt: string }[] = [];
let notificationsData: { id: string; userId: string; title: string; body: string; type: string; read: boolean; data: any; createdAt: string }[] = [];
let studiosData: StoredStudio[] = [
  { id: '1', name: 'Functional Wiehl', slug: 'functional-wiehl', logoUrl: null, primaryColor: '#000000', accentColor: '#FF6B35', ownerEmail: 'admin@functional-wiehl.de', maxUsers: 50, createdAt: new Date().toISOString() },
];
let studioMembersData: { studioId: string; userId: string; role: string; joinedAt: string }[] = [];
let nextId = 100;

const generateId = () => {
  nextId++;
  return nextId.toString();
};

// Initialize database connection
if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    pool.connect().then(client => {
      console.log('[Storage] PostgreSQL connected successfully');
      client.release();
      useDatabase = true;
      initializeTables();
    }).catch(err => {
      console.log('[Storage] PostgreSQL connection failed:', err.message);
      console.log('[Storage] Falling back to in-memory storage');
      useDatabase = false;
    });
  } catch (err) {
    console.log('[Storage] PostgreSQL setup failed:', err);
    console.log('[Storage] Using in-memory storage');
    useDatabase = false;
  }
} else {
  console.log('[Storage] No DATABASE_URL provided, using in-memory storage');
}

// Initialize database tables
async function initializeTables() {
  if (!pool) return;

  try {
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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        role VARCHAR(20) DEFAULT 'client',
        join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        starter_password VARCHAR(255),
        avatar TEXT,
        total_workouts INTEGER DEFAULT 0,
        total_volume REAL DEFAULT 0,
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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS workouts (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        date TIMESTAMP NOT NULL,
        duration INTEGER DEFAULT 0,
        exercises JSONB DEFAULT '[]',
        completed BOOLEAN DEFAULT FALSE,
        created_by VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS workout_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        exercises JSONB DEFAULT '[]',
        created_by VARCHAR(50) NOT NULL,
        assigned_to JSONB DEFAULT '[]',
        schedule JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        token VARCHAR(255) PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS body_measurements (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        date TIMESTAMP NOT NULL,
        measurements JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS gamification (
        user_id VARCHAR(50) PRIMARY KEY,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        badges JSONB DEFAULT '[]',
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        streak_freezes INTEGER DEFAULT 2,
        streak_freezes_used JSONB DEFAULT '[]',
        last_active_date VARCHAR(20) DEFAULT '',
        coaching_tone VARCHAR(20) DEFAULT 'motivator',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS routines (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        exercises JSONB DEFAULT '[]',
        times_used INTEGER DEFAULT 0,
        last_used TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS challenges (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        target INTEGER NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        created_by VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS challenge_progress (
        challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
        user_id VARCHAR(50) NOT NULL,
        current_value INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (challenge_id, user_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        data JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Studios table (multi-tenant)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS studios (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        logo_url TEXT,
        primary_color VARCHAR(7) DEFAULT '#000000',
        accent_color VARCHAR(7) DEFAULT '#FF6B35',
        owner_email VARCHAR(255),
        max_users INTEGER DEFAULT 50,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS studio_members (
        studio_id INTEGER REFERENCES studios(id) ON DELETE CASCADE,
        user_id INTEGER,
        role VARCHAR(20) DEFAULT 'client',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (studio_id, user_id)
      )
    `);

    // Add columns if they don't exist (for migrations from old schema)
    const addColumnIfNotExists = async (table: string, column: string, type: string) => {
      try {
        await pool!.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type}`);
      } catch (_) { /* column might already exist */ }
    };

    await addColumnIfNotExists('clients', 'email', 'VARCHAR(255)');
    await addColumnIfNotExists('clients', 'role', "VARCHAR(20) DEFAULT 'client'");
    await addColumnIfNotExists('clients', 'starter_password', 'VARCHAR(255)');
    await addColumnIfNotExists('clients', 'avatar', 'TEXT');

    // Performance indexes
    const createIndexIfNotExists = async (name: string, sql: string) => {
      try {
        await pool!.query(`CREATE INDEX IF NOT EXISTS ${name} ON ${sql}`);
      } catch (_) { /* index might already exist */ }
    };

    await createIndexIfNotExists('idx_users_email', 'users (email)');
    await createIndexIfNotExists('idx_users_studio_id', 'users (studio_id)');
    await createIndexIfNotExists('idx_workouts_user_id', 'workouts (user_id)');
    await createIndexIfNotExists('idx_workouts_date', 'workouts (date)');
    await createIndexIfNotExists('idx_workouts_studio_id', 'workouts (studio_id)');
    await createIndexIfNotExists('idx_notifications_user_id', 'notifications (user_id)');
    await createIndexIfNotExists('idx_notifications_read', 'notifications (user_id, read)');
    await createIndexIfNotExists('idx_body_measurements_user_id', 'body_measurements (user_id)');
    await createIndexIfNotExists('idx_routines_user_id', 'routines (user_id)');
    await createIndexIfNotExists('idx_challenges_studio_id', 'challenges (studio_id)');
    await createIndexIfNotExists('idx_studio_members_studio_id', 'studio_members (studio_id)');
    await createIndexIfNotExists('idx_clients_user_id', 'clients (user_id)');

    // Multi-tenant: Add studio_id to all data tables
    const tenantTables = ['users', 'clients', 'workouts', 'workout_plans', 'body_measurements',
      'gamification', 'routines', 'challenges', 'notifications', 'invitations', 'password_reset_tokens'];
    for (const table of tenantTables) {
      await addColumnIfNotExists(table, 'studio_id', 'INTEGER DEFAULT 1');
    }

    // Seed default studio and users
    await seedDefaultStudio();
    await seedDefaultUsers();

    console.log('[Storage] Database tables initialized');
  } catch (err) {
    console.log('[Storage] Failed to initialize tables:', err);
    useDatabase = false;
  }
}

async function seedDefaultStudio() {
  if (!pool) return;
  try {
    const existing = await pool.query('SELECT id FROM studios WHERE slug = $1', ['functional-wiehl']);
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO studios (id, name, slug, logo_url, primary_color, accent_color, owner_email, max_users)
         VALUES (1, 'Functional Wiehl', 'functional-wiehl', NULL, '#000000', '#FF6B35', 'admin@functional-wiehl.de', 50)`,
      );
      // Reset sequence to avoid conflicts
      await pool.query(`SELECT setval('studios_id_seq', (SELECT COALESCE(MAX(id), 1) FROM studios))`);
      console.log('[Storage] Created default studio: Functional Wiehl');
    }
    // Ensure all existing users without studio_id get assigned to studio 1
    await pool.query(`UPDATE users SET studio_id = 1 WHERE studio_id IS NULL`);
    // Add existing users as studio members
    await pool.query(
      `INSERT INTO studio_members (studio_id, user_id, role)
       SELECT 1, id, role FROM users WHERE id NOT IN (SELECT user_id FROM studio_members WHERE studio_id = 1)
       ON CONFLICT DO NOTHING`
    );
  } catch (err) {
    console.log('[Storage] Could not seed default studio:', err);
  }
}

async function seedDefaultUsers() {
  if (!pool) return;

  const defaultUsers = [
    { email: 'admin@functional-wiehl.de', password: 'admin123', role: 'admin' },
    { email: 'trainer@functional-wiehl.de', password: 'trainer123', role: 'trainer' },
  ];

  for (const user of defaultUsers) {
    try {
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [user.email]);
      if (existing.rows.length === 0) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await pool.query(
          `INSERT INTO users (email, password, role, password_changed) VALUES ($1, $2, $3, true)`,
          [user.email, hashedPassword, user.role]
        );
        console.log(`[Storage] Created default ${user.role}: ${user.email}`);
      }
    } catch (err) {
      console.log(`[Storage] Could not seed ${user.email}:`, err);
    }
  }
}

console.log('[Storage] Initializing storage system...');

export function getDatabaseStatus(): { connected: boolean } {
  return { connected: useDatabase && pool !== null };
}

export const storage = {
  users: {
    findByEmail: async (email: string): Promise<StoredUser | null> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
          if (result.rows.length === 0) return null;
          const row = result.rows[0];
          return {
            id: row.id.toString(),
            email: row.email,
            password: row.password,
            role: row.role,
            passwordChanged: row.password_changed,
            createdAt: row.created_at,
            studioId: row.studio_id?.toString() || '1',
          };
        } catch (err) {
          console.log('[Storage] DB query failed for findByEmail:', err);
        }
      }
      const found = users.find(u => u.email === email);
      if (found) return { ...found, studioId: found.studioId || '1' };
      return null;
    },

    create: async (user: { email: string; password: string; role: string; studioId?: string }): Promise<StoredUser> => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const studioId = user.studioId || '1';

      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `INSERT INTO users (email, password, role, password_changed, studio_id)
             VALUES ($1, $2, $3, FALSE, $4)
             RETURNING id, email, password, role, password_changed as "passwordChanged", created_at as "createdAt", studio_id`,
            [user.email, hashedPassword, user.role, studioId]
          );
          const row = result.rows[0];
          return {
            id: row.id.toString(),
            email: row.email,
            password: row.password,
            role: row.role,
            passwordChanged: row.passwordChanged,
            createdAt: row.createdAt,
            studioId: row.studio_id?.toString() || studioId,
          };
        } catch (err) {
          console.log('[Storage] DB insert failed for user:', err);
        }
      }

      const newUser: StoredUser = {
        id: generateId(),
        email: user.email,
        password: hashedPassword,
        role: user.role as 'client' | 'trainer',
        passwordChanged: false,
        createdAt: new Date().toISOString(),
        studioId,
      };
      users.push(newUser);
      return newUser;
    },

    updatePassword: async (userId: string, newPassword: string): Promise<boolean> => {
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `UPDATE users SET password = $1, password_changed = TRUE, updated_at = NOW() WHERE id = $2`,
            [hashedPassword, userId]
          );
          return (result.rowCount ?? 0) > 0;
        } catch (err) {
          console.log('[Storage] DB update failed for password:', err);
        }
      }

      const user = users.find(u => u.id === userId);
      if (user) {
        user.password = hashedPassword;
        user.passwordChanged = true;
        return true;
      }
      return false;
    },

    verifyPassword: async (plainPassword: string, hashedPassword: string): Promise<boolean> => {
      return bcrypt.compare(plainPassword, hashedPassword);
    },
  },

  clients: {
    getAll: async (studioId?: string): Promise<StoredClient[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(`
            SELECT
              u.id as user_id,
              c.id as client_id,
              c.name,
              u.email,
              c.phone,
              u.role,
              c.join_date as "joinDate",
              c.starter_password as "starterPassword",
              u.password_changed as "passwordChanged",
              c.avatar,
              c.total_workouts as "totalWorkouts",
              c.total_volume as "totalVolume",
              c.current_streak as "currentStreak",
              c.longest_streak as "longestStreak",
              c.personal_records as "personalRecords"
            FROM users u
            LEFT JOIN clients c ON u.id = c.user_id
            ${studioId ? 'WHERE u.studio_id = $1' : ''}
            ORDER BY u.created_at DESC
          `, studioId ? [studioId] : []);

          return result.rows.map(row => ({
            id: row.user_id?.toString() || row.client_id?.toString(),
            userId: row.user_id?.toString(),
            name: row.name || row.email?.split('@')[0] || 'Unbekannt',
            email: row.email,
            phone: row.phone,
            role: row.role || 'client',
            joinDate: row.joinDate || new Date().toISOString(),
            starterPassword: row.starterPassword,
            passwordChanged: row.passwordChanged || false,
            avatar: row.avatar,
            stats: {
              totalWorkouts: row.totalWorkouts || 0,
              totalVolume: row.totalVolume || 0,
              currentStreak: row.currentStreak || 0,
              longestStreak: row.longestStreak || 0,
              personalRecords: row.personalRecords || {},
            },
          }));
        } catch (err) {
          console.log('[Storage] DB query failed for getAll clients:', err);
        }
      }

      if (studioId) {
        return clients.filter(c => !c.userId || users.find(u => u.id === c.userId)?.studioId === studioId);
      }
      return clients;
    },

    create: async (client: Omit<StoredClient, 'id'>): Promise<StoredClient> => {
      if (useDatabase && pool) {
        try {
          const hashedPassword = await bcrypt.hash(client.starterPassword || 'TEMP123', 10);
          const userResult = await pool.query(
            `INSERT INTO users (email, password, role, password_changed)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [client.email, hashedPassword, client.role, client.passwordChanged]
          );
          const userId = userResult.rows[0].id;

          await pool.query(
            `INSERT INTO clients (user_id, name, email, phone, role, join_date, starter_password, total_workouts, total_volume, current_streak, longest_streak, personal_records)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [userId, client.name, client.email, client.phone, client.role, client.joinDate,
             client.starterPassword, client.stats.totalWorkouts, client.stats.totalVolume,
             client.stats.currentStreak, client.stats.longestStreak, JSON.stringify(client.stats.personalRecords)]
          );

          const newClient: StoredClient = {
            ...client,
            id: userId.toString(),
            userId: userId.toString(),
          };
          console.log('[Storage] Created client in DB with user_id:', userId);
          return newClient;
        } catch (err: any) {
          console.log('[Storage] DB insert failed for client:', err.message);
          if (err.message?.includes('duplicate key') || err.code === '23505') {
            throw new Error('CLIENT_EMAIL_EXISTS');
          }
        }
      }

      // Fallback to memory
      const id = generateId();
      const newClient: StoredClient = { ...client, id };
      clients.push(newClient);

      // Also create in-memory user for auth
      const hashedPassword = await bcrypt.hash(client.starterPassword || 'TEMP123', 10);
      users.push({
        id,
        email: client.email,
        password: hashedPassword,
        role: client.role,
        passwordChanged: client.passwordChanged,
        createdAt: new Date().toISOString(),
      });

      return newClient;
    },

    delete: async (id: string): Promise<boolean> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
          return (result.rowCount ?? 0) > 0;
        } catch (err) {
          console.log('[Storage] DB delete failed:', err);
        }
      }

      const initialLength = clients.length;
      clients = clients.filter(client => client.id !== id);
      users = users.filter(user => user.id !== id);
      return clients.length < initialLength;
    },

    updateStats: async (userId: string, stats: Partial<StoredClient['stats']>): Promise<boolean> => {
      if (useDatabase && pool) {
        try {
          const updates: string[] = [];
          const values: any[] = [];
          let idx = 1;

          if (stats.totalWorkouts !== undefined) { updates.push(`total_workouts = $${idx++}`); values.push(stats.totalWorkouts); }
          if (stats.totalVolume !== undefined) { updates.push(`total_volume = $${idx++}`); values.push(stats.totalVolume); }
          if (stats.currentStreak !== undefined) { updates.push(`current_streak = $${idx++}`); values.push(stats.currentStreak); }
          if (stats.longestStreak !== undefined) { updates.push(`longest_streak = $${idx++}`); values.push(stats.longestStreak); }
          if (stats.personalRecords !== undefined) { updates.push(`personal_records = $${idx++}`); values.push(JSON.stringify(stats.personalRecords)); }

          if (updates.length === 0) return false;

          values.push(userId);
          const result = await pool.query(
            `UPDATE clients SET ${updates.join(', ')} WHERE user_id = $${idx}`,
            values
          );
          return (result.rowCount ?? 0) > 0;
        } catch (err) {
          console.log('[Storage] DB update stats failed:', err);
        }
      }

      const client = clients.find(c => c.id === userId || c.userId === userId);
      if (client) {
        client.stats = { ...client.stats, ...stats };
        return true;
      }
      return false;
    },

    updateProfile: async (userId: string, updates: { name?: string; phone?: string; avatar?: string }): Promise<boolean> => {
      if (useDatabase && pool) {
        try {
          const setClauses: string[] = [];
          const values: any[] = [];
          let idx = 1;

          if (updates.name !== undefined) { setClauses.push(`name = $${idx++}`); values.push(updates.name); }
          if (updates.phone !== undefined) { setClauses.push(`phone = $${idx++}`); values.push(updates.phone); }
          if (updates.avatar !== undefined) { setClauses.push(`avatar = $${idx++}`); values.push(updates.avatar); }

          if (setClauses.length === 0) return false;

          values.push(userId);
          const result = await pool.query(
            `UPDATE clients SET ${setClauses.join(', ')} WHERE user_id = $${idx}`,
            values
          );
          return (result.rowCount ?? 0) > 0;
        } catch (err) {
          console.log('[Storage] DB update profile failed:', err);
        }
      }

      const client = clients.find(c => c.id === userId || c.userId === userId);
      if (client) {
        if (updates.name) client.name = updates.name;
        if (updates.phone) client.phone = updates.phone;
        if (updates.avatar) client.avatar = updates.avatar;
        return true;
      }
      return false;
    },
  },

  invitations: {
    getAll: async (studioId?: string): Promise<StoredInvitation[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            studioId
              ? `SELECT code, name, email, created_at as "createdAt" FROM invitations WHERE studio_id = $1`
              : `SELECT code, name, email, created_at as "createdAt" FROM invitations`,
            studioId ? [studioId] : []
          );
          return result.rows;
        } catch (err) {
          console.log('[Storage] DB query failed for invitations:', err);
        }
      }
      return invitations;
    },

    create: async (invitation: StoredInvitation): Promise<StoredInvitation> => {
      if (useDatabase && pool) {
        try {
          await pool.query(
            `INSERT INTO invitations (code, name, email, created_at) VALUES ($1, $2, $3, $4)`,
            [invitation.code, invitation.name, invitation.email, invitation.createdAt]
          );
          return invitation;
        } catch (err) {
          console.log('[Storage] DB insert failed for invitation:', err);
        }
      }
      invitations.push(invitation);
      return invitation;
    },

    remove: async (code: string): Promise<boolean> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query('DELETE FROM invitations WHERE code = $1', [code]);
          return (result.rowCount ?? 0) > 0;
        } catch (err) {
          console.log('[Storage] DB delete failed for invitation:', err);
        }
      }
      const initialLength = invitations.length;
      invitations = invitations.filter(inv => inv.code !== code);
      return invitations.length < initialLength;
    },
  },

  workouts: {
    getByUserId: async (userId: string): Promise<StoredWorkout[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT id::text, user_id as "userId", name, date, duration, exercises, completed, created_by as "createdBy"
             FROM workouts WHERE user_id = $1 ORDER BY date DESC`,
            [userId]
          );
          return result.rows;
        } catch (err) {
          console.log('[Storage] DB query failed for workouts:', err);
        }
      }
      return workouts.filter(w => w.userId === userId);
    },

    getAll: async (studioId?: string): Promise<StoredWorkout[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            studioId
              ? `SELECT id::text, user_id as "userId", name, date, duration, exercises, completed, created_by as "createdBy"
                 FROM workouts WHERE studio_id = $1 ORDER BY date DESC`
              : `SELECT id::text, user_id as "userId", name, date, duration, exercises, completed, created_by as "createdBy"
                 FROM workouts ORDER BY date DESC`,
            studioId ? [studioId] : []
          );
          return result.rows;
        } catch (err) {
          console.log('[Storage] DB query failed for all workouts:', err);
        }
      }
      return workouts;
    },

    create: async (workout: Omit<StoredWorkout, 'id'>): Promise<StoredWorkout> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `INSERT INTO workouts (user_id, name, date, duration, exercises, completed, created_by, studio_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id::text, user_id as "userId", name, date, duration, exercises, completed, created_by as "createdBy"`,
            [workout.userId, workout.name, workout.date, workout.duration || 0,
             JSON.stringify(workout.exercises), workout.completed, workout.createdBy, workout.studioId || 1]
          );
          return result.rows[0];
        } catch (err) {
          console.log('[Storage] DB insert failed for workout:', err);
        }
      }

      const newWorkout: StoredWorkout = { ...workout, id: generateId() };
      workouts.push(newWorkout);
      return newWorkout;
    },

    update: async (id: string, updates: Partial<StoredWorkout>): Promise<StoredWorkout | null> => {
      if (useDatabase && pool) {
        try {
          const setClauses: string[] = [];
          const values: any[] = [];
          let idx = 1;

          if (updates.name !== undefined) { setClauses.push(`name = $${idx++}`); values.push(updates.name); }
          if (updates.duration !== undefined) { setClauses.push(`duration = $${idx++}`); values.push(updates.duration); }
          if (updates.exercises !== undefined) { setClauses.push(`exercises = $${idx++}`); values.push(JSON.stringify(updates.exercises)); }
          if (updates.completed !== undefined) { setClauses.push(`completed = $${idx++}`); values.push(updates.completed); }

          if (setClauses.length === 0) return null;

          values.push(id);
          const result = await pool.query(
            `UPDATE workouts SET ${setClauses.join(', ')} WHERE id = $${idx}
             RETURNING id::text, user_id as "userId", name, date, duration, exercises, completed, created_by as "createdBy"`,
            values
          );
          return result.rows[0] || null;
        } catch (err) {
          console.log('[Storage] DB update failed for workout:', err);
        }
      }

      const index = workouts.findIndex(w => w.id === id);
      if (index === -1) return null;
      workouts[index] = { ...workouts[index], ...updates };
      return workouts[index];
    },

    delete: async (id: string): Promise<boolean> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query('DELETE FROM workouts WHERE id = $1', [id]);
          return (result.rowCount ?? 0) > 0;
        } catch (err) {
          console.log('[Storage] DB delete failed for workout:', err);
        }
      }
      const initialLength = workouts.length;
      workouts = workouts.filter(w => w.id !== id);
      return workouts.length < initialLength;
    },
  },

  workoutPlans: {
    getAll: async (studioId?: string): Promise<StoredWorkoutPlan[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            studioId
              ? `SELECT id::text, name, description, exercises, created_by as "createdBy", assigned_to as "assignedTo", schedule
                 FROM workout_plans WHERE studio_id = $1 ORDER BY created_at DESC`
              : `SELECT id::text, name, description, exercises, created_by as "createdBy", assigned_to as "assignedTo", schedule
                 FROM workout_plans ORDER BY created_at DESC`,
            studioId ? [studioId] : []
          );
          return result.rows;
        } catch (err) {
          console.log('[Storage] DB query failed for plans:', err);
        }
      }
      return workoutPlans;
    },

    getByCreator: async (creatorId: string): Promise<StoredWorkoutPlan[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT id::text, name, description, exercises, created_by as "createdBy", assigned_to as "assignedTo", schedule
             FROM workout_plans WHERE created_by = $1 ORDER BY created_at DESC`,
            [creatorId]
          );
          return result.rows;
        } catch (err) {
          console.log('[Storage] DB query failed for plans by creator:', err);
        }
      }
      return workoutPlans.filter(p => p.createdBy === creatorId);
    },

    create: async (plan: Omit<StoredWorkoutPlan, 'id'>): Promise<StoredWorkoutPlan> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `INSERT INTO workout_plans (name, description, exercises, created_by, assigned_to, schedule, studio_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id::text, name, description, exercises, created_by as "createdBy", assigned_to as "assignedTo", schedule`,
            [plan.name, plan.description, JSON.stringify(plan.exercises),
             plan.createdBy, JSON.stringify(plan.assignedTo || []), JSON.stringify(plan.schedule || []), plan.studioId || 1]
          );
          return result.rows[0];
        } catch (err) {
          console.log('[Storage] DB insert failed for plan:', err);
        }
      }

      const newPlan: StoredWorkoutPlan = { ...plan, id: generateId() };
      workoutPlans.push(newPlan);
      return newPlan;
    },

    update: async (id: string, updates: Partial<StoredWorkoutPlan>): Promise<StoredWorkoutPlan | null> => {
      if (useDatabase && pool) {
        try {
          const setClauses: string[] = [];
          const values: any[] = [];
          let idx = 1;

          if (updates.name !== undefined) { setClauses.push(`name = $${idx++}`); values.push(updates.name); }
          if (updates.description !== undefined) { setClauses.push(`description = $${idx++}`); values.push(updates.description); }
          if (updates.exercises !== undefined) { setClauses.push(`exercises = $${idx++}`); values.push(JSON.stringify(updates.exercises)); }
          if (updates.assignedTo !== undefined) { setClauses.push(`assigned_to = $${idx++}`); values.push(JSON.stringify(updates.assignedTo)); }
          if (updates.schedule !== undefined) { setClauses.push(`schedule = $${idx++}`); values.push(JSON.stringify(updates.schedule)); }

          setClauses.push(`updated_at = NOW()`);

          values.push(id);
          const result = await pool.query(
            `UPDATE workout_plans SET ${setClauses.join(', ')} WHERE id = $${idx}
             RETURNING id::text, name, description, exercises, created_by as "createdBy", assigned_to as "assignedTo", schedule`,
            values
          );
          return result.rows[0] || null;
        } catch (err) {
          console.log('[Storage] DB update failed for plan:', err);
        }
      }

      const index = workoutPlans.findIndex(p => p.id === id);
      if (index === -1) return null;
      workoutPlans[index] = { ...workoutPlans[index], ...updates };
      return workoutPlans[index];
    },

    delete: async (id: string): Promise<boolean> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query('DELETE FROM workout_plans WHERE id = $1', [id]);
          return (result.rowCount ?? 0) > 0;
        } catch (err) {
          console.log('[Storage] DB delete failed for plan:', err);
        }
      }
      const initialLength = workoutPlans.length;
      workoutPlans = workoutPlans.filter(p => p.id !== id);
      return workoutPlans.length < initialLength;
    },

    assign: async (planId: string, userId: string): Promise<boolean> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `UPDATE workout_plans
             SET assigned_to = assigned_to || $1::jsonb, updated_at = NOW()
             WHERE id = $2 AND NOT (assigned_to @> $1::jsonb)`,
            [JSON.stringify([userId]), planId]
          );
          return (result.rowCount ?? 0) > 0;
        } catch (err) {
          console.log('[Storage] DB assign failed for plan:', err);
        }
      }

      const plan = workoutPlans.find(p => p.id === planId);
      if (!plan) return false;
      if (!plan.assignedTo.includes(userId)) {
        plan.assignedTo.push(userId);
      }
      return true;
    },
  },

  passwordResets: {
    create: async (userId: string, token: string, expiresAt: string): Promise<void> => {
      if (useDatabase && pool) {
        try {
          await pool.query(
            `INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)`,
            [token, userId, expiresAt]
          );
          return;
        } catch (err) {
          console.log('[Storage] DB insert failed for reset token:', err);
        }
      }
      passwordResetTokens.push({ token, userId, expiresAt, used: false });
    },

    validate: async (token: string): Promise<{ userId: string } | null> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT user_id FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()`,
            [token]
          );
          if (result.rows.length === 0) return null;
          return { userId: result.rows[0].user_id.toString() };
        } catch (err) {
          console.log('[Storage] DB query failed for reset token:', err);
        }
      }
      const entry = passwordResetTokens.find(t => t.token === token && !t.used && new Date(t.expiresAt) > new Date());
      return entry ? { userId: entry.userId } : null;
    },

    markUsed: async (token: string): Promise<void> => {
      if (useDatabase && pool) {
        try {
          await pool.query(`UPDATE password_reset_tokens SET used = TRUE WHERE token = $1`, [token]);
          return;
        } catch (err) {
          console.log('[Storage] DB update failed for reset token:', err);
        }
      }
      const entry = passwordResetTokens.find(t => t.token === token);
      if (entry) entry.used = true;
    },
  },

  measurements: {
    create: async (data: { userId: string; date: string; measurements: Record<string, number> }): Promise<{ id: string }> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `INSERT INTO body_measurements (user_id, date, measurements) VALUES ($1, $2, $3) RETURNING id::text`,
            [data.userId, data.date, JSON.stringify(data.measurements)]
          );
          return { id: result.rows[0].id };
        } catch (err) {
          console.log('[Storage] DB insert failed for measurement:', err);
        }
      }
      const id = generateId();
      bodyMeasurements.push({ id, ...data });
      return { id };
    },

    getByUserId: async (userId: string): Promise<{ id: string; userId: string; date: string; measurements: Record<string, number> }[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT id::text, user_id as "userId", date, measurements FROM body_measurements WHERE user_id = $1 ORDER BY date DESC`,
            [userId]
          );
          return result.rows;
        } catch (err) {
          console.log('[Storage] DB query failed for measurements:', err);
        }
      }
      return bodyMeasurements.filter(m => m.userId === userId).sort((a, b) => b.date.localeCompare(a.date));
    },
  },

  gamification: {
    get: async (userId: string): Promise<any | null> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT user_id as "userId", xp, level, badges, current_streak as "currentStreak",
             longest_streak as "longestStreak", streak_freezes as "streakFreezes",
             streak_freezes_used as "streakFreezesUsed", last_active_date as "lastActiveDate",
             coaching_tone as "coachingTone"
             FROM gamification WHERE user_id = $1`,
            [userId]
          );
          return result.rows[0] || null;
        } catch (err) {
          console.log('[Storage] DB query failed for gamification:', err);
        }
      }
      return gamificationData.find(g => g.userId === userId) || null;
    },

    sync: async (userId: string, data: any): Promise<void> => {
      if (useDatabase && pool) {
        try {
          await pool.query(
            `INSERT INTO gamification (user_id, xp, level, badges, current_streak, longest_streak,
             streak_freezes, streak_freezes_used, last_active_date, coaching_tone, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
             ON CONFLICT (user_id) DO UPDATE SET
             xp = $2, level = $3, badges = $4, current_streak = $5, longest_streak = $6,
             streak_freezes = $7, streak_freezes_used = $8, last_active_date = $9, coaching_tone = $10, updated_at = NOW()`,
            [userId, data.xp, data.level, JSON.stringify(data.badges),
             data.currentStreak, data.longestStreak, data.streakFreezes,
             JSON.stringify(data.streakFreezesUsed || []), data.lastActiveDate, data.coachingTone || 'motivator']
          );
          return;
        } catch (err) {
          console.log('[Storage] DB sync failed for gamification:', err);
        }
      }
      const idx = gamificationData.findIndex(g => g.userId === userId);
      const entry = { userId, ...data };
      if (idx >= 0) gamificationData[idx] = entry;
      else gamificationData.push(entry);
    },

    leaderboard: async (limit: number = 20, studioId?: string): Promise<any[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            studioId
              ? `SELECT g.user_id as "userId", g.xp, g.level, g.current_streak as "currentStreak",
                 g.badges, c.name
                 FROM gamification g
                 LEFT JOIN clients c ON g.user_id = c.user_id::text
                 LEFT JOIN users u ON g.user_id = u.id::text
                 WHERE u.studio_id = $2
                 ORDER BY g.xp DESC LIMIT $1`
              : `SELECT g.user_id as "userId", g.xp, g.level, g.current_streak as "currentStreak",
                 g.badges, c.name
                 FROM gamification g
                 LEFT JOIN clients c ON g.user_id = c.user_id::text
                 ORDER BY g.xp DESC LIMIT $1`,
            studioId ? [limit, studioId] : [limit]
          );
          return result.rows;
        } catch (err) {
          console.log('[Storage] DB query failed for leaderboard:', err);
        }
      }
      return gamificationData
        .sort((a, b) => b.xp - a.xp)
        .slice(0, limit)
        .map(g => ({ userId: g.userId, xp: g.xp, level: g.level, currentStreak: g.currentStreak, badges: g.badges }));
    },
  },

  routines: {
    getByUserId: async (userId: string): Promise<any[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT id::text, user_id as "userId", name, exercises, times_used as "timesUsed",
             last_used as "lastUsed", created_at as "createdAt"
             FROM routines WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId]
          );
          return result.rows;
        } catch (err) {
          console.log('[Storage] DB query failed for routines:', err);
        }
      }
      return routinesData.filter(r => r.userId === userId);
    },

    create: async (data: { userId: string; name: string; exercises: any[] }): Promise<{ id: string }> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `INSERT INTO routines (user_id, name, exercises) VALUES ($1, $2, $3) RETURNING id::text`,
            [data.userId, data.name, JSON.stringify(data.exercises)]
          );
          return { id: result.rows[0].id };
        } catch (err) {
          console.log('[Storage] DB insert failed for routine:', err);
        }
      }
      const id = generateId();
      routinesData.push({ id, userId: data.userId, name: data.name, exercises: data.exercises, timesUsed: 0, lastUsed: null, createdAt: new Date().toISOString() });
      return { id };
    },

    update: async (id: string, updates: { name?: string; exercises?: any[]; timesUsed?: number; lastUsed?: string }): Promise<boolean> => {
      if (useDatabase && pool) {
        try {
          const setClauses: string[] = [];
          const values: any[] = [];
          let idx = 1;
          if (updates.name !== undefined) { setClauses.push(`name = $${idx++}`); values.push(updates.name); }
          if (updates.exercises !== undefined) { setClauses.push(`exercises = $${idx++}`); values.push(JSON.stringify(updates.exercises)); }
          if (updates.timesUsed !== undefined) { setClauses.push(`times_used = $${idx++}`); values.push(updates.timesUsed); }
          if (updates.lastUsed !== undefined) { setClauses.push(`last_used = $${idx++}`); values.push(updates.lastUsed); }
          if (setClauses.length === 0) return false;
          values.push(id);
          const result = await pool.query(`UPDATE routines SET ${setClauses.join(', ')} WHERE id = $${idx}`, values);
          return (result.rowCount ?? 0) > 0;
        } catch (err) {
          console.log('[Storage] DB update failed for routine:', err);
        }
      }
      const routine = routinesData.find(r => r.id === id);
      if (!routine) return false;
      Object.assign(routine, updates);
      return true;
    },

    delete: async (id: string): Promise<boolean> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query('DELETE FROM routines WHERE id = $1', [id]);
          return (result.rowCount ?? 0) > 0;
        } catch (err) {
          console.log('[Storage] DB delete failed for routine:', err);
        }
      }
      const len = routinesData.length;
      routinesData = routinesData.filter(r => r.id !== id);
      return routinesData.length < len;
    },
  },

  challenges: {
    create: async (data: { name: string; description: string; type: string; target: number; startDate: string; endDate: string; createdBy: string; studioId?: string }): Promise<{ id: string }> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `INSERT INTO challenges (name, description, type, target, start_date, end_date, created_by, studio_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id::text`,
            [data.name, data.description, data.type, data.target, data.startDate, data.endDate, data.createdBy, data.studioId || 1]
          );
          return { id: result.rows[0].id };
        } catch (err) {
          console.log('[Storage] DB insert failed for challenge:', err);
        }
      }
      const id = generateId();
      challengesData.push({ id, ...data });
      return { id };
    },

    getActive: async (studioId?: string): Promise<any[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            studioId
              ? `SELECT id::text, name, description, type, target, start_date as "startDate",
                 end_date as "endDate", created_by as "createdBy"
                 FROM challenges WHERE end_date >= NOW() AND studio_id = $1 ORDER BY start_date DESC`
              : `SELECT id::text, name, description, type, target, start_date as "startDate",
                 end_date as "endDate", created_by as "createdBy"
                 FROM challenges WHERE end_date >= NOW() ORDER BY start_date DESC`,
            studioId ? [studioId] : []
          );
          return result.rows;
        } catch (err) {
          console.log('[Storage] DB query failed for challenges:', err);
        }
      }
      const now = new Date().toISOString();
      return challengesData.filter(c => c.endDate >= now);
    },

    join: async (challengeId: string, userId: string): Promise<boolean> => {
      if (useDatabase && pool) {
        try {
          await pool.query(
            `INSERT INTO challenge_progress (challenge_id, user_id, current_value) VALUES ($1, $2, 0)
             ON CONFLICT (challenge_id, user_id) DO NOTHING`,
            [challengeId, userId]
          );
          return true;
        } catch (err) {
          console.log('[Storage] DB insert failed for challenge join:', err);
        }
      }
      if (!challengeProgressData.find(p => p.challengeId === challengeId && p.userId === userId)) {
        challengeProgressData.push({ challengeId, userId, currentValue: 0, updatedAt: new Date().toISOString() });
      }
      return true;
    },

    updateProgress: async (challengeId: string, userId: string, value: number): Promise<void> => {
      if (useDatabase && pool) {
        try {
          await pool.query(
            `UPDATE challenge_progress SET current_value = $1, updated_at = NOW() WHERE challenge_id = $2 AND user_id = $3`,
            [value, challengeId, userId]
          );
          return;
        } catch (err) {
          console.log('[Storage] DB update failed for challenge progress:', err);
        }
      }
      const entry = challengeProgressData.find(p => p.challengeId === challengeId && p.userId === userId);
      if (entry) { entry.currentValue = value; entry.updatedAt = new Date().toISOString(); }
    },

    getProgress: async (challengeId: string): Promise<any[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT cp.user_id as "userId", cp.current_value as "currentValue", c.name
             FROM challenge_progress cp
             LEFT JOIN clients c ON cp.user_id = c.user_id::text
             WHERE cp.challenge_id = $1 ORDER BY cp.current_value DESC`,
            [challengeId]
          );
          return result.rows;
        } catch (err) {
          console.log('[Storage] DB query failed for challenge progress:', err);
        }
      }
      return challengeProgressData.filter(p => p.challengeId === challengeId).sort((a, b) => b.currentValue - a.currentValue);
    },
  },

  notifications: {
    create: async (data: { userId: string; title: string; body: string; type: string; data?: any }): Promise<{ id: string }> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `INSERT INTO notifications (user_id, title, body, type, data) VALUES ($1, $2, $3, $4, $5) RETURNING id::text`,
            [data.userId, data.title, data.body, data.type, JSON.stringify(data.data || {})]
          );
          return { id: result.rows[0].id };
        } catch (err) {
          console.log('[Storage] DB insert failed for notification:', err);
        }
      }
      const id = generateId();
      notificationsData.push({ id, userId: data.userId, title: data.title, body: data.body, type: data.type, read: false, data: data.data || {}, createdAt: new Date().toISOString() });
      return { id };
    },

    getByUserId: async (userId: string, limit: number = 50): Promise<any[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT id::text, user_id as "userId", title, body, type, read, data, created_at as "createdAt"
             FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
            [userId, limit]
          );
          return result.rows;
        } catch (err) {
          console.log('[Storage] DB query failed for notifications:', err);
        }
      }
      return notificationsData
        .filter(n => n.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
    },

    markRead: async (id: string): Promise<boolean> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(`UPDATE notifications SET read = TRUE WHERE id = $1`, [id]);
          return (result.rowCount ?? 0) > 0;
        } catch (err) {
          console.log('[Storage] DB update failed for notification:', err);
        }
      }
      const notif = notificationsData.find(n => n.id === id);
      if (notif) { notif.read = true; return true; }
      return false;
    },

    markAllRead: async (userId: string): Promise<void> => {
      if (useDatabase && pool) {
        try {
          await pool.query(`UPDATE notifications SET read = TRUE WHERE user_id = $1`, [userId]);
          return;
        } catch (err) {
          console.log('[Storage] DB update failed for mark all notifications:', err);
        }
      }
      notificationsData.filter(n => n.userId === userId).forEach(n => { n.read = true; });
    },

    getUnreadCount: async (userId: string): Promise<{ count: number }> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT COUNT(*)::integer as count FROM notifications WHERE user_id = $1 AND read = FALSE`,
            [userId]
          );
          return { count: result.rows[0].count };
        } catch (err) {
          console.log('[Storage] DB query failed for unread count:', err);
        }
      }
      return { count: notificationsData.filter(n => n.userId === userId && !n.read).length };
    },
  },

  studios: {
    getById: async (id: string): Promise<StoredStudio | null> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT id::text, name, slug, logo_url as "logoUrl", primary_color as "primaryColor",
             accent_color as "accentColor", owner_email as "ownerEmail", max_users as "maxUsers",
             created_at as "createdAt" FROM studios WHERE id = $1`,
            [id]
          );
          return result.rows[0] || null;
        } catch (err) {
          console.log('[Storage] DB query failed for studio:', err);
        }
      }
      return studiosData.find(s => s.id === id) || null;
    },

    getBySlug: async (slug: string): Promise<StoredStudio | null> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT id::text, name, slug, logo_url as "logoUrl", primary_color as "primaryColor",
             accent_color as "accentColor", owner_email as "ownerEmail", max_users as "maxUsers",
             created_at as "createdAt" FROM studios WHERE slug = $1`,
            [slug]
          );
          return result.rows[0] || null;
        } catch (err) {
          console.log('[Storage] DB query failed for studio by slug:', err);
        }
      }
      return studiosData.find(s => s.slug === slug) || null;
    },

    getAll: async (): Promise<StoredStudio[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT id::text, name, slug, logo_url as "logoUrl", primary_color as "primaryColor",
             accent_color as "accentColor", owner_email as "ownerEmail", max_users as "maxUsers",
             created_at as "createdAt" FROM studios ORDER BY created_at ASC`
          );
          return result.rows;
        } catch (err) {
          console.log('[Storage] DB query failed for all studios:', err);
        }
      }
      return studiosData;
    },

    create: async (data: { name: string; slug: string; logoUrl?: string; primaryColor?: string; accentColor?: string; ownerEmail?: string; maxUsers?: number }): Promise<StoredStudio> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `INSERT INTO studios (name, slug, logo_url, primary_color, accent_color, owner_email, max_users)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id::text, name, slug, logo_url as "logoUrl", primary_color as "primaryColor",
             accent_color as "accentColor", owner_email as "ownerEmail", max_users as "maxUsers",
             created_at as "createdAt"`,
            [data.name, data.slug, data.logoUrl || null, data.primaryColor || '#000000',
             data.accentColor || '#FF6B35', data.ownerEmail || null, data.maxUsers || 50]
          );
          return result.rows[0];
        } catch (err) {
          console.log('[Storage] DB insert failed for studio:', err);
        }
      }
      const studio: StoredStudio = {
        id: generateId(), name: data.name, slug: data.slug,
        logoUrl: data.logoUrl || null, primaryColor: data.primaryColor || '#000000',
        accentColor: data.accentColor || '#FF6B35', ownerEmail: data.ownerEmail || null,
        maxUsers: data.maxUsers || 50, createdAt: new Date().toISOString(),
      };
      studiosData.push(studio);
      return studio;
    },

    update: async (id: string, updates: Partial<Omit<StoredStudio, 'id' | 'createdAt'>>): Promise<StoredStudio | null> => {
      if (useDatabase && pool) {
        try {
          const setClauses: string[] = [];
          const values: any[] = [];
          let idx = 1;
          if (updates.name !== undefined) { setClauses.push(`name = $${idx++}`); values.push(updates.name); }
          if (updates.slug !== undefined) { setClauses.push(`slug = $${idx++}`); values.push(updates.slug); }
          if (updates.logoUrl !== undefined) { setClauses.push(`logo_url = $${idx++}`); values.push(updates.logoUrl); }
          if (updates.primaryColor !== undefined) { setClauses.push(`primary_color = $${idx++}`); values.push(updates.primaryColor); }
          if (updates.accentColor !== undefined) { setClauses.push(`accent_color = $${idx++}`); values.push(updates.accentColor); }
          if (updates.ownerEmail !== undefined) { setClauses.push(`owner_email = $${idx++}`); values.push(updates.ownerEmail); }
          if (updates.maxUsers !== undefined) { setClauses.push(`max_users = $${idx++}`); values.push(updates.maxUsers); }
          if (setClauses.length === 0) return null;
          values.push(id);
          const result = await pool.query(
            `UPDATE studios SET ${setClauses.join(', ')} WHERE id = $${idx}
             RETURNING id::text, name, slug, logo_url as "logoUrl", primary_color as "primaryColor",
             accent_color as "accentColor", owner_email as "ownerEmail", max_users as "maxUsers",
             created_at as "createdAt"`,
            values
          );
          return result.rows[0] || null;
        } catch (err) {
          console.log('[Storage] DB update failed for studio:', err);
        }
      }
      const studio = studiosData.find(s => s.id === id);
      if (!studio) return null;
      Object.assign(studio, updates);
      return studio;
    },

    getMemberCount: async (studioId: string): Promise<number> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT COUNT(*)::integer as count FROM studio_members WHERE studio_id = $1`,
            [studioId]
          );
          return result.rows[0].count;
        } catch (err) {
          console.log('[Storage] DB query failed for member count:', err);
        }
      }
      return studioMembersData.filter(m => m.studioId === studioId).length;
    },
  },

  studioMembers: {
    add: async (studioId: string, userId: string, role: string = 'client'): Promise<boolean> => {
      if (useDatabase && pool) {
        try {
          await pool.query(
            `INSERT INTO studio_members (studio_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
            [studioId, userId, role]
          );
          return true;
        } catch (err) {
          console.log('[Storage] DB insert failed for studio member:', err);
        }
      }
      if (!studioMembersData.find(m => m.studioId === studioId && m.userId === userId)) {
        studioMembersData.push({ studioId, userId, role, joinedAt: new Date().toISOString() });
      }
      return true;
    },

    getByStudio: async (studioId: string): Promise<{ userId: string; role: string; joinedAt: string }[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT user_id::text as "userId", role, joined_at as "joinedAt"
             FROM studio_members WHERE studio_id = $1 ORDER BY joined_at ASC`,
            [studioId]
          );
          return result.rows;
        } catch (err) {
          console.log('[Storage] DB query failed for studio members:', err);
        }
      }
      return studioMembersData.filter(m => m.studioId === studioId);
    },

    remove: async (studioId: string, userId: string): Promise<boolean> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `DELETE FROM studio_members WHERE studio_id = $1 AND user_id = $2`,
            [studioId, userId]
          );
          return (result.rowCount ?? 0) > 0;
        } catch (err) {
          console.log('[Storage] DB delete failed for studio member:', err);
        }
      }
      const len = studioMembersData.length;
      studioMembersData = studioMembersData.filter(m => !(m.studioId === studioId && m.userId === userId));
      return studioMembersData.length < len;
    },
  },
};
