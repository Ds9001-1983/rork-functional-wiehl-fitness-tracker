import { instancesStore, bookingsStore, waitlistStore, coursesStore } from './storage';
import { sendPushToUsers } from '../push/send';
import { formatDateTimeDe } from './rules';

const NOTIFY_COOLDOWN_MS = 30 * 60 * 1000;

export async function notifyWaitlistIfSpotFree(instanceId: string): Promise<void> {
  const instance = await instancesStore.getById(instanceId);
  if (!instance || instance.status !== 'scheduled') return;
  const booked = await bookingsStore.countBookedForInstance(instanceId);
  const free = instance.max_participants - booked;
  if (free <= 0) return;
  const entries = await waitlistStore.listByInstance(instanceId);
  const cutoff = Date.now() - NOTIFY_COOLDOWN_MS;
  const eligible = entries.filter(e => !e.last_notified_at || new Date(e.last_notified_at).getTime() < cutoff);
  // Maximal `free` Einträge benachrichtigen (First-Come-First-Serve), mindestens 1
  const toNotify = eligible.slice(0, Math.max(free, 1));
  if (!toNotify.length) return;
  const course = await coursesStore.getById(instance.course_id);
  if (!course) return;
  await sendPushToUsers(
    toNotify.map(e => e.user_id),
    'Platz frei!',
    `Platz frei für ${course.name} am ${formatDateTimeDe(instance.start_time)}. Jetzt buchen!`,
    { type: 'waitlist_free', instanceId }
  );
  for (const e of toNotify) await waitlistStore.markNotified(e.id);
}
