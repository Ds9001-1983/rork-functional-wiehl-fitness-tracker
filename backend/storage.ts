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
}

export interface StoredWorkoutPlan {
  id: string;
  name: string;
  description?: string;
  exercises: any[];
  createdBy: string;
  assignedTo: string[];
  schedule?: any[];
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

    // Seed default users if they don't exist
    await seedDefaultUsers();

    console.log('[Storage] Database tables initialized');
  } catch (err) {
    console.log('[Storage] Failed to initialize tables:', err);
    useDatabase = false;
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
    getAll: async (): Promise<StoredClient[]> => {
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
            ORDER BY u.created_at DESC
          `);

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
    getAll: async (): Promise<StoredInvitation[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(`SELECT code, name, email, created_at as "createdAt" FROM invitations`);
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
    getAll: async (): Promise<StoredWorkoutPlan[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT id::text, name, description, exercises, created_by as "createdBy", assigned_to as "assignedTo", schedule
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
            `INSERT INTO workout_plans (name, description, exercises, created_by, assigned_to, schedule)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id::text, name, description, exercises, created_by as "createdBy", assigned_to as "assignedTo", schedule`,
            [plan.name, plan.description, JSON.stringify(plan.exercises),
             plan.createdBy, JSON.stringify(plan.assignedTo || []), JSON.stringify(plan.schedule || [])]
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
};
