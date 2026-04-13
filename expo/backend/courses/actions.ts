import { instancesStore, bookingsStore, waitlistStore, coursesStore } from './storage';
import { sendPushToUsers } from '../push/send';
import { formatDateTimeDe } from './rules';

export async function cancelInstanceAsSystem(instanceId: string, reason?: string): Promise<number> {
  const inst = await instancesStore.getById(instanceId);
  if (!inst) return 0;
  if (inst.status === 'cancelled') return 0;
  const course = await coursesStore.getById(inst.course_id);
  await instancesStore.update(instanceId, { status: 'cancelled' });
  const bookings = await bookingsStore.listByInstance(instanceId);
  const affected: string[] = [];
  for (const b of bookings) {
    if (b.status === 'booked') {
      await bookingsStore.update(b.id, {
        status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_by: 'system',
      });
      affected.push(b.user_id);
    }
  }
  await waitlistStore.deleteAllForInstance(instanceId);
  if (affected.length && course) {
    await sendPushToUsers(
      affected,
      'Kurs abgesagt',
      `${course.name} am ${formatDateTimeDe(inst.start_time)} wurde abgesagt.${reason ? ' Grund: ' + reason : ''}`,
      { type: 'course_cancelled', instanceId }
    );
  }
  return affected.length;
}
