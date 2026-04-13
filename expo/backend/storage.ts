// Database storage with PostgreSQL
// Falls back to in-memory storage if database is not available

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

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

export interface StoredWorkoutSet {
  id: string;
  reps: number;
  weight: number;
  completed: boolean;
  restTime?: number;
}

export interface StoredWorkoutExercise {
  id: string;
  exerciseId: string;
  notes?: string;
  sets: StoredWorkoutSet[];
}

export interface StoredWorkout {
  id: string;
  name: string;
  date: string;
  duration?: number;
  completed: boolean;
  userId: string;
  createdBy?: string;
  exercises: StoredWorkoutExercise[];
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
let inMemoryWorkouts: StoredWorkout[] = [];
let inMemoryWorkoutExercises: (StoredWorkoutExercise & { workoutId: number })[] = [];
let inMemoryWorkoutSets: (StoredWorkoutSet & { workoutExerciseId: number })[] = [];
let inMemoryPlans: Array<{ id: string; name: string; description?: string; exercises: any; schedule?: any; createdBy: string; assignedTo: string[] }> = [];
let inMemoryPushTokens: Array<{ userId: string; token: string }> = [];
let nextClientId = 2; // Start at 2 since trainer is ID 1
let nextWorkoutId = 1;
let nextWorkoutExerciseId = 1;
let nextWorkoutSetId = 1;
let nextPlanId = 1;

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
        email VARCHAR(255),
        phone VARCHAR(50),
        role VARCHAR(20) DEFAULT 'client',
        join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        starter_password VARCHAR(255),
        password_changed BOOLEAN DEFAULT FALSE,
        total_workouts INTEGER DEFAULT 0,
        total_volume INTEGER DEFAULT 0,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        personal_records JSONB DEFAULT '{}'
      )
    `);

    // Fehlende Spalten nachträglich hinzufügen falls Tabelle schon existiert
    const addColumnIfNotExists = async (table: string, column: string, type: string) => {
      try {
        await pool!.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type}`);
      } catch { /* Spalte existiert bereits */ }
    };
    await addColumnIfNotExists('clients', 'email', 'VARCHAR(255)');
    await addColumnIfNotExists('clients', 'role', "VARCHAR(20) DEFAULT 'client'");
    await addColumnIfNotExists('clients', 'starter_password', 'VARCHAR(255)');
    await addColumnIfNotExists('clients', 'password_changed', 'BOOLEAN DEFAULT FALSE');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invitations (
        code VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Workout tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workouts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        date TIMESTAMP NOT NULL,
        duration INTEGER,
        completed BOOLEAN DEFAULT FALSE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id)
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS workout_exercises (
        id SERIAL PRIMARY KEY,
        workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
        exercise_id VARCHAR(255) NOT NULL,
        notes TEXT,
        sort_order INTEGER DEFAULT 0
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS workout_sets (
        id SERIAL PRIMARY KEY,
        workout_exercise_id INTEGER NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
        reps INTEGER NOT NULL DEFAULT 0,
        weight NUMERIC(10,2) NOT NULL DEFAULT 0,
        completed BOOLEAN DEFAULT FALSE,
        rest_time INTEGER,
        sort_order INTEGER DEFAULT 0
      )
    `);

    // Workout plans table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workout_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        exercises JSONB NOT NULL DEFAULT '[]',
        schedule JSONB,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS plan_assignments (
        id SERIAL PRIMARY KEY,
        plan_id INTEGER NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(plan_id, user_id)
      )
    `);

    // Push notification tokens
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(500) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `);

    console.log('[Storage] ✅ Database tables initialized (including workouts, plans, push tokens)');
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

// Shared helper: assembles flat JOIN rows into nested Workout structure
function assembleWorkoutsFromJoin(rows: any[]): StoredWorkout[] {
  const workoutMap = new Map<number, StoredWorkout>();
  const exerciseMap = new Map<number, StoredWorkoutExercise>();

  for (const row of rows) {
    if (!workoutMap.has(row.w_id)) {
      workoutMap.set(row.w_id, {
        id: row.w_id.toString(),
        name: row.w_name,
        date: row.w_date,
        duration: row.w_duration,
        completed: row.w_completed,
        userId: row.w_user_id.toString(),
        createdBy: row.w_created_by?.toString(),
        exercises: [],
      });
    }

    if (row.we_id && !exerciseMap.has(row.we_id)) {
      const exercise: StoredWorkoutExercise = {
        id: row.we_id.toString(),
        exerciseId: row.we_exercise_id,
        notes: row.we_notes,
        sets: [],
      };
      exerciseMap.set(row.we_id, exercise);
      workoutMap.get(row.w_id)!.exercises.push(exercise);
    }

    if (row.ws_id && row.we_id) {
      exerciseMap.get(row.we_id)!.sets.push({
        id: row.ws_id.toString(),
        reps: row.ws_reps,
        weight: parseFloat(row.ws_weight),
        completed: row.ws_completed,
        restTime: row.ws_rest_time,
      });
    }
  }

  return Array.from(workoutMap.values());
}

export const storage = {
  clients: {
    getAll: async (): Promise<StoredClient[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(`
            SELECT
              u.id::text,
              c.name,
              u.email,
              c.phone,
              u.role,
              c.join_date as "joinDate",
              c.starter_password as "starterPassword",
              u.password_changed as "passwordChanged",
              c.total_workouts as "totalWorkouts",
              c.total_volume as "totalVolume",
              c.current_streak as "currentStreak",
              c.longest_streak as "longestStreak",
              c.personal_records as "personalRecords"
            FROM users u
            LEFT JOIN clients c ON c.user_id = u.id
            ORDER BY u.created_at DESC
          `);

          const dbClients = result.rows.map(row => ({
            id: row.id,
            name: row.name || row.email.split('@')[0],
            email: row.email,
            phone: row.phone,
            role: row.role,
            joinDate: row.joinDate,
            starterPassword: row.starterPassword,
            passwordChanged: row.passwordChanged,
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
        const dbClient = await pool.connect();
        try {
          await dbClient.query('BEGIN');

          // 1. Users-Eintrag mit gehashtem Passwort erstellen
          const hashedPassword = await bcrypt.hash(client.starterPassword || 'TEMP123', 10);
          const userResult = await dbClient.query(
            `INSERT INTO users (email, password, role, password_changed)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [client.email, hashedPassword, client.role, client.passwordChanged]
          );
          const userId = userResult.rows[0].id;

          // 2. Clients-Eintrag mit user_id Referenz erstellen
          const clientResult = await dbClient.query(
            `INSERT INTO clients (
              user_id, name, email, phone, role, join_date, starter_password, password_changed,
              total_workouts, total_volume, current_streak, longest_streak, personal_records
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id::text`,
            [
              userId, client.name, client.email, client.phone, client.role,
              client.joinDate, client.starterPassword, client.passwordChanged,
              client.stats.totalWorkouts, client.stats.totalVolume,
              client.stats.currentStreak, client.stats.longestStreak,
              JSON.stringify(client.stats.personalRecords)
            ]
          );

          await dbClient.query('COMMIT');

          const newClient: StoredClient = {
            ...client,
            id: userId.toString(),
          };
          console.log('[Storage] Created user + client in DB:', newClient.id, 'email:', newClient.email);
          return newClient;
        } catch (err) {
          await dbClient.query('ROLLBACK');
          console.log('[Storage] ❌ DB client create failed:', err);
          throw err;
        } finally {
          dbClient.release();
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
          // users löschen -> CASCADE löscht clients, workouts, push_tokens automatisch
          const result = await pool.query('DELETE FROM users WHERE id = $1', [parseInt(id)]);
          const success = (result.rowCount ?? 0) > 0;
          console.log('[Storage] Deleted user + client from DB:', id, 'success:', success);
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

  workouts: {
    create: async (workout: {
      name: string;
      date: string;
      duration?: number;
      completed: boolean;
      userId: string;
      createdBy?: string;
      exercises: Array<{
        exerciseId: string;
        notes?: string;
        sets: Array<{
          reps: number;
          weight: number;
          completed: boolean;
          restTime?: number;
        }>;
      }>;
    }) => {
      if (useDatabase && pool) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          const workoutResult = await client.query(
            `INSERT INTO workouts (name, date, duration, completed, user_id, created_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, name, date, duration, completed, user_id as "userId", created_by as "createdBy", created_at as "createdAt"`,
            [workout.name, workout.date, workout.duration || null, workout.completed, parseInt(workout.userId), workout.createdBy ? parseInt(workout.createdBy) : null]
          );

          const workoutRow = workoutResult.rows[0];
          const exercises: StoredWorkoutExercise[] = [];

          for (let i = 0; i < workout.exercises.length; i++) {
            const ex = workout.exercises[i];
            const exResult = await client.query(
              `INSERT INTO workout_exercises (workout_id, exercise_id, notes, sort_order)
               VALUES ($1, $2, $3, $4)
               RETURNING id`,
              [workoutRow.id, ex.exerciseId, ex.notes || null, i]
            );

            const exId = exResult.rows[0].id;
            const sets: StoredWorkoutSet[] = [];

            for (let j = 0; j < ex.sets.length; j++) {
              const s = ex.sets[j];
              const setResult = await client.query(
                `INSERT INTO workout_sets (workout_exercise_id, reps, weight, completed, rest_time, sort_order)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id, reps, weight, completed, rest_time as "restTime"`,
                [exId, s.reps, s.weight, s.completed, s.restTime || null, j]
              );
              sets.push({ id: setResult.rows[0].id.toString(), ...setResult.rows[0] });
            }

            exercises.push({
              id: exId.toString(),
              exerciseId: ex.exerciseId,
              notes: ex.notes,
              sets,
            });
          }

          await client.query('COMMIT');
          console.log('[Storage] Created workout in DB:', workoutRow.id);

          return {
            id: workoutRow.id.toString(),
            name: workoutRow.name,
            date: workoutRow.date,
            duration: workoutRow.duration,
            completed: workoutRow.completed,
            userId: workoutRow.userId.toString(),
            createdBy: workoutRow.createdBy?.toString(),
            exercises,
          };
        } catch (err) {
          await client.query('ROLLBACK');
          console.log('[Storage] ❌ DB workout create failed:', err);
          throw err;
        } finally {
          client.release();
        }
      }

      // In-memory fallback
      const id = nextWorkoutId++;
      const memExercises: StoredWorkoutExercise[] = [];

      for (let i = 0; i < workout.exercises.length; i++) {
        const ex = workout.exercises[i];
        const exId = nextWorkoutExerciseId++;
        const sets = ex.sets.map((s, j) => {
          const setId = nextWorkoutSetId++;
          const memSet = { id: setId.toString(), reps: s.reps, weight: s.weight, completed: s.completed, restTime: s.restTime };
          inMemoryWorkoutSets.push({ ...memSet, workoutExerciseId: exId });
          return memSet;
        });
        const memEx = { id: exId.toString(), exerciseId: ex.exerciseId, notes: ex.notes, sets };
        inMemoryWorkoutExercises.push({ ...memEx, workoutId: id });
        memExercises.push(memEx);
      }

      const memWorkout = {
        id: id.toString(),
        name: workout.name,
        date: workout.date,
        duration: workout.duration,
        completed: workout.completed,
        userId: workout.userId,
        createdBy: workout.createdBy,
        exercises: memExercises,
      };
      inMemoryWorkouts.push(memWorkout);
      console.log('[Storage] Created workout in memory:', id);
      return memWorkout;
    },

    getByUserId: async (userId: string): Promise<StoredWorkout[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT w.id as w_id, w.name as w_name, w.date as w_date, w.duration as w_duration,
                    w.completed as w_completed, w.user_id as w_user_id, w.created_by as w_created_by,
                    we.id as we_id, we.exercise_id as we_exercise_id, we.notes as we_notes, we.sort_order as we_sort,
                    ws.id as ws_id, ws.reps as ws_reps, ws.weight as ws_weight,
                    ws.completed as ws_completed, ws.rest_time as ws_rest_time, ws.sort_order as ws_sort
             FROM workouts w
             LEFT JOIN workout_exercises we ON we.workout_id = w.id
             LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id
             WHERE w.user_id = $1
             ORDER BY w.date DESC, we.sort_order, ws.sort_order`,
            [parseInt(userId)]
          );
          const workouts = assembleWorkoutsFromJoin(result.rows);
          console.log('[Storage] Fetched', workouts.length, 'workouts for user', userId);
          return workouts;
        } catch (err) {
          console.log('[Storage] ❌ DB workout fetch failed:', err);
          throw err;
        }
      }

      return inMemoryWorkouts.filter(w => w.userId === userId);
    },

    getByTrainer: async (trainerId: string): Promise<StoredWorkout[]> => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT w.id as w_id, w.name as w_name, w.date as w_date, w.duration as w_duration,
                    w.completed as w_completed, w.user_id as w_user_id, w.created_by as w_created_by,
                    we.id as we_id, we.exercise_id as we_exercise_id, we.notes as we_notes, we.sort_order as we_sort,
                    ws.id as ws_id, ws.reps as ws_reps, ws.weight as ws_weight,
                    ws.completed as ws_completed, ws.rest_time as ws_rest_time, ws.sort_order as ws_sort
             FROM workouts w
             JOIN users u ON w.user_id = u.id
             LEFT JOIN workout_exercises we ON we.workout_id = w.id
             LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id
             WHERE u.role = 'client'
             ORDER BY w.date DESC, we.sort_order, ws.sort_order`
          );
          const workouts = assembleWorkoutsFromJoin(result.rows);
          console.log('[Storage] Trainer fetched', workouts.length, 'client workouts');
          return workouts;
        } catch (err) {
          console.log('[Storage] ❌ DB trainer workout fetch failed:', err);
          throw err;
        }
      }

      return inMemoryWorkouts.filter(w => w.userId !== trainerId);
    },
  },

  plans: {
    create: async (plan: { name: string; description?: string; exercises: any; schedule?: any; createdBy: string }) => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `INSERT INTO workout_plans (name, description, exercises, schedule, created_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, name, description, exercises, schedule, created_by as "createdBy", created_at as "createdAt"`,
            [plan.name, plan.description || null, JSON.stringify(plan.exercises), plan.schedule ? JSON.stringify(plan.schedule) : null, parseInt(plan.createdBy)]
          );
          const row = result.rows[0];
          console.log('[Storage] Created plan in DB:', row.id);
          return { id: row.id.toString(), name: row.name, description: row.description, exercises: row.exercises, schedule: row.schedule, createdBy: row.createdBy.toString(), assignedTo: [] as string[] };
        } catch (err) {
          console.log('[Storage] ❌ DB plan create failed:', err);
          throw err;
        }
      }
      const id = nextPlanId++;
      const memPlan = { id: id.toString(), ...plan, assignedTo: [] as string[] };
      inMemoryPlans.push(memPlan);
      return memPlan;
    },

    getByCreator: async (creatorId: string) => {
      if (useDatabase && pool) {
        try {
          const plansResult = await pool.query(
            `SELECT wp.id, wp.name, wp.description, wp.exercises, wp.schedule, wp.created_by as "createdBy",
                    COALESCE(json_agg(pa.user_id::text) FILTER (WHERE pa.user_id IS NOT NULL), '[]') as "assignedTo"
             FROM workout_plans wp
             LEFT JOIN plan_assignments pa ON pa.plan_id = wp.id
             WHERE wp.created_by = $1
             GROUP BY wp.id
             ORDER BY wp.created_at DESC`,
            [parseInt(creatorId)]
          );
          return plansResult.rows.map(r => ({
            id: r.id.toString(),
            name: r.name,
            description: r.description,
            exercises: r.exercises,
            schedule: r.schedule,
            createdBy: r.createdBy.toString(),
            assignedTo: r.assignedTo,
          }));
        } catch (err) {
          console.log('[Storage] ❌ DB plans fetch failed:', err);
          throw err;
        }
      }
      return inMemoryPlans.filter(p => p.createdBy === creatorId);
    },

    getAssignedToUser: async (userId: string) => {
      if (useDatabase && pool) {
        try {
          const result = await pool.query(
            `SELECT wp.id, wp.name, wp.description, wp.exercises, wp.schedule,
                    wp.created_by as "createdBy", pa.assigned_at as "assignedAt"
             FROM workout_plans wp
             JOIN plan_assignments pa ON pa.plan_id = wp.id
             WHERE pa.user_id = $1
             ORDER BY pa.assigned_at DESC`,
            [parseInt(userId)]
          );
          return result.rows.map(r => ({
            id: r.id.toString(),
            name: r.name,
            description: r.description,
            exercises: r.exercises,
            schedule: r.schedule,
            createdBy: r.createdBy.toString(),
            assignedTo: [userId],
          }));
        } catch (err) {
          console.log('[Storage] ❌ DB assigned plans fetch failed:', err);
          throw err;
        }
      }
      return inMemoryPlans.filter(p => p.assignedTo.includes(userId));
    },

    assign: async (planId: string, userId: string) => {
      if (useDatabase && pool) {
        try {
          await pool.query(
            `INSERT INTO plan_assignments (plan_id, user_id) VALUES ($1, $2) ON CONFLICT (plan_id, user_id) DO NOTHING`,
            [parseInt(planId), parseInt(userId)]
          );
          console.log('[Storage] Assigned plan', planId, 'to user', userId);
          return true;
        } catch (err) {
          console.log('[Storage] ❌ DB plan assign failed:', err);
          throw err;
        }
      }
      const plan = inMemoryPlans.find(p => p.id === planId);
      if (plan && !plan.assignedTo.includes(userId)) {
        plan.assignedTo.push(userId);
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
          console.log('[Storage] Saved push token for user', userId);
          return true;
        } catch (err) {
          console.log('[Storage] ❌ DB push token save failed:', err);
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
        } catch (err) {
          console.log('[Storage] ❌ DB push token fetch failed:', err);
          return null;
        }
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
        } catch (err) {
          console.log('[Storage] ❌ DB push tokens fetch failed:', err);
          return [];
        }
      }
      return inMemoryPushTokens.filter(t => userIds.includes(t.userId));
    },
  },
};

// Shared DB-Pool für Routen die direkte Queries brauchen
export function getPool(): Pool | null {
  return useDatabase ? pool : null;
}

export function isUsingDatabase(): boolean {
  return useDatabase;
}

export function getRawPool(): Pool | null {
  return pool;
}

// Export the debug function for potential use
export { logStorageState };