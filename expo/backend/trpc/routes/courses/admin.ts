import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../create-context';
import {
  coursesStore, schedulesStore, instancesStore, bookingsStore, penaltiesStore, waitlistStore,
} from '../../../courses/storage';
import { generateUpcomingInstances } from '../../../courses/generate';
import { notifyWaitlistIfSpotFree } from '../../../courses/waitlist';
import { sendPushToUsers, sendPushToUser } from '../../../push/send';
import { formatDateTimeDe, berlinLocalToUtcIso } from '../../../courses/rules';
import { cancelInstanceAsSystem } from '../../../courses/actions';
import { getPool } from '../../../storage';

function requireTrainer(role: string) {
  if (role !== 'trainer' && role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Nur Trainer/Admin.' });
  }
}

// ---- Courses ----
export const createCourse = protectedProcedure
  .input(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    duration_minutes: z.number().int().positive(),
    max_participants: z.number().int().positive(),
    trainer_id: z.string().optional(),
    category: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    requireTrainer(ctx.user.role);
    // Single-Studio: wenn kein trainer_id mitgegeben wird, automatisch den
    // (typischerweise einzigen) Trainer-User auflösen. Fallback = Caller.
    let trainerId = input.trainer_id;
    if (!trainerId) {
      const pool = getPool();
      if (pool) {
        try {
          const r = await pool.query(
            `SELECT id::text AS id FROM users WHERE role='trainer' ORDER BY id ASC LIMIT 1`
          );
          trainerId = r.rows[0]?.id;
        } catch {}
      }
      if (!trainerId) trainerId = ctx.user.userId;
    }
    return coursesStore.create({
      name: input.name,
      description: input.description ?? null,
      duration_minutes: input.duration_minutes,
      max_participants: input.max_participants,
      trainer_id: trainerId,
      category: input.category ?? null,
      is_active: true,
    });
  });

