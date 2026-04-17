import { getRawPool, isUsingDatabase } from '../storage';

export type CourseInstanceStatus = 'scheduled' | 'cancelled' | 'completed';
export type BookingStatus = 'booked' | 'cancelled' | 'no_show';
export type CancelledBy = 'customer' | 'trainer' | 'admin' | 'system';

export interface Course {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  max_participants: number;
  trainer_id: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CourseSchedule {
  id: string;
  course_id: string;
  day_of_week: number;
  start_time: string; // HH:MM
  valid_from: string;
  valid_until: string | null;
  recurrence_weeks: 1 | 2; // 1 = jede Woche, 2 = alle zwei Wochen (Anker = valid_from)
}

export interface CourseInstance {
  id: string;
  course_id: string;
  schedule_id: string | null;
  date: string;
  start_time: string; // ISO
  end_time: string;
  status: CourseInstanceStatus;
  max_participants: number;
}

export interface Booking {
  id: string;
  instance_id: string;
  user_id: string;
  status: BookingStatus;
  booked_at: string;
  cancelled_at: string | null;
  cancelled_by: CancelledBy | null;
  no_show_marked_at: string | null;
  no_show_marked_by: string | null;
  reminder_sent_at: string | null;
}

export interface UserPenalty {
  user_id: string;
  no_show_count: number;
  is_blocked: boolean;
  blocked_at: string | null;
  unblocked_at: string | null;
  unblocked_by: string | null;
}

export interface WaitlistEntry {
  id: string;
  instance_id: string;
  user_id: string;
  joined_at: string;
  last_notified_at: string | null;
}

// ---- In-Memory-Fallback ----
const mem = {
  courses: [] as Course[],
  schedules: [] as CourseSchedule[],
  instances: [] as CourseInstance[],
  bookings: [] as Booking[],
  penalties: [] as UserPenalty[],
  waitlist: [] as WaitlistEntry[],
  counters: { course: 1, schedule: 1, instance: 1, booking: 1, waitlist: 1 },
};

const now = () => new Date().toISOString();

function needDb() {
  const pool = getRawPool();
  if (!isUsingDatabase() || !pool) return null;
  return pool;
}

// ---- DB Init ----
export async function initCourseTables() {
  const pool = getRawPool();
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        duration_minutes INTEGER NOT NULL,
        max_participants INTEGER NOT NULL,
        trainer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_schedules (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        day_of_week SMALLINT NOT NULL,
        start_time TIME NOT NULL,
        valid_from DATE NOT NULL,
        valid_until DATE,
        recurrence_weeks SMALLINT NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      ALTER TABLE course_schedules
      ADD COLUMN IF NOT EXISTS recurrence_weeks SMALLINT NOT NULL DEFAULT 1
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_instances (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        schedule_id INTEGER REFERENCES course_schedules(id) ON DELETE SET NULL,
        date DATE NOT NULL,
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
        max_participants INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(course_id, start_time)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        instance_id INTEGER NOT NULL REFERENCES course_instances(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'booked',
        booked_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        cancelled_at TIMESTAMPTZ,
        cancelled_by VARCHAR(20),
        no_show_marked_at TIMESTAMPTZ,
        no_show_marked_by INTEGER REFERENCES users(id),
        reminder_sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(instance_id, user_id)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_penalties (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        no_show_count INTEGER NOT NULL DEFAULT 0,
        is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
        blocked_at TIMESTAMPTZ,
        unblocked_at TIMESTAMPTZ,
        unblocked_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS waitlist_entries (
        id SERIAL PRIMARY KEY,
        instance_id INTEGER NOT NULL REFERENCES course_instances(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        last_notified_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(instance_id, user_id)
      )
    `);
    // Migration: altes notified_at → last_notified_at
    await pool.query(`ALTER TABLE waitlist_entries ADD COLUMN IF NOT EXISTS last_notified_at TIMESTAMPTZ`).catch(() => {});
    await pool.query(`UPDATE waitlist_entries SET last_notified_at = notified_at
                      WHERE last_notified_at IS NULL AND notified_at IS NOT NULL`).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_instances_start ON course_instances(start_time)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_instance ON bookings(instance_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id)`);
    console.log('[Courses] ✅ Course tables initialized');
  } catch (err) {
    console.log('[Courses] ❌ Course table init failed:', err);
  }
}

// ---- Helpers ----
function buildUpdate(patch: Record<string, any>, allowed: readonly string[]): { fields: string[]; values: any[] } {
  const fields: string[] = []; const values: any[] = [];
  for (const key of allowed) {
    if (key in patch && patch[key] !== undefined) {
      fields.push(`${key}=$${values.length + 1}`);
      values.push(patch[key]);
    }
  }
  return { fields, values };
}

// pg driver liefert DATE / TIMESTAMPTZ als Date-Objekt. Superjson reicht das 1:1
// an den Client durch — ein Date in <Text>{date}</Text> crasht React (#31).
// Daher alle Datums-Felder hier auf Strings normalisieren.
function toIso(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  return typeof v === 'string' ? v : String(v);
}
function toDateOnly(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'string') return v.length >= 10 ? v.slice(0, 10) : v;
  return String(v);
}

function mapCourseRow(r: any): Course {
  return {
    id: String(r.id), name: r.name, description: r.description,
    duration_minutes: r.duration_minutes, max_participants: r.max_participants,
    trainer_id: String(r.trainer_id), category: r.category,
    is_active: r.is_active, created_at: toIso(r.created_at)!, updated_at: toIso(r.updated_at)!,
  };
}
function mapScheduleRow(r: any): CourseSchedule {
  const rec = Number(r.recurrence_weeks);
  return { id: String(r.id), course_id: String(r.course_id), day_of_week: r.day_of_week,
    start_time: typeof r.start_time === 'string' ? r.start_time.slice(0, 5) : r.start_time,
    valid_from: toDateOnly(r.valid_from)!, valid_until: toDateOnly(r.valid_until),
    recurrence_weeks: rec === 2 ? 2 : 1 };
}
function mapInstanceRow(r: any): CourseInstance {
  return { id: String(r.id), course_id: String(r.course_id), schedule_id: r.schedule_id ? String(r.schedule_id) : null,
    date: toDateOnly(r.date)!, start_time: toIso(r.start_time)!, end_time: toIso(r.end_time)!,
    status: r.status, max_participants: r.max_participants };
}
function mapBookingRow(r: any): Booking {
  return { id: String(r.id), instance_id: String(r.instance_id), user_id: String(r.user_id),
    status: r.status, booked_at: toIso(r.booked_at)!, cancelled_at: toIso(r.cancelled_at), cancelled_by: r.cancelled_by,
    no_show_marked_at: toIso(r.no_show_marked_at), no_show_marked_by: r.no_show_marked_by ? String(r.no_show_marked_by) : null,
    reminder_sent_at: toIso(r.reminder_sent_at) };
}
function mapPenaltyRow(r: any): UserPenalty {
  return { user_id: String(r.user_id), no_show_count: r.no_show_count, is_blocked: r.is_blocked,
    blocked_at: toIso(r.blocked_at), unblocked_at: toIso(r.unblocked_at),
    unblocked_by: r.unblocked_by ? String(r.unblocked_by) : null };
}
function mapWaitlistRow(r: any): WaitlistEntry {
  return { id: String(r.id), instance_id: String(r.instance_id), user_id: String(r.user_id),
    joined_at: toIso(r.joined_at)!, last_notified_at: toIso(r.last_notified_at ?? r.notified_at) };
}

// ---- Courses ----
export const coursesStore = {
  async list(onlyActive = false): Promise<Course[]> {
    const pool = needDb();
    if (pool) {
      const r = await pool.query(`SELECT * FROM courses ${onlyActive ? 'WHERE is_active = TRUE' : ''} ORDER BY name`);
      return r.rows.map(mapCourseRow);
    }
    return onlyActive ? mem.courses.filter(c => c.is_active) : [...mem.courses];
  },
  async getById(id: string): Promise<Course | null> {
    const pool = needDb();
    if (pool) {
      const r = await pool.query('SELECT * FROM courses WHERE id=$1', [parseInt(id)]);
      return r.rows[0] ? mapCourseRow(r.rows[0]) : null;
    }
    return mem.courses.find(c => c.id === id) || null;
  },
  async create(data: Omit<Course, 'id' | 'created_at' | 'updated_at'>): Promise<Course> {
    const pool = needDb();
    if (pool) {
      const r = await pool.query(
        `INSERT INTO courses (name, description, duration_minutes, max_participants, trainer_id, category, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [data.name, data.description, data.duration_minutes, data.max_participants,
         parseInt(data.trainer_id), data.category, data.is_active]
      );
      return mapCourseRow(r.rows[0]);
    }
    const c: Course = { ...data, id: String(mem.counters.course++), created_at: now(), updated_at: now() };
    mem.courses.push(c); return c;
  },
  async update(id: string, patch: Partial<Omit<Course, 'id'>>): Promise<Course | null> {
    const pool = needDb();
    if (pool) {
      const allowed = ['name', 'description', 'duration_minutes', 'max_participants', 'trainer_id', 'category', 'is_active'] as const;
      const normalized = { ...patch, trainer_id: patch.trainer_id ? parseInt(patch.trainer_id as any) : patch.trainer_id } as any;
      const { fields, values } = buildUpdate(normalized, allowed);
      if (!fields.length) return this.getById(id);
      fields.push(`updated_at=NOW()`); values.push(parseInt(id));
      const r = await pool.query(`UPDATE courses SET ${fields.join(',')} WHERE id=$${values.length} RETURNING *`, values);
      return r.rows[0] ? mapCourseRow(r.rows[0]) : null;
    }
    const idx = mem.courses.findIndex(c => c.id === id);
    if (idx < 0) return null;
    mem.courses[idx] = { ...mem.courses[idx], ...patch, updated_at: now() };
    return mem.courses[idx];
  },
};

// ---- Schedules ----
export const schedulesStore = {
  async listByCourse(courseId: string): Promise<CourseSchedule[]> {
    const pool = needDb();
    if (pool) {
      const r = await pool.query('SELECT * FROM course_schedules WHERE course_id=$1 ORDER BY day_of_week, start_time', [parseInt(courseId)]);
      return r.rows.map(mapScheduleRow);
    }
    return mem.schedules.filter(s => s.course_id === courseId);
  },
  async listAllActive(): Promise<CourseSchedule[]> {
    const pool = needDb();
    if (pool) {
      const r = await pool.query(`SELECT * FROM course_schedules WHERE valid_until IS NULL OR valid_until >= CURRENT_DATE`);
      return r.rows.map(mapScheduleRow);
    }
    const today = new Date().toISOString().slice(0, 10);
    return mem.schedules.filter(s => !s.valid_until || s.valid_until >= today);
  },
  async create(data: Omit<CourseSchedule, 'id'>): Promise<CourseSchedule> {
    const pool = needDb();
    const rec = data.recurrence_weeks === 2 ? 2 : 1;
    if (pool) {
      const r = await pool.query(
        `INSERT INTO course_schedules (course_id, day_of_week, start_time, valid_from, valid_until, recurrence_weeks)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [parseInt(data.course_id), data.day_of_week, data.start_time, data.valid_from, data.valid_until, rec]
      );
      return mapScheduleRow(r.rows[0]);
    }
    const s: CourseSchedule = { ...data, id: String(mem.counters.schedule++), recurrence_weeks: rec };
    mem.schedules.push(s); return s;
  },
  async update(id: string, patch: Partial<Omit<CourseSchedule, 'id'>>): Promise<CourseSchedule | null> {
    const pool = needDb();
    if (pool) {
      const allowed = ['day_of_week', 'start_time', 'valid_from', 'valid_until', 'recurrence_weeks'] as const;
      const { fields, values } = buildUpdate(patch, allowed);
      if (!fields.length) return null;
      fields.push(`updated_at=NOW()`); values.push(parseInt(id));
      const r = await pool.query(`UPDATE course_schedules SET ${fields.join(',')} WHERE id=$${values.length} RETURNING *`, values);
      return r.rows[0] ? mapScheduleRow(r.rows[0]) : null;
    }
    const idx = mem.schedules.findIndex(s => s.id === id);
    if (idx < 0) return null;
    mem.schedules[idx] = { ...mem.schedules[idx], ...patch };
    return mem.schedules[idx];
  },
  async delete(id: string): Promise<boolean> {
    const pool = needDb();
    if (pool) {
      const r = await pool.query('DELETE FROM course_schedules WHERE id=$1', [parseInt(id)]);
      return (r.rowCount ?? 0) > 0;
    }
    const before = mem.schedules.length;
    mem.schedules = mem.schedules.filter(s => s.id !== id);
    return mem.schedules.length < before;
  },
};

// ---- Instances ----
export const instancesStore = {
  async getById(id: string): Promise<CourseInstance | null> {
    const pool = needDb();
    if (pool) {
      const r = await pool.query('SELECT * FROM course_instances WHERE id=$1', [parseInt(id)]);
      return r.rows[0] ? mapInstanceRow(r.rows[0]) : null;
    }
    return mem.instances.find(i => i.id === id) || null;
  },
  async listInRange(from: Date, to: Date, opts?: { trainerId?: string }): Promise<(CourseInstance & { course: Course })[]> {
    const pool = needDb();
    if (pool) {
      const params: any[] = [from.toISOString(), to.toISOString()];
      let where = `ci.start_time >= $1 AND ci.start_time <= $2`;
      if (opts?.trainerId) { params.push(parseInt(opts.trainerId)); where += ` AND c.trainer_id = $${params.length}`; }
      const r = await pool.query(
        `SELECT ci.*, c.id as c_id, c.name as c_name, c.description as c_description,
                c.duration_minutes as c_duration_minutes, c.max_participants as c_max_participants,
                c.trainer_id as c_trainer_id, c.category as c_category, c.is_active as c_is_active,
                c.created_at as c_created_at, c.updated_at as c_updated_at
         FROM course_instances ci
         JOIN courses c ON c.id = ci.course_id
         WHERE ${where} ORDER BY ci.start_time`, params);
      return r.rows.map(row => ({
        ...mapInstanceRow(row),
        course: mapCourseRow({ id: row.c_id, name: row.c_name, description: row.c_description,
          duration_minutes: row.c_duration_minutes, max_participants: row.c_max_participants,
          trainer_id: row.c_trainer_id, category: row.c_category, is_active: row.c_is_active,
          created_at: row.c_created_at, updated_at: row.c_updated_at }),
      }));
    }
    return mem.instances.filter(i => {
      const t = new Date(i.start_time).getTime();
      if (t < from.getTime() || t > to.getTime()) return false;
      const c = mem.courses.find(cc => cc.id === i.course_id);
      if (!c) return false;
      if (opts?.trainerId && c.trainer_id !== opts.trainerId) return false;
      return true;
    }).map(i => ({ ...i, course: mem.courses.find(c => c.id === i.course_id)! }));
  },
  async listByCourse(courseId: string): Promise<CourseInstance[]> {
    const pool = needDb();
    if (pool) {
      const r = await pool.query('SELECT * FROM course_instances WHERE course_id=$1 ORDER BY start_time', [parseInt(courseId)]);
      return r.rows.map(mapInstanceRow);
    }
    return mem.instances.filter(i => i.course_id === courseId);
  },
  async listByScheduleId(scheduleId: string): Promise<CourseInstance[]> {
    const pool = needDb();
    if (pool) {
      const r = await pool.query('SELECT * FROM course_instances WHERE schedule_id=$1', [parseInt(scheduleId)]);
      return r.rows.map(mapInstanceRow);
    }
    return mem.instances.filter(i => i.schedule_id === scheduleId);
  },
  async create(data: Omit<CourseInstance, 'id'>): Promise<CourseInstance> {
    const pool = needDb();
    if (pool) {
      const r = await pool.query(
        `INSERT INTO course_instances (course_id, schedule_id, date, start_time, end_time, status, max_participants)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [parseInt(data.course_id), data.schedule_id ? parseInt(data.schedule_id) : null,
         data.date, data.start_time, data.end_time, data.status, data.max_participants]
      );
      return mapInstanceRow(r.rows[0]);
    }
    const i: CourseInstance = { ...data, id: String(mem.counters.instance++) };
    mem.instances.push(i); return i;
  },
  async createIfNotExists(data: Omit<CourseInstance, 'id'>): Promise<CourseInstance | null> {
    const pool = needDb();
    if (pool) {
      const r = await pool.query(
        `INSERT INTO course_instances (course_id, schedule_id, date, start_time, end_time, status, max_participants)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (course_id, start_time) DO NOTHING RETURNING *`,
        [parseInt(data.course_id), data.schedule_id ? parseInt(data.schedule_id) : null,
         data.date, data.start_time, data.end_time, data.status, data.max_participants]
      );
      return r.rows[0] ? mapInstanceRow(r.rows[0]) : null;
    }
    const existing = mem.instances.find(i => i.course_id === data.course_id && i.start_time === data.start_time);
    if (existing) return null;
    return this.create(data);
  },
  async update(id: string, patch: Partial<Omit<CourseInstance, 'id'>>): Promise<CourseInstance | null> {
    const pool = needDb();
    if (pool) {
      const allowed = ['course_id', 'schedule_id', 'date', 'start_time', 'end_time', 'status', 'max_participants'] as const;
      const { fields, values } = buildUpdate(patch, allowed);
      if (!fields.length) return null;
      fields.push(`updated_at=NOW()`); values.push(parseInt(id));
      const r = await pool.query(`UPDATE course_instances SET ${fields.join(',')} WHERE id=$${values.length} RETURNING *`, values);
      return r.rows[0] ? mapInstanceRow(r.rows[0]) : null;
    }
    const idx = mem.instances.findIndex(x => x.id === id);
    if (idx < 0) return null;
    mem.instances[idx] = { ...mem.instances[idx], ...patch };
    return mem.instances[idx];
  },
  async delete(id: string): Promise<boolean> {
    const pool = needDb();
    if (pool) {
      const r = await pool.query('DELETE FROM course_instances WHERE id=$1', [parseInt(id)]);
      return (r.rowCount ?? 0) > 0;
    }
    const before = mem.instances.length;
    mem.instances = mem.instances.filter(i => i.id !== id);
    mem.bookings = mem.bookings.filter(b => b.instance_id !== id);
    mem.waitlist = mem.waitlist.filter(w => w.instance_id !== id);
    return mem.instances.length < before;
  },
  async remindersDue(): Promise<Array<{ booking: Booking; instance: CourseInstance; course: Course }>> {
    const pool = needDb();
    // Fenster: Kursstart zwischen "jetzt" und "jetzt + 70 min".
    // Reminder_sent_at ist idempotent, daher darf das Fenster großzügig sein — fängt Cron-Drift ab.
    const winStart = new Date(Date.now());
    const winEnd = new Date(Date.now() + 70 * 60 * 1000);
    if (pool) {
      const r = await pool.query(
        `SELECT
           b.id as b_id, b.instance_id as b_instance_id, b.user_id as b_user_id, b.status as b_status,
           b.booked_at as b_booked_at, b.cancelled_at as b_cancelled_at, b.cancelled_by as b_cancelled_by,
           b.no_show_marked_at as b_no_show_marked_at, b.no_show_marked_by as b_no_show_marked_by,
           b.reminder_sent_at as b_reminder_sent_at,
           ci.id as ci_id, ci.course_id as ci_course_id, ci.schedule_id as ci_schedule_id,
           ci.date as ci_date, ci.start_time as ci_start_time, ci.end_time as ci_end_time,
           ci.status as ci_status, ci.max_participants as ci_max_participants,
           c.id as c_id, c.name as c_name, c.description as c_description,
           c.duration_minutes as c_duration_minutes, c.max_participants as c_max_participants,
           c.trainer_id as c_trainer_id, c.category as c_category, c.is_active as c_is_active,
           c.created_at as c_created_at, c.updated_at as c_updated_at
         FROM bookings b
         JOIN course_instances ci ON ci.id = b.instance_id
         JOIN courses c ON c.id = ci.course_id
         WHERE b.status='booked' AND b.reminder_sent_at IS NULL
           AND ci.status='scheduled'
           AND ci.start_time BETWEEN $1 AND $2`,
        [winStart.toISOString(), winEnd.toISOString()]
      );
      return r.rows.map(row => ({
        booking: mapBookingRow({ id: row.b_id, instance_id: row.b_instance_id, user_id: row.b_user_id,
          status: row.b_status, booked_at: row.b_booked_at, cancelled_at: row.b_cancelled_at,
          cancelled_by: row.b_cancelled_by, no_show_marked_at: row.b_no_show_marked_at,
          no_show_marked_by: row.b_no_show_marked_by, reminder_sent_at: row.b_reminder_sent_at }),
        instance: mapInstanceRow({ id: row.ci_id, course_id: row.ci_course_id, schedule_id: row.ci_schedule_id,
          date: row.ci_date, start_time: row.ci_start_time, end_time: row.ci_end_time,
          status: row.ci_status, max_participants: row.ci_max_participants }),
        course: mapCourseRow({ id: row.c_id, name: row.c_name, description: row.c_description,
          duration_minutes: row.c_duration_minutes, max_participants: row.c_max_participants,
          trainer_id: row.c_trainer_id, category: row.c_category, is_active: row.c_is_active,
          created_at: row.c_created_at, updated_at: row.c_updated_at }),
      }));
    }
    const result: Array<{ booking: Booking; instance: CourseInstance; course: Course }> = [];
    for (const b of mem.bookings) {
      if (b.status !== 'booked' || b.reminder_sent_at) continue;
      const inst = mem.instances.find(i => i.id === b.instance_id);
      if (!inst || inst.status !== 'scheduled') continue;
      const t = new Date(inst.start_time).getTime();
      if (t < winStart.getTime() || t > winEnd.getTime()) continue;
      const course = mem.courses.find(c => c.id === inst.course_id);
      if (course) result.push({ booking: b, instance: inst, course });
    }
    return result;
  },
};

// ---- Bookings ----
export const bookingsStore = {
  async getById(id: string): Promise<Booking | null> {
    const pool = needDb();
    if (pool) {
      const r = await pool.query('SELECT * FROM bookings WHERE id=$1', [parseInt(id)]);
      return r.rows[0] ? mapBookingRow(r.rows[0]) : null;
    }
    return mem.bookings.find(b => b.id === id) || null;
  },
  async listByInstance(instanceId: string): Promise<Booking[]> {
    const pool = needDb();
    if (pool) {
      const r = await pool.query('SELECT * FROM bookings WHERE instance_id=$1 ORDER BY booked_at', [parseInt(instanceId)]);
      return r.rows.map(mapBookingRow);
    }
    return mem.bookings.filter(b => b.instance_id === instanceId);
  },
  async listByUser(userId: string, onlyActive = false): Promise<Booking[]> {
    const pool = needDb();
    if (pool) {
      const where = onlyActive ? `AND status='booked'` : '';
      const r = await pool.query(`SELECT * FROM bookings WHERE user_id=$1 ${where} ORDER BY booked_at DESC`, [parseInt(userId)]);
      return r.rows.map(mapBookingRow);
    }
    return mem.bookings.filter(b => b.user_id === userId && (!onlyActive || b.status === 'booked'));
  },
  async countBookedForInstance(instanceId: string): Promise<number> {
    const pool = needDb();
    if (pool) {
      const r = await pool.query(`SELECT COUNT(*)::int as c FROM bookings WHERE instance_id=$1 AND status='booked'`, [parseInt(instanceId)]);
      return r.rows[0].c;
    }
    return mem.bookings.filter(b => b.instance_id === instanceId && b.status === 'booked').length;
  },
  async findActive(instanceId: string, userId: string): Promise<Booking | null> {
    const pool = needDb();
    if (pool) {
      const r = await pool.query(`SELECT * FROM bookings WHERE instance_id=$1 AND user_id=$2 AND status='booked'`,
        [parseInt(instanceId), parseInt(userId)]);
      return r.rows[0] ? mapBookingRow(r.rows[0]) : null;
    }
    return mem.bookings.find(b => b.instance_id === instanceId && b.user_id === userId && b.status === 'booked') || null;
  },
  async update(id: string, patch: Partial<Booking>): Promise<Booking | null> {
    const pool = needDb();
    if (pool) {
      const allowed = ['status', 'cancelled_at', 'cancelled_by', 'no_show_marked_at', 'no_show_marked_by', 'reminder_sent_at'] as const;
      const normalized = {
        ...patch,
        no_show_marked_by: patch.no_show_marked_by ? parseInt(patch.no_show_marked_by as any) : patch.no_show_marked_by,
      } as any;
      const { fields, values } = buildUpdate(normalized, allowed);
      if (!fields.length) return null;
      fields.push(`updated_at=NOW()`); values.push(parseInt(id));
      const r = await pool.query(`UPDATE bookings SET ${fields.join(',')} WHERE id=$${values.length} RETURNING *`, values);
      return r.rows[0] ? mapBookingRow(r.rows[0]) : null;
    }
    const idx = mem.bookings.findIndex(b => b.id === id);
    if (idx < 0) return null;
    mem.bookings[idx] = { ...mem.bookings[idx], ...patch };
    return mem.bookings[idx];
  },
  async markReminderSent(id: string): Promise<void> {
    const pool = needDb();
    if (pool) {
      await pool.query(`UPDATE bookings SET reminder_sent_at=NOW() WHERE id=$1`, [parseInt(id)]);
      return;
    }
    const b = mem.bookings.find(x => x.id === id);
    if (b) b.reminder_sent_at = now();
  },
  async listAllForLog(instanceId: string): Promise<Booking[]> {
    return this.listByInstance(instanceId);
  },
};

// ---- Penalties ----
export const penaltiesStore = {
  async getOrCreate(userId: string): Promise<UserPenalty> {
    const pool = needDb();
    if (pool) {
      const r = await pool.query('SELECT * FROM user_penalties WHERE user_id=$1', [parseInt(userId)]);
      if (r.rows[0]) return mapPenaltyRow(r.rows[0]);
      const ins = await pool.query(
        `INSERT INTO user_penalties (user_id) VALUES ($1) ON CONFLICT (user_id) DO UPDATE SET user_id=EXCLUDED.user_id RETURNING *`,
        [parseInt(userId)]
      );
      return mapPenaltyRow(ins.rows[0]);
    }
    let p = mem.penalties.find(p => p.user_id === userId);
    if (!p) { p = { user_id: userId, no_show_count: 0, is_blocked: false, blocked_at: null, unblocked_at: null, unblocked_by: null }; mem.penalties.push(p); }
    return p;
  },
  async list(): Promise<Array<UserPenalty & { user_email: string; user_name: string }>> {
    const pool = needDb();
    if (pool) {
      const r = await pool.query(`
        SELECT p.*, u.email as user_email, COALESCE(u.name, u.email) as user_name
        FROM user_penalties p
        JOIN users u ON u.id = p.user_id
        ORDER BY p.is_blocked DESC, p.no_show_count DESC`);
      return r.rows.map(row => ({ ...mapPenaltyRow(row), user_email: row.user_email, user_name: row.user_name }));
    }
    return mem.penalties.map(p => ({ ...p, user_email: '', user_name: p.user_id }));
  },
  async incrementNoShow(userId: string, limit: number): Promise<UserPenalty> {
    const pool = needDb();
    if (pool) {
      const r = await pool.query(
        `INSERT INTO user_penalties (user_id, no_show_count)
         VALUES ($1, 1)
         ON CONFLICT (user_id) DO UPDATE SET
           no_show_count = user_penalties.no_show_count + 1,
           is_blocked = CASE WHEN user_penalties.no_show_count + 1 >= $2 THEN TRUE ELSE user_penalties.is_blocked END,
           blocked_at = CASE WHEN user_penalties.no_show_count + 1 >= $2 AND NOT user_penalties.is_blocked THEN NOW() ELSE user_penalties.blocked_at END,
           updated_at = NOW()
         RETURNING *`,
        [parseInt(userId), limit]
      );
      return mapPenaltyRow(r.rows[0]);
    }
    const p = await this.getOrCreate(userId);
    p.no_show_count += 1;
    if (p.no_show_count >= limit && !p.is_blocked) { p.is_blocked = true; p.blocked_at = now(); }
    return p;
  },
  async reset(userId: string, byUserId: string): Promise<UserPenalty | null> {
    const pool = needDb();
    if (pool) {
      const r = await pool.query(
        `UPDATE user_penalties SET no_show_count=0, is_blocked=FALSE, unblocked_at=NOW(), unblocked_by=$2, updated_at=NOW()
         WHERE user_id=$1 RETURNING *`,
        [parseInt(userId), parseInt(byUserId)]
      );
      return r.rows[0] ? mapPenaltyRow(r.rows[0]) : null;
    }
    const p = mem.penalties.find(p => p.user_id === userId);
    if (!p) return null;
    p.no_show_count = 0; p.is_blocked = false; p.unblocked_at = now(); p.unblocked_by = byUserId;
    return p;
  },
};

// ---- Waitlist ----
export const waitlistStore = {
  async listByInstance(instanceId: string): Promise<WaitlistEntry[]> {
    const pool = needDb();
    if (pool) {
      const r = await pool.query('SELECT * FROM waitlist_entries WHERE instance_id=$1 ORDER BY joined_at', [parseInt(instanceId)]);
      return r.rows.map(mapWaitlistRow);
    }
    return mem.waitlist.filter(w => w.instance_id === instanceId);
  },
  async listByUser(userId: string): Promise<WaitlistEntry[]> {
    const pool = needDb();
    if (pool) {
      const r = await pool.query('SELECT * FROM waitlist_entries WHERE user_id=$1 ORDER BY joined_at DESC', [parseInt(userId)]);
      return r.rows.map(mapWaitlistRow);
    }
    return mem.waitlist.filter(w => w.user_id === userId);
  },
  async find(instanceId: string, userId: string): Promise<WaitlistEntry | null> {
    const pool = needDb();
    if (pool) {
      const r = await pool.query('SELECT * FROM waitlist_entries WHERE instance_id=$1 AND user_id=$2',
        [parseInt(instanceId), parseInt(userId)]);
      return r.rows[0] ? mapWaitlistRow(r.rows[0]) : null;
    }
    return mem.waitlist.find(w => w.instance_id === instanceId && w.user_id === userId) || null;
  },
  async create(instanceId: string, userId: string): Promise<WaitlistEntry> {
    const pool = needDb();
    if (pool) {
      const r = await pool.query(
        `INSERT INTO waitlist_entries (instance_id, user_id) VALUES ($1,$2)
         ON CONFLICT (instance_id, user_id) DO UPDATE SET updated_at=NOW() RETURNING *`,
        [parseInt(instanceId), parseInt(userId)]
      );
      return mapWaitlistRow(r.rows[0]);
    }
    const existing = mem.waitlist.find(w => w.instance_id === instanceId && w.user_id === userId);
    if (existing) return existing;
    const w: WaitlistEntry = { id: String(mem.counters.waitlist++), instance_id: instanceId, user_id: userId, joined_at: now(), last_notified_at: null };
    mem.waitlist.push(w); return w;
  },
  async delete(instanceId: string, userId: string): Promise<boolean> {
    const pool = needDb();
    if (pool) {
      const r = await pool.query('DELETE FROM waitlist_entries WHERE instance_id=$1 AND user_id=$2',
        [parseInt(instanceId), parseInt(userId)]);
      return (r.rowCount ?? 0) > 0;
    }
    const before = mem.waitlist.length;
    mem.waitlist = mem.waitlist.filter(w => !(w.instance_id === instanceId && w.user_id === userId));
    return mem.waitlist.length < before;
  },
  async deleteAllForInstance(instanceId: string): Promise<void> {
    const pool = needDb();
    if (pool) { await pool.query('DELETE FROM waitlist_entries WHERE instance_id=$1', [parseInt(instanceId)]); return; }
    mem.waitlist = mem.waitlist.filter(w => w.instance_id !== instanceId);
  },
  async markNotified(id: string): Promise<void> {
    const pool = needDb();
    if (pool) { await pool.query('UPDATE waitlist_entries SET last_notified_at=NOW() WHERE id=$1', [parseInt(id)]); return; }
    const w = mem.waitlist.find(w => w.id === id);
    if (w) w.last_notified_at = now();
  },
};

// ---- Booking with race-condition safety ----
export async function bookWithLock(instanceId: string, userId: string): Promise<{ ok: true; booking: Booking } | { ok: false; reason: 'full' | 'already_booked' }> {
  const pool = needDb();
  if (pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const instR = await client.query('SELECT id, max_participants, status FROM course_instances WHERE id=$1 FOR UPDATE', [parseInt(instanceId)]);
      if (!instR.rows[0] || instR.rows[0].status !== 'scheduled') {
        await client.query('ROLLBACK'); return { ok: false, reason: 'full' };
      }
      // Sperre evtl. vorhandenen (cancelled/no_show) Record des Users, damit paralleles Re-Booking nicht überbucht.
      const existingR = await client.query(
        `SELECT id, status FROM bookings WHERE instance_id=$1 AND user_id=$2 FOR UPDATE`,
        [parseInt(instanceId), parseInt(userId)]
      );
      if (existingR.rows[0]?.status === 'booked') {
        await client.query('ROLLBACK'); return { ok: false, reason: 'already_booked' };
      }
      const cntR = await client.query(`SELECT COUNT(*)::int as c FROM bookings WHERE instance_id=$1 AND status='booked'`, [parseInt(instanceId)]);
      const booked = cntR.rows[0].c;
      const max = instR.rows[0].max_participants;
      // existing (inaktiv) wird durch ON CONFLICT zu 'booked' — muss in die Kapazitätsprüfung
      const projected = booked + 1;
      if (projected > max) {
        await client.query('ROLLBACK'); return { ok: false, reason: 'full' };
      }
      const ins = await client.query(
        `INSERT INTO bookings (instance_id, user_id, status, booked_at) VALUES ($1,$2,'booked',NOW())
         ON CONFLICT (instance_id, user_id) DO UPDATE SET status='booked', booked_at=NOW(),
         cancelled_at=NULL, cancelled_by=NULL, reminder_sent_at=NULL,
         no_show_marked_at=NULL, no_show_marked_by=NULL, updated_at=NOW()
         RETURNING *`,
        [parseInt(instanceId), parseInt(userId)]
      );
      await client.query('COMMIT');
      return { ok: true, booking: mapBookingRow(ins.rows[0]) };
    } catch (err) {
      await client.query('ROLLBACK'); throw err;
    } finally { client.release(); }
  }
  // in-memory (single-threaded)
  const inst = mem.instances.find(i => i.id === instanceId);
  if (!inst || inst.status !== 'scheduled') return { ok: false, reason: 'full' };
  const active = mem.bookings.filter(b => b.instance_id === instanceId && b.status === 'booked');
  if (active.length >= inst.max_participants) return { ok: false, reason: 'full' };
  if (active.find(b => b.user_id === userId)) return { ok: false, reason: 'already_booked' };
  const existing = mem.bookings.find(b => b.instance_id === instanceId && b.user_id === userId);
  if (existing) {
    existing.status = 'booked'; existing.booked_at = now();
    existing.cancelled_at = null; existing.cancelled_by = null;
    existing.reminder_sent_at = null; existing.no_show_marked_at = null; existing.no_show_marked_by = null;
    return { ok: true, booking: existing };
  }
  const b: Booking = { id: String(mem.counters.booking++), instance_id: instanceId, user_id: userId, status: 'booked',
    booked_at: now(), cancelled_at: null, cancelled_by: null, no_show_marked_at: null, no_show_marked_by: null, reminder_sent_at: null };
  mem.bookings.push(b);
  return { ok: true, booking: b };
}
