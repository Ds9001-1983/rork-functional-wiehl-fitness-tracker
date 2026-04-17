import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../create-context';
import {
  coursesStore, schedulesStore, instancesStore, bookingsStore, penaltiesStore, waitlistStore,
} from '../../../courses/storage';
import { notifyWaitlistIfSpotFree } from '../../../courses/waitlist';
import { sendPushToUser } from '../../../push/send';
import { formatDateTimeDe, NO_SHOW_LIMIT, hasStarted } from '../../../courses/rules';
import { getRawPool, isUsingDatabase } from '../../../storage';

function requireTrainer(role: string) {
  if (role !== 'trainer' && role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Nur Trainer/Admin.' });
  }
}

async function resolveUserNames(userIds: string[]): Promise<Map<string, { name: string; email: string }>> {
  const map = new Map<string, { name: string; email: string }>();
  if (!userIds.length) return map;
  if (isUsingDatabase()) {
    const pool = getRawPool();
    if (pool) {
      const r = await pool.query(
        `SELECT id::text as id, email, COALESCE(name, email) as name
         FROM users
         WHERE id = ANY($1::int[])`,
        [userIds.map(id => parseInt(id))]
      );
      for (const row of r.rows) map.set(row.id, { name: row.name, email: row.email });
    }
  }
  for (const id of userIds) if (!map.has(id)) map.set(id, { name: id, email: '' });
  return map;
}

export const listMyCourses = protectedProcedure
  .query(async ({ ctx }) => {
    requireTrainer(ctx.user.role);
    const allCourses = await coursesStore.list(true);
    const mine = allCourses.filter(c => c.trainer_id === ctx.user.userId);
    const fromMs = Date.now() - 24 * 60 * 60 * 1000;
    const toMs   = Date.now() + 14 * 24 * 60 * 60 * 1000;
    const result: Array<{
      course: typeof mine[number];
      schedules: Awaited<ReturnType<typeof schedulesStore.listByCourse>>;
      upcomingInstances: Array<{
        id: string; start_time: string; status: string;
        booked: number; available: number; max_participants: number;
      }>;
    }> = [];
    for (const c of mine) {
      const schedules = await schedulesStore.listByCourse(c.id);
      const allInsts = await instancesStore.listByCourse(c.id);
      const upcoming = allInsts
        .filter(i => {
          const t = new Date(i.start_time).getTime();
          return t >= fromMs && t <= toMs;
        })
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
      const upcomingInstances: Array<{
        id: string; start_time: string; status: string;
        booked: number; available: number; max_participants: number;
      }> = [];
      for (const i of upcoming) {
        const booked = await bookingsStore.countBookedForInstance(i.id);
        upcomingInstances.push({
          id: i.id,
          start_time: i.start_time,
          status: i.status,
          booked,
          available: i.max_participants - booked,
          max_participants: i.max_participants,
        });
      }
      result.push({ course: c, schedules, upcomingInstances });
    }
    return result;
  });

export const listMyInstances = protectedProcedure
  .input(z.object({ from: z.string().optional(), to: z.string().optional(), includePast: z.boolean().optional() }).optional())
  .query(async ({ ctx, input }) => {
    requireTrainer(ctx.user.role);
    // Default: letzte 24h (für No-Show-Nachbearbeitung) + 14 Tage Zukunft
    const from = input?.from ? new Date(input.from)
      : new Date(Date.now() - (input?.includePast ? 7 * 24 : 24) * 60 * 60 * 1000);
    const to = input?.to ? new Date(input.to) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const instances = await instancesStore.listInRange(from, to, { trainerId: ctx.user.userId });
    const out = [];
    for (const i of instances) {
      const booked = await bookingsStore.countBookedForInstance(i.id);
      out.push({ ...i, booked, available: i.max_participants - booked });
    }
    return out;
  });

export const getMyInstance = protectedProcedure
  .input(z.object({ id: z.string().regex(/^\d+$/) }))
  .query(async ({ ctx, input }) => {
    requireTrainer(ctx.user.role);
    const inst = await instancesStore.getById(input.id);
    if (!inst) throw new TRPCError({ code: 'NOT_FOUND' });
    const course = await coursesStore.getById(inst.course_id);
    const bookings = await bookingsStore.listByInstance(input.id);
    const waitlist = await waitlistStore.listByInstance(input.id);
    const names = await resolveUserNames([
      ...bookings.map(b => b.user_id),
      ...waitlist.map(w => w.user_id),
    ]);
    const participants = bookings.map(b => ({ ...b, user: names.get(b.user_id) ?? { name: b.user_id, email: '' } }));
    const waitingUsers = waitlist.map(w => ({ ...w, user: names.get(w.user_id) ?? { name: w.user_id, email: '' } }));
    return { instance: inst, course, participants, waitlist: waitingUsers };
  });

export const markNoShow = protectedProcedure
  .input(z.object({ bookingId: z.string().regex(/^\d+$/) }))
  .mutation(async ({ ctx, input }) => {
    requireTrainer(ctx.user.role);
    const b = await bookingsStore.getById(input.bookingId);
    if (!b) throw new TRPCError({ code: 'NOT_FOUND' });
    if (b.status !== 'booked') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nur aktive Buchungen' });
    const inst = await instancesStore.getById(b.instance_id);
    if (!inst) throw new TRPCError({ code: 'NOT_FOUND' });
    if (!hasStarted(new Date(inst.start_time))) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'No-Show erst nach Kursbeginn möglich' });
    }
    await bookingsStore.update(input.bookingId, {
      status: 'no_show',
      no_show_marked_at: new Date().toISOString(),
      no_show_marked_by: ctx.user.userId,
    });
    const penalty = await penaltiesStore.incrementNoShow(b.user_id, NO_SHOW_LIMIT);
    const course = await coursesStore.getById(inst.course_id);
    await sendPushToUser(b.user_id, 'Kurs verpasst',
      `Du hast ${course?.name ?? 'einen Kurs'} verpasst. Aktuell: ${penalty.no_show_count}/${NO_SHOW_LIMIT} No-Shows.`,
      { type: 'no_show', count: penalty.no_show_count });
    if (penalty.is_blocked) {
      await sendPushToUser(b.user_id, 'Gesperrt',
        'Deine Buchungsmöglichkeit wurde gesperrt. Bitte wende dich an das Studio.',
        { type: 'blocked' });
    }
    return { penalty };
  });

export const removeParticipant = protectedProcedure
  .input(z.object({ bookingId: z.string().regex(/^\d+$/) }))
  .mutation(async ({ ctx, input }) => {
    requireTrainer(ctx.user.role);
    const b = await bookingsStore.getById(input.bookingId);
    if (!b) throw new TRPCError({ code: 'NOT_FOUND' });
    await bookingsStore.update(input.bookingId, {
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: 'trainer',
    });
    const inst = await instancesStore.getById(b.instance_id);
    const course = inst ? await coursesStore.getById(inst.course_id) : null;
    if (inst && course) {
      await sendPushToUser(b.user_id, 'Aus Kurs entfernt',
        `Du wurdest aus ${course.name} am ${formatDateTimeDe(inst.start_time)} entfernt.`,
        { type: 'removed_by_trainer', instanceId: inst.id });
    }
    await notifyWaitlistIfSpotFree(b.instance_id);
    return { success: true };
  });