export const updateCourse = protectedProcedure
  .input(z.object({ id: z.string().regex(/^\d+$/),
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    duration_minutes: z.number().int().positive().optional(),
    max_participants: z.number().int().positive().optional(),
    trainer_id: z.string().optional(),
    category: z.string().nullable().optional(),
    is_active: z.boolean().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    requireTrainer(ctx.user.role);
    const { id, ...patch } = input;
    const updated = await coursesStore.update(id, patch);
    if (!updated) throw new TRPCError({ code: 'NOT_FOUND' });
    return updated;
  });

export const listCourses = protectedProcedure
  .input(z.object({ onlyActive: z.boolean().optional() }).optional())
  .query(async ({ ctx, input }) => {
    requireTrainer(ctx.user.role);
    return coursesStore.list(input?.onlyActive ?? false);
  });

export const deleteCourse = protectedProcedure
  .input(z.object({ id: z.string().regex(/^\d+$/) }))
  .mutation(async ({ ctx, input }) => {
    requireTrainer(ctx.user.role);
    await coursesStore.update(input.id, { is_active: false });
    return { success: true };
  });

// ---- Schedules ----
export const createSchedule = protectedProcedure
  .input(z.object({
    course_id: z.string().regex(/^\d+$/),
    day_of_week: z.number().int().min(0).max(6),
    start_time: z.string().regex(/^\d{2}:\d{2}$/),
    valid_from: z.string(),
    valid_until: z.string().nullable().optional(),
    recurrence_weeks: z.union([z.literal(1), z.literal(2)]).optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    requireTrainer(ctx.user.role);
    const s = await schedulesStore.create({
      course_id: input.course_id,
      day_of_week: input.day_of_week,
      start_time: input.start_time,
      valid_from: input.valid_from,
      valid_until: input.valid_until ?? null,
      recurrence_weeks: input.recurrence_weeks ?? 1,
    });
    await generateUpcomingInstances();
    return s;
  });

export const listSchedules = protectedProcedure
  .input(z.object({ course_id: z.string().regex(/^\d+$/) }))
  .query(async ({ ctx, input }) => {
    requireTrainer(ctx.user.role);
    return schedulesStore.listByCourse(input.course_id);
  });

export const updateSchedule = protectedProcedure
  .input(z.object({ id: z.string().regex(/^\d+$/),
    day_of_week: z.number().int().min(0).max(6).optional(),
    start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    valid_from: z.string().optional(),
    valid_until: z.string().nullable().optional(),
    recurrence_weeks: z.union([z.literal(1), z.literal(2)]).optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    requireTrainer(ctx.user.role);
    const { id, ...patch } = input;
    return schedulesStore.update(id, patch);
  });

export const deleteSchedule = protectedProcedure
  .input(z.object({ id: z.string().regex(/^\d+$/), cascade: z.boolean().optional() }))
  .mutation(async ({ ctx, input }) => {
    requireTrainer(ctx.user.role);
    if (input.cascade) {
      // Zukünftige scheduled instances dieses Zeitplans absagen (mit Push)
      const instances = await instancesStore.listByScheduleId(input.id);
      const nowMs = Date.now();
      for (const i of instances) {
        if (i.status === 'scheduled' && new Date(i.start_time).getTime() > nowMs) {
          await cancelInstanceAsSystem(i.id, 'Zeitplan entfernt');
        }
      }
    }
    return { success: await schedulesStore.delete(input.id) };
  });

// ---- Instances ----
export const createInstance = protectedProcedure
  .input(z.object({
    course_id: z.string().regex(/^\d+$/),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // Europe/Berlin-Datum
    time: z.string().regex(/^\d{2}:\d{2}$/),
    max_participants: z.number().int().positive().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    requireTrainer(ctx.user.role);
    const course = await coursesStore.getById(input.course_id);
    if (!course) throw new TRPCError({ code: 'NOT_FOUND', message: 'Kurs nicht gefunden' });
    const startIso = berlinLocalToUtcIso(input.date, input.time);
    const start = new Date(startIso);
    const end = new Date(start.getTime() + course.duration_minutes * 60 * 1000);
    return instancesStore.create({
      course_id: course.id,
      schedule_id: null,
      date: input.date,
      start_time: startIso,
      end_time: end.toISOString(),
      status: 'scheduled',
      max_participants: input.max_participants ?? course.max_participants,
    });
  });

export const listInstances = protectedProcedure
  .input(z.object({ course_id: z.string().regex(/^\d+$/).optional(), from: z.string().optional(), to: z.string().optional() }))
  .query(async ({ ctx, input }) => {
    requireTrainer(ctx.user.role);
    if (input.course_id) return instancesStore.listByCourse(input.course_id);
    const from = input.from ? new Date(input.from) : new Date();
    const to = input.to ? new Date(input.to) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return instancesStore.listInRange(from, to);
  });

export const cancelInstance = protectedProcedure
  .input(z.object({ id: z.string().regex(/^\d+$/), reason: z.string().optional() }))
  .mutation(async ({ ctx, input }) => {
    requireTrainer(ctx.user.role);
    const inst = await instancesStore.getById(input.id);
    if (!inst) throw new TRPCError({ code: 'NOT_FOUND' });
    const affected = await cancelInstanceAsSystem(input.id, input.reason);
    return { success: true, affected };
  });

export const deleteInstance = protectedProcedure
  .input(z.object({ id: z.string().regex(/^\d+$/) }))
  .mutation(async ({ ctx, input }) => {
    requireTrainer(ctx.user.role);
    return { success: await instancesStore.delete(input.id) };
  });

export const getInstanceLog = protectedProcedure
  .input(z.object({ id: z.string().regex(/^\d+$/) }))
  .query(async ({ ctx, input }) => {
    requireTrainer(ctx.user.role);
    const bookings = await bookingsStore.listAllForLog(input.id);
    return { bookings };
  });

// ---- Penalties ----
export const listPenalties = protectedProcedure
  .query(async ({ ctx }) => {
    requireTrainer(ctx.user.role);
    return penaltiesStore.list();
  });

export const resetNoShowCount = protectedProcedure
  .input(z.object({ userId: z.string().regex(/^\d+$/) }))
  .mutation(async ({ ctx, input }) => {
    requireTrainer(ctx.user.role);
    const p = await penaltiesStore.reset(input.userId, ctx.user.userId);
    await sendPushToUser(input.userId, 'Sperre aufgehoben',
      'Deine Buchungsmöglichkeit wurde wieder freigeschaltet.', { type: 'unblocked' });
    return p;
  });

// ---- Admin cancel booking ----
export const cancelBookingAsAdmin = protectedProcedure
  .input(z.object({ id: z.string().regex(/^\d+$/) }))
  .mutation(async ({ ctx, input }) => {
    requireTrainer(ctx.user.role);
    const b = await bookingsStore.getById(input.id);
    if (!b) throw new TRPCError({ code: 'NOT_FOUND' });
    await bookingsStore.update(input.id, {
      status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_by: 'admin',
    });
    const inst = await instancesStore.getById(b.instance_id);
    const course = inst ? await coursesStore.getById(inst.course_id) : null;
    if (inst && course) {
      await sendPushToUser(b.user_id, 'Buchung storniert',
        `Deine Buchung für ${course.name} am ${formatDateTimeDe(inst.start_time)} wurde storniert.`,
        { type: 'booking_cancelled', instanceId: inst.id });
    }
    await notifyWaitlistIfSpotFree(b.instance_id);
    return { success: true };
  });

export const generateNow = protectedProcedure
  .mutation(async ({ ctx }) => {
    requireTrainer(ctx.user.role);
    const count = await generateUpcomingInstances();
    return { count };
  });
