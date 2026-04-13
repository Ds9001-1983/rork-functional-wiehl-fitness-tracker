import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../create-context';
import {
  coursesStore, instancesStore, bookingsStore, penaltiesStore, waitlistStore, bookWithLock,
} from '../../../courses/storage';
import { notifyWaitlistIfSpotFree } from '../../../courses/waitlist';
import { sendPushToUser } from '../../../push/send';
import {
  formatDateTimeDe, isInSevenDayWindow, hasStarted, isLateCancellation, NO_SHOW_LIMIT,
} from '../../../courses/rules';
import { getRawPool, isUsingDatabase } from '../../../storage';

async function resolveTrainerName(trainerId: string): Promise<string> {
  if (!isUsingDatabase()) return '';
  const pool = getRawPool(); if (!pool) return '';
  const r = await pool.query(
    `SELECT COALESCE(c.name, u.email) as name FROM users u LEFT JOIN clients c ON c.user_id=u.id WHERE u.id=$1`,
    [parseInt(trainerId)]
  );
  return r.rows[0]?.name ?? '';
}

export const getSchedule = protectedProcedure
  .query(async ({ ctx }) => {
    const now = new Date();
    const until = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const instances = await instancesStore.listInRange(now, until);
    const penalty = await penaltiesStore.getOrCreate(ctx.user.userId);
    const userBookings = await bookingsStore.listByUser(ctx.user.userId);
    const userWaitlist = await waitlistStore.listByUser(ctx.user.userId);
    const trainerCache = new Map<string, string>();
    const result = [];
    for (const i of instances) {
      if (i.status !== 'scheduled') continue;
      const booked = await bookingsStore.countBookedForInstance(i.id);
      const mine = userBookings.find(b => b.instance_id === i.id && b.status === 'booked');
      const onWaitlist = userWaitlist.find(w => w.instance_id === i.id);
      if (!trainerCache.has(i.course.trainer_id)) {
        trainerCache.set(i.course.trainer_id, await resolveTrainerName(i.course.trainer_id));
      }
      result.push({
        instance: { id: i.id, start_time: i.start_time, end_time: i.end_time, max_participants: i.max_participants, status: i.status },
        course: {
          id: i.course.id, name: i.course.name, description: i.course.description,
          duration_minutes: i.course.duration_minutes, category: i.course.category,
          trainer_name: trainerCache.get(i.course.trainer_id) ?? '',
        },
        booked,
        available: i.max_participants - booked,
        isBookedByMe: !!mine,
        myBookingId: mine?.id ?? null,
        onWaitlist: !!onWaitlist,
      });
    }
    return { items: result, isBlocked: penalty.is_blocked, noShowCount: penalty.no_show_count, noShowLimit: NO_SHOW_LIMIT };
  });

export const book = protectedProcedure
  .input(z.object({ instance_id: z.string().regex(/^\d+$/) }))
  .mutation(async ({ ctx, input }) => {
    const penalty = await penaltiesStore.getOrCreate(ctx.user.userId);
    if (penalty.is_blocked) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Du bist aktuell gesperrt. Wende dich ans Studio.' });
    }
    const inst = await instancesStore.getById(input.instance_id);
    if (!inst || inst.status !== 'scheduled') throw new TRPCError({ code: 'NOT_FOUND', message: 'Kurs nicht verfügbar' });
    const start = new Date(inst.start_time);
    if (!isInSevenDayWindow(start)) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Außerhalb des Buchungsfensters (7 Tage)' });
    if (hasStarted(start)) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Kurs hat bereits begonnen' });

    const res = await bookWithLock(input.instance_id, ctx.user.userId);
    if (!res.ok) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: res.reason === 'full' ? 'Kurs ist ausgebucht' : 'Du hast diesen Kurs bereits gebucht',
      });
    }
    const course = await coursesStore.getById(inst.course_id);
    if (course) {
      await sendPushToUser(ctx.user.userId, 'Buchung bestätigt',
        `Du bist für ${course.name} am ${formatDateTimeDe(inst.start_time)} angemeldet.`,
        { type: 'booking_confirmed', instanceId: inst.id });
    }
    // Leave any waitlist entry for this instance
    await waitlistStore.delete(input.instance_id, ctx.user.userId);
    return { booking: res.booking };
  });

