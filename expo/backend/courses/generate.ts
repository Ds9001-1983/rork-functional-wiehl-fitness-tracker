import { coursesStore, schedulesStore, instancesStore, bookingsStore } from './storage';
import { INSTANCE_GENERATION_DAYS, berlinDateString, berlinDayOfWeek, berlinLocalToUtcIso } from './rules';

export async function generateUpcomingInstances(days = INSTANCE_GENERATION_DAYS): Promise<number> {
  const schedules = await schedulesStore.listAllActive();
  if (!schedules.length) return 0;
  const courses = new Map((await coursesStore.list(true)).map(c => [c.id, c]));
  let created = 0;
  const startMs = Date.now();

  for (let offset = 0; offset < days; offset++) {
    const instant = new Date(startMs + offset * 24 * 60 * 60 * 1000);
    const dateStr = berlinDateString(instant);
    const ourDow = berlinDayOfWeek(instant);
    for (const s of schedules) {
      if (s.day_of_week !== ourDow) continue;
      if (s.valid_from && dateStr < s.valid_from) continue;
      if (s.valid_until && dateStr > s.valid_until) continue;
      const course = courses.get(s.course_id);
      if (!course || !course.is_active) continue;
      const startIso = berlinLocalToUtcIso(dateStr, s.start_time);
      const start = new Date(startIso);
      const end = new Date(start.getTime() + course.duration_minutes * 60 * 1000);
      const res = await instancesStore.createIfNotExists({
        course_id: course.id,
        schedule_id: s.id,
        date: dateStr,
        start_time: startIso,
        end_time: end.toISOString(),
        status: 'scheduled',
        max_participants: course.max_participants,
      });
      if (res) created++;
    }
  }
  if (created) console.log(`[Courses] Generated ${created} instances`);
  return created;
}

// Räumt zukünftige, leere (ohne Buchungen) Instances von abgelaufenen Zeitplänen auf.
export async function expireSchedules(): Promise<number> {
  const schedules = await schedulesStore.listAllActive();
  const today = berlinDateString(new Date());
  const activeScheduleIds = new Set(schedules.filter(s => !s.valid_until || s.valid_until >= today).map(s => s.id));
  let cleaned = 0;
  // Iteriere alle Kurse, hole Instances mit schedule_id nicht in activeScheduleIds
  const courses = await coursesStore.list();
  const nowMs = Date.now();
  for (const c of courses) {
    const insts = await instancesStore.listByCourse(c.id);
    for (const i of insts) {
      if (!i.schedule_id || activeScheduleIds.has(i.schedule_id)) continue;
      if (i.status !== 'scheduled') continue;
      if (new Date(i.start_time).getTime() <= nowMs) continue;
      const booked = await bookingsStore.countBookedForInstance(i.id);
      if (booked > 0) continue;
      await instancesStore.delete(i.id);
      cleaned++;
    }
  }
  if (cleaned) console.log(`[Courses] Expired ${cleaned} orphan instances`);
  return cleaned;
}
