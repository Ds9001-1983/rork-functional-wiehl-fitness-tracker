// Database storage with PostgreSQL
// Falls back to in-memory storage if database is not available

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

export interface StoredUser {
  id: string;
  email: string;
  password: string;
  role: 'client' | 'trainer' | 'admin';
  passwordChanged: boolean;
  createdAt: string;
  consentedAt?: string;
  privacyVersion?: string;
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
  exercises: WorkoutExercise[];
  completed: boolean;
  createdBy?: string;
}

export interface StoredWorkoutPlan {
  id: string;
  name: string;
  description?: string;
  exercises: WorkoutExercise[];
  createdBy: string;
  assignedTo: string[];
  schedule?: { dayOfWeek: number; time?: string }[];
  // Template-Instance system
  templateId?: string;
  isInstance?: boolean;
  customizedFields?: string[];
  assignedUserId?: string; // for instances: the single user this instance belongs to
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

export interface WorkoutSet {
  id: string;
  reps: number;
  weight: number;
  completed: boolean;
  restTime?: number;
  type?: string;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  sets: WorkoutSet[];
  notes?: string;
}

export interface StoredGamification {
  userId: string;
  xp: number;
  level: number;
  badges: { id: string; unlockedAt?: string }[];
  currentStreak: number;
  longestStreak: number;
  streakFreezes: number;
  streakFreezesUsed: string[];
  lastActiveDate: string;
  coachingTone: string;
}

export interface StoredRoutine {
  id: string;
  userId: string;
  name: string;
  exercises: WorkoutExercise[];
  timesUsed: number;
  lastUsed: string | null;
  createdAt: string;
}

export interface StoredChallenge {
  id: string;
  name: string;
  description: string;
  type: string;
  target: number;
  startDate: string;
  endDate: string;
  createdBy: string;
}

export interface StoredChallengeProgress {
  challengeId: string;
  userId: string;
  currentValue: number;
  updatedAt: string;
}

export interface StoredNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  data: Record<string, unknown>;
  createdAt: string;
}

// Database connection
let pool: Pool | null = null;
let useDatabase = false;
const inMemoryPushTokens: Array<{ userId: string; token: string }> = [];
let dbReady: Promise<void> | null = null;

// In-memory fallback storage (dev only - no hardcoded credentials)
// In production, DATABASE_URL is required
const devAdminPw = process.env.DEV_ADMIN_PASSWORD || 'dev-' + Math.random().toString(36).slice(2, 10);
const devTrainerPw = process.env.DEV_TRAINER_PASSWORD || 'dev-' + Math.random().toString(36).slice(2, 10);
let users: StoredUser[] = [
  {
    id: 'admin-1',
    email: 'admin@functional-wiehl.de',
    password: bcrypt.hashSync(devAdminPw, 10),
    role: 'admin',
    passwordChanged: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'trainer-1',
    email: 'trainer@functional-wiehl.de',
    password: bcrypt.hashSync(devTrainerPw, 10),
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
let gamificationData: StoredGamification[] = [];
let routinesData: StoredRoutine[] = [];
let challengesData: StoredChallenge[] = [];
let challengeProgressData: StoredChallengeProgress[] = [];
let notificationsData: StoredNotification[] = [];
let studiosData: StoredStudio[] = [
  { id: '1', name: 'Functional Wiehl', slug: 'functional-wiehl', logoUrl: null, primaryColor: '#000000', accentColor: '#FF6B35', ownerEmail: 'admin@functional-wiehl.de', maxUsers: 50, createdAt: new Date().toISOString() },
];
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

    // dbReady is awaited before any storage operation to prevent race conditions
    dbReady = pool.connect().then(async (client) => {
      console.log('[Storage] PostgreSQL connected successfully');
      client.release();
      useDatabase = true;
      await initializeTables();
    }).catch(err => {
      if (process.env.NODE_ENV === 'production') {
        console.error('[Storage] FATAL: PostgreSQL connection failed in production:', err.message);
        process.exit(1);
      }
      console.warn('[Storage] PostgreSQL connection failed:', err.message);
      console.warn('[Storage] WARNING: Falling back to in-memory storage - data will be lost on restart!');
      useDatabase = false;
    });
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Storage] FATAL: PostgreSQL setup failed in production:', err);
      process.exit(1);
    }
    console.warn('[Storage] PostgreSQL setup failed:', err);
    console.warn('[Storage] WARNING: Using in-memory storage - data will be lost on restart!');
    useDatabase = false;
  }
} else {
  if (process.env.NODE_ENV === 'production') {
    console.error('[Storage] FATAL: DATABASE_URL must be set in production');
    process.exit(1);
  }
  console.warn('[Storage] No DATABASE_URL provided - using in-memory storage (dev only)');
  console.warn('[Storage] Dev credentials: admin=' + devAdminPw + ', trainer=' + devTrainerPw);
}