export const cancelMyBooking = protectedProcedure
  .input(z.object({ id: z.string().regex(/^\d+$/) }))
  .mutation(async ({ ctx, input }) => {
    const b = await bookingsStore.getById(input.id);
    if (!b) throw new TRPCError({ code: 'NOT_FOUND' });
    if (b.user_id !== ctx.user.userId) throw new TRPCError({ code: 'FORBIDDEN' });
    if (b.status !== 'booked') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Bereits storniert' });
    const inst = await instancesStore.getById(b.instance_id);
    if (!inst) throw new TRPCError({ code: 'NOT_FOUND' });
    const start = new Date(inst.start_time);
    if (hasStarted(start)) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Kurs hat bereits begonnen' });

    const late = isLateCancellation(start);
    const course = await coursesStore.getById(inst.course_id);

    if (late) {
      // Als Stornierung markieren (Platz wird frei), Penalty trotzdem erhöhen
      await bookingsStore.update(b.id, {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: 'customer',
      });
      const penalty = await penaltiesStore.incrementNoShow(ctx.user.userId, NO_SHOW_LIMIT);
      await sendPushToUser(ctx.user.userId, 'Späte Stornierung',
        `Stornierung < 2h vor Start wird als No-Show gewertet. Aktuell: ${penalty.no_show_count}/${NO_SHOW_LIMIT}.`,
        { type: 'late_cancel', count: penalty.no_show_count });
      if (penalty.is_blocked) {
        await sendPushToUser(ctx.user.userId, 'Gesperrt',
          'Deine Buchungsmöglichkeit wurde gesperrt. Bitte wende dich an das Studio.',
          { type: 'blocked' });
      }
      await notifyWaitlistIfSpotFree(b.instance_id);
      return { success: true, lateCancelled: true };
    }

    await bookingsStore.update(b.id, {
      status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_by: 'customer',
    });
    if (course) {
      await sendPushToUser(ctx.user.userId, 'Buchung storniert',
        `Deine Buchung für ${course.name} am ${formatDateTimeDe(inst.start_time)} wurde storniert.`,
        { type: 'booking_cancelled', instanceId: inst.id });
    }
    await notifyWaitlistIfSpotFree(b.instance_id);
    return { success: true, lateCancelled: false };
  });

export const joinWaitlist = protectedProcedure
  .input(z.object({ instance_id: z.string().regex(/^\d+$/) }))
  .mutation(async ({ ctx, input }) => {
    const inst = await instancesStore.getById(input.instance_id);
    if (!inst || inst.status !== 'scheduled') throw new TRPCError({ code: 'NOT_FOUND' });
    if (!isInSevenDayWindow(new Date(inst.start_time))) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Außerhalb des Buchungsfensters' });
    }
    const active = await bookingsStore.findActive(input.instance_id, ctx.user.userId);
    if (active) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Bereits gebucht' });
    const entry = await waitlistStore.create(input.instance_id, ctx.user.userId);
    return entry;
  });

export const leaveWaitlist = protectedProcedure
  .input(z.object({ instance_id: z.string().regex(/^\d+$/) }))
  .mutation(async ({ ctx, input }) => {
    return { success: await waitlistStore.delete(input.instance_id, ctx.user.userId) };
  });

export const myBookings = protectedProcedure
  .input(z.object({ includeHistory: z.boolean().optional() }).optional())
  .query(async ({ ctx, input }) => {
    const bookings = await bookingsStore.listByUser(ctx.user.userId);
    const waitlistEntries = await waitlistStore.listByUser(ctx.user.userId);
    const enrichedBookings = [];
    for (const b of bookings) {
      const inst = await instancesStore.getById(b.instance_id);
      if (!inst) continue;
      const course = await coursesStore.getById(inst.course_id);
      const isFuture = new Date(inst.start_time).getTime() > Date.now();
      if (!input?.includeHistory && (!isFuture || b.status !== 'booked')) continue;
      enrichedBookings.push({ booking: b, instance: inst, course });
    }
    const enrichedWaitlist = [];
    for (const w of waitlistEntries) {
      const inst = await instancesStore.getById(w.instance_id);
      if (!inst) continue;
      const course = await coursesStore.getById(inst.course_id);
      enrichedWaitlist.push({ entry: w, instance: inst, course });
    }
    return { bookings: enrichedBookings, waitlist: enrichedWaitlist };
  });