// Ensure DB is ready before any storage operation
async function waitForDb(): Promise<void> {
  if (dbReady) await dbReady;
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
    await createIndexIfNotExists('idx_workouts_user_id', 'workouts (user_id)');
    await createIndexIfNotExists('idx_workouts_date', 'workouts (date)');
    await createIndexIfNotExists('idx_workouts_completed', 'workouts (user_id, completed)');
    await createIndexIfNotExists('idx_notifications_user_id', 'notifications (user_id)');
    await createIndexIfNotExists('idx_notifications_read', 'notifications (user_id, read)');
    await createIndexIfNotExists('idx_body_measurements_user_id', 'body_measurements (user_id)');
    await createIndexIfNotExists('idx_routines_user_id', 'routines (user_id)');
    await createIndexIfNotExists('idx_clients_user_id', 'clients (user_id)');
    await createIndexIfNotExists('idx_plans_created_by', 'workout_plans (created_by)');
    await createIndexIfNotExists('idx_plans_template_id', 'workout_plans (template_id)');
    await createIndexIfNotExists('idx_plans_assigned_user_id', 'workout_plans (assigned_user_id)');
    await createIndexIfNotExists('idx_gamification_xp', 'gamification (xp DESC)');
    await createIndexIfNotExists('idx_challenges_end_date', 'challenges (end_date)');
    await createIndexIfNotExists('idx_challenge_progress_challenge', 'challenge_progress (challenge_id)');

    // Push subscriptions for Web Push notifications
    await pool!.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        studio_id INTEGER DEFAULT 1,
        endpoint TEXT NOT NULL,
        keys_p256dh TEXT NOT NULL,
        keys_auth TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, endpoint)
      )
    `);

    // Chat messages for trainer-client communication
    await pool!.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        studio_id INTEGER DEFAULT 1,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Mesocycles for periodization planning
    await pool!.query(`
      CREATE TABLE IF NOT EXISTS mesocycles (
        id SERIAL PRIMARY KEY,
        studio_id INTEGER DEFAULT 1,
        client_id INTEGER,
        name VARCHAR(255) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        phases JSONB DEFAULT '[]',
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Progress photos
    await pool!.query(`
      CREATE TABLE IF NOT EXISTS progress_photos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        studio_id INTEGER DEFAULT 1,
        image_data TEXT NOT NULL,
        category VARCHAR(20) DEFAULT 'front',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await createIndexIfNotExists('idx_push_subscriptions_user_id', 'push_subscriptions (user_id)');
    await createIndexIfNotExists('idx_chat_messages_participants', 'chat_messages (sender_id, receiver_id)');
    await createIndexIfNotExists('idx_chat_messages_receiver', 'chat_messages (receiver_id, read_at)');
    await createIndexIfNotExists('idx_mesocycles_client_id', 'mesocycles (client_id)');
    await createIndexIfNotExists('idx_progress_photos_user_id', 'progress_photos (user_id)');

    // DSGVO: Add consent fields to users
    await addColumnIfNotExists('users', 'consented_at', 'TIMESTAMP');
    await addColumnIfNotExists('users', 'privacy_version', "VARCHAR(10) DEFAULT '1.0'");

    // Template-Instance system for workout plans
    await addColumnIfNotExists('workout_plans', 'template_id', 'INTEGER');
    await addColumnIfNotExists('workout_plans', 'is_instance', 'BOOLEAN DEFAULT FALSE');
    await addColumnIfNotExists('workout_plans', 'customized_fields', "JSONB DEFAULT '[]'");
    await addColumnIfNotExists('workout_plans', 'assigned_user_id', 'VARCHAR(50)');

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
      await pool.query(`SELECT setval('studios_id_seq', (SELECT COALESCE(MAX(id), 1) FROM studios))`);
    }
  } catch (err) {
    console.error('[Storage] Could not seed default studio:', err);
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

/** Wait until the database connection is established (or fallback is decided). */
export { waitForDb };

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
          };
        } catch (err) {
          console.log('[Storage] DB query failed for findByEmail:', err);
        }
      }
      return users.find(u => u.email === email) || null;
    },

    create: async (user: { email: string; password: string; role: string }): Promise<StoredUser> => {
      const hashedPassword = await bcrypt.hash(user.password, 10);

      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `INSERT INTO users (email, password, role, password_changed)
             VALUES ($1, $2, $3, FALSE)
             RETURNING id, email, password, role, password_changed as "passwordChanged", created_at as "createdAt"`,
            [user.email, hashedPassword, user.role]
          );
          const row = result.rows[0];
          return {
            id: row.id.toString(),
            email: row.email,
            password: row.password,
            role: row.role,
            passwordChanged: row.passwordChanged,
            createdAt: row.createdAt,
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
    // Reads/writes operate on the `users` table only (role='client').
    // `id` and `userId` in the returned object are identical — single-ID from now on.
    getAll: async (): Promise<StoredClient[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(`
            SELECT
              id,
              email,
              role,
              name,
              phone,
              avatar,
              join_date as "joinDate",
              starter_password as "starterPassword",
              password_changed as "passwordChanged",
              total_workouts as "totalWorkouts",
              total_volume as "totalVolume",
              current_streak as "currentStreak",
              longest_streak as "longestStreak",
              personal_records as "personalRecords",
              created_at as "createdAt"
            FROM users
            WHERE role = 'client'
            ORDER BY created_at DESC
          `);

          return result.rows.map(row => ({
            id: row.id.toString(),
            userId: row.id.toString(),
            name: row.name || row.email?.split('@')[0] || 'Unbekannt',
            email: row.email,
            phone: row.phone,
            role: row.role,
            joinDate: row.joinDate || row.createdAt || new Date().toISOString(),
            starterPassword: row.starterPassword,
            passwordChanged: row.passwordChanged || false,
            avatar: row.avatar,
            stats: {
              totalWorkouts: Number(row.totalWorkouts) || 0,
              totalVolume: Number(row.totalVolume) || 0,
              currentStreak: Number(row.currentStreak) || 0,
              longestStreak: Number(row.longestStreak) || 0,
              personalRecords: row.personalRecords || {},
            },
          }));
        } catch (err) {
          console.error('[Storage] DB query failed for getAll clients:', err);
          throw err;
        }
      }
      return clients;
    },

    create: async (client: Omit<StoredClient, 'id'>): Promise<StoredClient> => {
      if (useDatabase && pool) {
        try {
          const hashedPassword = await bcrypt.hash(client.starterPassword || 'TEMP123', 10);
          const result = await pool.query(
            `INSERT INTO users
              (email, password, role, password_changed, name, phone, avatar, join_date,
               starter_password, total_workouts, total_volume, current_streak,
               longest_streak, personal_records)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
             RETURNING id`,
            [
              client.email,
              hashedPassword,
              client.role,
              client.passwordChanged,
              client.name,
              client.phone ?? null,
              client.avatar ?? null,
              client.joinDate,
              client.starterPassword ?? null,
              client.stats.totalWorkouts,
              client.stats.totalVolume,
              client.stats.currentStreak,
              client.stats.longestStreak,
              JSON.stringify(client.stats.personalRecords),
            ]
          );
          const userId = result.rows[0].id.toString();
          const newClient: StoredClient = { ...client, id: userId, userId };
          console.log('[Storage] Created client in users-table with id:', userId);
          return newClient;
        } catch (err: unknown) {
          console.log('[Storage] DB insert failed for client:', (err as Error).message);
          if ((err as Error).message?.includes('duplicate key') || (err as { code?: string }).code === '23505') {
            throw new Error('CLIENT_EMAIL_EXISTS');
          }
          throw err;
        }
      }

      // Fallback to memory
      const id = generateId();
      const newClient: StoredClient = { ...client, id };
      clients.push(newClient);
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
          const values: (string | number | boolean | null)[] = [];
          let idx = 1;
          if (stats.totalWorkouts !== undefined) { updates.push(`total_workouts = $${idx++}`); values.push(stats.totalWorkouts); }
          if (stats.totalVolume !== undefined) { updates.push(`total_volume = $${idx++}`); values.push(stats.totalVolume); }
          if (stats.currentStreak !== undefined) { updates.push(`current_streak = $${idx++}`); values.push(stats.currentStreak); }
          if (stats.longestStreak !== undefined) { updates.push(`longest_streak = $${idx++}`); values.push(stats.longestStreak); }
          if (stats.personalRecords !== undefined) { updates.push(`personal_records = $${idx++}`); values.push(JSON.stringify(stats.personalRecords)); }

          if (updates.length === 0) return false;

          values.push(userId);
          const result = await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`,
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
          const values: (string | number | boolean | null)[] = [];
          let idx = 1;
          if (updates.name !== undefined) { setClauses.push(`name = $${idx++}`); values.push(updates.name); }
          if (updates.phone !== undefined) { setClauses.push(`phone = $${idx++}`); values.push(updates.phone); }
          if (updates.avatar !== undefined) { setClauses.push(`avatar = $${idx++}`); values.push(updates.avatar); }

          if (setClauses.length === 0) return false;

          values.push(userId);
          const result = await pool.query(
            `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx}`,
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
    getAll: async (): Promise<StoredInvitation[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT code, name, email, created_at as "createdAt" FROM invitations`
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
    getById: async (id: string): Promise<StoredWorkout | null> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT id::text, user_id as "userId", name, date, duration, exercises, completed, created_by as "createdBy"
             FROM workouts WHERE id = $1`,
            [id]
          );
          return result.rows[0] || null;
        } catch (err) {
          console.error('[Storage] DB query failed for workout getById:', err);
        }
      }
      return workouts.find(w => w.id === id) || null;
    },

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

    getAll: async (): Promise<StoredWorkout[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT id::text, user_id as "userId", name, date, duration, exercises, completed, created_by as "createdBy"
             FROM workouts ORDER BY date DESC`
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
            `INSERT INTO workouts (user_id, name, date, duration, exercises, completed, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id::text, user_id as "userId", name, date, duration, exercises, completed, created_by as "createdBy"`,
            [workout.userId, workout.name, workout.date, workout.duration || 0,
             JSON.stringify(workout.exercises), workout.completed, workout.createdBy]
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
          const values: (string | number | boolean | null)[] = [];
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
    getById: async (id: string): Promise<StoredWorkoutPlan | null> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT id::text, name, description, exercises, created_by as "createdBy", assigned_to as "assignedTo", schedule,
             template_id::text as "templateId", COALESCE(is_instance, false) as "isInstance",
             customized_fields as "customizedFields", assigned_user_id as "assignedUserId"
             FROM workout_plans WHERE id = $1`,
            [id]
          );
          return result.rows[0] || null;
        } catch (err) {
          console.error('[Storage] DB query failed for plan getById:', err);
        }
      }
      return workoutPlans.find(p => p.id === id) || null;
    },

    getAll: async (): Promise<StoredWorkoutPlan[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT id::text, name, description, exercises, created_by as "createdBy", assigned_to as "assignedTo", schedule,
             template_id::text as "templateId", COALESCE(is_instance, false) as "isInstance",
             customized_fields as "customizedFields", assigned_user_id as "assignedUserId"
             FROM workout_plans ORDER BY created_at DESC`
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
            `SELECT id::text, name, description, exercises, created_by as "createdBy", assigned_to as "assignedTo", schedule,
             template_id::text as "templateId", COALESCE(is_instance, false) as "isInstance",
             customized_fields as "customizedFields", assigned_user_id as "assignedUserId"
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
            `INSERT INTO workout_plans (name, description, exercises, created_by, assigned_to, schedule,
             template_id, is_instance, customized_fields, assigned_user_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id::text, name, description, exercises, created_by as "createdBy", assigned_to as "assignedTo", schedule,
             template_id::text as "templateId", COALESCE(is_instance, false) as "isInstance",
             customized_fields as "customizedFields", assigned_user_id as "assignedUserId"`,
            [plan.name, plan.description, JSON.stringify(plan.exercises),
             plan.createdBy, JSON.stringify(plan.assignedTo || []), JSON.stringify(plan.schedule || []),
             plan.templateId || null, plan.isInstance || false, JSON.stringify(plan.customizedFields || []),
             plan.assignedUserId || null]
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
          const values: (string | number | boolean | null)[] = [];
          let idx = 1;

          if (updates.name !== undefined) { setClauses.push(`name = $${idx++}`); values.push(updates.name); }
          if (updates.description !== undefined) { setClauses.push(`description = $${idx++}`); values.push(updates.description); }
          if (updates.exercises !== undefined) { setClauses.push(`exercises = $${idx++}`); values.push(JSON.stringify(updates.exercises)); }
          if (updates.assignedTo !== undefined) { setClauses.push(`assigned_to = $${idx++}`); values.push(JSON.stringify(updates.assignedTo)); }
          if (updates.schedule !== undefined) { setClauses.push(`schedule = $${idx++}`); values.push(JSON.stringify(updates.schedule)); }
          if (updates.customizedFields !== undefined) { setClauses.push(`customized_fields = $${idx++}`); values.push(JSON.stringify(updates.customizedFields)); }

          setClauses.push(`updated_at = NOW()`);

          values.push(id);
          const result = await pool.query(
            `UPDATE workout_plans SET ${setClauses.join(', ')} WHERE id = $${idx}
             RETURNING id::text, name, description, exercises, created_by as "createdBy", assigned_to as "assignedTo", schedule,
             template_id::text as "templateId", COALESCE(is_instance, false) as "isInstance",
             customized_fields as "customizedFields", assigned_user_id as "assignedUserId"`,
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

    instantiate: async (templateId: string, userId: string): Promise<StoredWorkoutPlan | null> => {
      // Get the template
      let template: StoredWorkoutPlan | null = null;

      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT id::text, name, description, exercises, created_by as "createdBy", assigned_to as "assignedTo",
             schedule
             FROM workout_plans WHERE id = $1`,
            [templateId]
          );
          if (result.rows.length > 0) template = result.rows[0];
        } catch (err) {
          console.log('[Storage] DB query failed for template lookup:', err);
        }
      }

      if (!template) {
        template = workoutPlans.find(p => p.id === templateId) || null;
      }

      if (!template) return null;

      // Create independent copy as instance
      const instance: Omit<StoredWorkoutPlan, 'id'> = {
        name: template.name,
        description: template.description,
        exercises: JSON.parse(JSON.stringify(template.exercises)), // deep copy
        createdBy: template.createdBy,
        assignedTo: [userId],
        schedule: template.schedule ? JSON.parse(JSON.stringify(template.schedule)) : [],
        templateId: templateId,
        isInstance: true,
        customizedFields: [],
        assignedUserId: userId,
      };

      return storage.workoutPlans.create(instance);
    },

    getInstancesForTemplate: async (templateId: string): Promise<StoredWorkoutPlan[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT id::text, name, description, exercises, created_by as "createdBy", assigned_to as "assignedTo", schedule,
             template_id::text as "templateId", COALESCE(is_instance, false) as "isInstance",
             customized_fields as "customizedFields", assigned_user_id as "assignedUserId"
             FROM workout_plans WHERE template_id = $1 ORDER BY created_at DESC`,
            [templateId]
          );
          return result.rows;
        } catch (err) {
          console.log('[Storage] DB query failed for template instances:', err);
        }
      }
      return workoutPlans.filter(p => p.templateId === templateId);
    },

    getByUserId: async (userId: string): Promise<StoredWorkoutPlan[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT id::text, name, description, exercises, created_by as "createdBy", assigned_to as "assignedTo", schedule,
             template_id::text as "templateId", COALESCE(is_instance, false) as "isInstance",
             customized_fields as "customizedFields", assigned_user_id as "assignedUserId"
             FROM workout_plans WHERE assigned_user_id = $1 OR (assigned_to @> $2::jsonb)
             ORDER BY created_at DESC`,
            [userId, JSON.stringify([userId])]
          );
          return result.rows;
        } catch (err) {
          console.log('[Storage] DB query failed for user plans:', err);
        }
      }
      return workoutPlans.filter(p => p.assignedUserId === userId || p.assignedTo.includes(userId));
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
    get: async (userId: string): Promise<StoredGamification | null> => {
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

    sync: async (userId: string, data: Omit<StoredGamification, 'userId'>): Promise<void> => {
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

    leaderboard: async (limit: number = 20): Promise<{ userId: string; xp: number; level: number; currentStreak: number; badges: { id: string; unlockedAt?: string }[]; name?: string }[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT g.user_id as "userId", g.xp, g.level, g.current_streak as "currentStreak",
             g.badges, u.name
             FROM gamification g
             LEFT JOIN users u ON u.id::text = g.user_id
             ORDER BY g.xp DESC LIMIT $1`,
            [limit]
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
    getByUserId: async (userId: string): Promise<StoredRoutine[]> => {
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

    create: async (data: { userId: string; name: string; exercises: WorkoutExercise[] }): Promise<{ id: string }> => {
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

    update: async (id: string, updates: { name?: string; exercises?: WorkoutExercise[]; timesUsed?: number; lastUsed?: string }): Promise<boolean> => {
      if (useDatabase && pool) {
        try {
          const setClauses: string[] = [];
          const values: (string | number | boolean | null)[] = [];
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
    create: async (data: { name: string; description: string; type: string; target: number; startDate: string; endDate: string; createdBy: string }): Promise<{ id: string }> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `INSERT INTO challenges (name, description, type, target, start_date, end_date, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id::text`,
            [data.name, data.description, data.type, data.target, data.startDate, data.endDate, data.createdBy]
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

    getActive: async (): Promise<StoredChallenge[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT id::text, name, description, type, target, start_date as "startDate",
             end_date as "endDate", created_by as "createdBy"
             FROM challenges WHERE end_date >= NOW() ORDER BY start_date DESC`
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

    getProgress: async (challengeId: string): Promise<{ userId: string; currentValue: number; name?: string }[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT cp.user_id as "userId", cp.current_value as "currentValue", u.name
             FROM challenge_progress cp
             LEFT JOIN users u ON u.id::text = cp.user_id
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
    create: async (data: { userId: string; title: string; body: string; type: string; data?: Record<string, unknown> }): Promise<{ id: string }> => {
      console.log('[Notifications] Creating notification for user:', data.userId, '| title:', data.title, '| type:', data.type);
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `INSERT INTO notifications (user_id, title, body, type, data) VALUES ($1, $2, $3, $4, $5) RETURNING id::text`,
            [data.userId, data.title, data.body, data.type, JSON.stringify(data.data || {})]
          );
          console.log('[Notifications] Created in DB with id:', result.rows[0].id);
          return { id: result.rows[0].id };
        } catch (err) {
          console.error('[Notifications] DB INSERT FAILED:', err);
        }
      }
      const id = generateId();
      notificationsData.push({ id, userId: data.userId, title: data.title, body: data.body, type: data.type, read: false, data: data.data || {}, createdAt: new Date().toISOString() });
      console.log('[Notifications] Created in memory with id:', id);
      return { id };
    },

    getByUserId: async (userId: string, limit: number = 50): Promise<StoredNotification[]> => {
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

    update: async (id: string, updates: Partial<Omit<StoredStudio, 'id' | 'createdAt'>>): Promise<StoredStudio | null> => {
      if (useDatabase && pool) {
        try {
          const setClauses: string[] = [];
          const values: (string | number | boolean | null)[] = [];
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

  },

  // DSGVO: Privacy & consent management
  privacy: {
    recordConsent: async (userId: string, version: string): Promise<boolean> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `UPDATE users SET consented_at = NOW(), privacy_version = $1 WHERE id = $2`,
            [version, userId]
          );
          return (result.rowCount ?? 0) > 0;
        } catch (err) {
          console.log('[Storage] DB update failed for consent:', err);
        }
      }
      // In-memory: track consent on user object
      const user = users.find(u => u.id === userId);
      if (user) {
        user.consentedAt = new Date().toISOString();
        user.privacyVersion = version;
        return true;
      }
      return false;
    },

    hasConsented: async (userId: string): Promise<boolean> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT consented_at FROM users WHERE id = $1`,
            [userId]
          );
          return result.rows.length > 0 && result.rows[0].consented_at !== null;
        } catch (err) {
          console.log('[Storage] DB query failed for consent check:', err);
        }
      }
      const user = users.find(u => u.id === userId);
      return !!user?.consentedAt;
    },

    exportUserData: async (userId: string): Promise<{
      exportedAt: string;
      privacyVersion: string;
      profile: { id: string; email: string; name?: string; phone?: string; role: string; createdAt: string } | null;
      workouts: StoredWorkout[];
      bodyMeasurements: { id: string; userId: string; date: string; measurements: Record<string, number> }[];
      gamification: StoredGamification | null;
      routines: StoredRoutine[];
    }> => {
      const user = await storage.users.findByEmail(''); // we'll fetch by id below
      // Collect all user data from each table
      const userWorkouts = await storage.workouts.getByUserId(userId);
      const userMeasurements = await storage.measurements.getByUserId(userId);
      const userGamification = await storage.gamification.get(userId);
      const userRoutines = await storage.routines.getByUserId(userId);

      // Get user profile
      let profile = null;
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT id, email, role, created_at as "createdAt", consented_at as "consentedAt",
             name, phone, avatar
             FROM users
             WHERE id = $1`,
            [userId]
          );
          if (result.rows.length > 0) {
            const row = result.rows[0];
            profile = { id: row.id, email: row.email, name: row.name, phone: row.phone, role: row.role, createdAt: row.createdAt };
          }
        } catch (err) {
          console.log('[Storage] DB query failed for data export:', err);
        }
      }
      if (!profile) {
        const u = users.find(u => u.id === userId);
        const allClients = await storage.clients.getAll();
        const c = allClients.find(c => c.userId === userId || c.id === userId);
        if (u) profile = { id: u.id, email: u.email, name: c?.name, phone: c?.phone, role: u.role, createdAt: u.createdAt };
      }

      return {
        exportedAt: new Date().toISOString(),
        privacyVersion: '1.0',
        profile,
        workouts: userWorkouts,
        bodyMeasurements: userMeasurements,
        gamification: userGamification,
        routines: userRoutines,
      };
    },

    deleteUserData: async (userId: string): Promise<boolean> => {
      if (useDatabase && pool) {
        try {
          // Delete from all tables in correct order (foreign keys)
          await pool.query(`DELETE FROM challenge_progress WHERE user_id = $1`, [userId]);
          await pool.query(`DELETE FROM notifications WHERE user_id = $1`, [userId]);
          await pool.query(`DELETE FROM routines WHERE user_id = $1`, [userId]);
          await pool.query(`DELETE FROM gamification WHERE user_id = $1`, [userId]);
          await pool.query(`DELETE FROM body_measurements WHERE user_id = $1`, [userId]);
          await pool.query(`DELETE FROM workouts WHERE user_id = $1`, [userId]);
          await pool.query(`DELETE FROM password_reset_tokens WHERE user_id = $1::integer`, [userId]);
          // clients-Tabelle wird nach Merge nicht mehr gebraucht, aber gelöscht für sauberen Cleanup (falls noch Legacy-Row)
          await pool.query(`DELETE FROM clients WHERE user_id = $1::integer`, [userId]).catch(() => {});
          await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
          console.log(`[Storage] DSGVO: All data deleted for user ${userId}`);
          return true;
        } catch (err) {
          console.log('[Storage] DB delete failed for user data:', err);
          return false;
        }
      }

      // In-memory fallback
      users = users.filter(u => u.id !== userId);
      clients = clients.filter(c => c.userId !== userId && c.id !== userId);
      workouts = workouts.filter(w => w.userId !== userId);
      bodyMeasurements = bodyMeasurements.filter(m => m.userId !== userId);
      gamificationData = gamificationData.filter(g => g.userId !== userId);
      routinesData = routinesData.filter(r => r.userId !== userId);
      challengeProgressData = challengeProgressData.filter(p => p.userId !== userId);
      notificationsData = notificationsData.filter(n => n.userId !== userId);
      return true;
    },
  },

  // Push Subscriptions
  pushSubscriptions: {
    async subscribe(userId: string, endpoint: string, p256dh: string, auth: string) {
      if (pool) {
        try {
          await pool.query(
            `INSERT INTO push_subscriptions (user_id, endpoint, keys_p256dh, keys_auth)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, endpoint) DO UPDATE SET keys_p256dh = $3, keys_auth = $4`,
            [userId, endpoint, p256dh, auth]
          );
          return true;
        } catch (err) {
          console.log('[Storage] Push subscribe failed:', err);
          return false;
        }
      }
      return true;
    },

    async unsubscribe(userId: string, endpoint: string) {
      if (pool) {
        try {
          await pool.query(`DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`, [userId, endpoint]);
        } catch {}
      }
      return true;
    },

    async getByUserId(userId: string) {
      if (pool) {
        try {
          const result = await pool.query(`SELECT * FROM push_subscriptions WHERE user_id = $1`, [userId]);
          return result.rows;
        } catch { return []; }
      }
      return [];
    },

  },

  // Chat Messages
  chatMessages: {
    async send(senderId: string, receiverId: string, message: string) {
      if (pool) {
        try {
          const result = await pool.query(
            `INSERT INTO chat_messages (sender_id, receiver_id, message) VALUES ($1, $2, $3) RETURNING *`,
            [senderId, receiverId, message]
          );
          return result.rows[0];
        } catch (err) {
          console.log('[Storage] Chat send failed:', err);
          return null;
        }
      }
      return { id: Date.now().toString(), sender_id: senderId, receiver_id: receiverId, message, created_at: new Date().toISOString(), read_at: null };
    },

    async list(userId1: string, userId2: string, limit = 50) {
      if (pool) {
        try {
          const result = await pool.query(
            `SELECT * FROM chat_messages
             WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
             ORDER BY created_at DESC LIMIT $3`,
            [userId1, userId2, limit]
          );
          return result.rows.reverse();
        } catch { return []; }
      }
      return [];
    },

    async markRead(userId: string, senderId: string) {
      if (pool) {
        try {
          await pool.query(
            `UPDATE chat_messages SET read_at = CURRENT_TIMESTAMP WHERE receiver_id = $1 AND sender_id = $2 AND read_at IS NULL`,
            [userId, senderId]
          );
        } catch {}
      }
    },

    async getUnreadCount(userId: string) {
      if (pool) {
        try {
          const result = await pool.query(
            `SELECT COUNT(*)::int as count FROM chat_messages WHERE receiver_id = $1 AND read_at IS NULL`,
            [userId]
          );
          return result.rows[0]?.count || 0;
        } catch { return 0; }
      }
      return 0;
    },

    async getConversations(userId: string) {
      if (pool) {
        try {
          const result = await pool.query(
            `SELECT DISTINCT ON (other_id)
               other_id,
               last_message,
               last_message_at,
               unread_count,
               other_name,
               other_role
             FROM (
               SELECT
                 CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS other_id,
                 message AS last_message,
                 cm.created_at AS last_message_at,
                 (SELECT COUNT(*)::int FROM chat_messages WHERE receiver_id = $1 AND sender_id = CASE WHEN cm.sender_id = $1 THEN cm.receiver_id ELSE cm.sender_id END AND read_at IS NULL) AS unread_count,
                 COALESCE(u.name, u.email, 'Unbekannt') AS other_name,
                 u.role AS other_role
               FROM chat_messages cm
               LEFT JOIN users u ON u.id = CASE WHEN cm.sender_id = $1 THEN cm.receiver_id ELSE cm.sender_id END
               WHERE cm.sender_id = $1 OR cm.receiver_id = $1
               ORDER BY cm.created_at DESC
             ) sub
             ORDER BY other_id, last_message_at DESC`,
            [userId]
          );
          // Sort by last message time descending
          return result.rows.sort((a: any, b: any) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
        } catch (err) {
          console.log('[Storage] Chat conversations failed:', err);
          return [];
        }
      }
      return [];
    },
  },

  // Mesocycles
  mesocycles: {
    async create(clientId: string | null, name: string, startDate: string, endDate: string, phases: Record<string, unknown>[], createdBy: string) {
      if (pool) {
        try {
          const result = await pool.query(
            `INSERT INTO mesocycles (client_id, name, start_date, end_date, phases, created_by)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [clientId, name, startDate, endDate, JSON.stringify(phases), createdBy]
          );
          return result.rows[0];
        } catch (err) {
          console.log('[Storage] Mesocycle create failed:', err);
          return null;
        }
      }
      return { id: Date.now().toString(), client_id: clientId, name, start_date: startDate, end_date: endDate, phases, created_by: createdBy };
    },

    async list() {
      if (pool) {
        try {
          const result = await pool.query(`SELECT * FROM mesocycles ORDER BY start_date DESC`);
          return result.rows;
        } catch { return []; }
      }
      return [];
    },

    async update(id: string, updates: Record<string, unknown>) {
      if (pool) {
        try {
          const fields: string[] = [];
          const values: (string | number | boolean | null)[] = [];
          let idx = 1;
          for (const [key, val] of Object.entries(updates)) {
            fields.push(`${key} = $${idx}`);
            values.push(key === 'phases' ? JSON.stringify(val) : val as string | number | boolean | null);
            idx++;
          }
          values.push(id);
          await pool.query(`UPDATE mesocycles SET ${fields.join(', ')} WHERE id = $${idx}`, values);
          return true;
        } catch { return false; }
      }
      return true;
    },

    async delete(id: string) {
      if (pool) {
        try {
          await pool.query(`DELETE FROM mesocycles WHERE id = $1`, [id]);
        } catch {}
      }
      return true;
    },
  },

  // Progress Photos
  progressPhotos: {
    async create(userId: string, imageData: string, category: string, notes?: string) {
      if (pool) {
        try {
          const result = await pool.query(
            `INSERT INTO progress_photos (user_id, image_data, category, notes) VALUES ($1, $2, $3, $4) RETURNING id, user_id, category, notes, created_at`,
            [userId, imageData, category, notes || null]
          );
          return result.rows[0];
        } catch (err) {
          console.log('[Storage] Photo create failed:', err);
          return null;
        }
      }
      return { id: Date.now().toString(), user_id: userId, category, notes, created_at: new Date().toISOString() };
    },

    async list(userId: string) {
      if (pool) {
        try {
          const result = await pool.query(
            `SELECT id, user_id, studio_id, category, notes, created_at FROM progress_photos WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId]
          );
          return result.rows;
        } catch { return []; }
      }
      return [];
    },

    async getById(id: string, userId: string) {
      if (pool) {
        try {
          const result = await pool.query(`SELECT * FROM progress_photos WHERE id = $1 AND user_id = $2`, [id, userId]);
          return result.rows[0] || null;
        } catch { return null; }
      }
      return null;
    },

    async delete(id: string, userId: string) {
      if (pool) {
        try {
          await pool.query(`DELETE FROM progress_photos WHERE id = $1 AND user_id = $2`, [id, userId]);
        } catch {}
      }
      return true;
    },
  },

  pushTokens: {
    save: async (userId: string, token: string) => {
      if (useDatabase && pool) {
        try {
          await pool.query(
            `INSERT INTO push_tokens (user_id, token, updated_at) VALUES ($1, $2, NOW())
             ON CONFLICT (user_id) DO UPDATE SET token = $2, updated_at = NOW()`,
            [parseInt(userId), token]
          );
          return true;
        } catch (err) {
          console.log('[Storage] push token save failed:', err);
          throw err;
        }
      }
      const existing = inMemoryPushTokens.find(t => t.userId === userId);
      if (existing) { existing.token = token; } else { inMemoryPushTokens.push({ userId, token }); }
      return true;
    },
    getByUserId: async (userId: string): Promise<string | null> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query('SELECT token FROM push_tokens WHERE user_id = $1', [parseInt(userId)]);
          return result.rows[0]?.token || null;
        } catch { return null; }
      }
      return inMemoryPushTokens.find(t => t.userId === userId)?.token || null;
    },
    getByUserIds: async (userIds: string[]): Promise<Array<{ userId: string; token: string }>> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT user_id::text as "userId", token FROM push_tokens WHERE user_id = ANY($1::int[])`,
            [userIds.map(id => parseInt(id))]
          );
          return result.rows;
        } catch { return []; }
      }
      return inMemoryPushTokens.filter(t => userIds.includes(t.userId));
    },
    list: async (): Promise<Array<{ userId: string; token: string }>> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(`SELECT user_id::text as "userId", token FROM push_tokens`);
          return result.rows;
        } catch { return []; }
      }
      return [...inMemoryPushTokens];
    },
  },
};


// ---- Course-module helpers (merged from current storage.ts) ----
export function getPool(): Pool | null {
  return useDatabase ? pool : null;
}

export function isUsingDatabase(): boolean {
  return useDatabase;
}

export function getRawPool(): Pool | null {
  return pool;
}
