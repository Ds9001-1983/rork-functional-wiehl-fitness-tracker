export const NO_SHOW_LIMIT = 3;
export const CANCEL_DEADLINE_HOURS = 2;
export const BOOKING_WINDOW_HOURS = 168; // 7 days
export const INSTANCE_GENERATION_DAYS = 14;

export function isInSevenDayWindow(instanceStart: Date): boolean {
  const now = Date.now();
  const t = instanceStart.getTime();
  return t >= now && t <= now + BOOKING_WINDOW_HOURS * 60 * 60 * 1000;
}

export function hasStarted(instanceStart: Date): boolean {
  return instanceStart.getTime() <= Date.now();
}

export function isLateCancellation(instanceStart: Date): boolean {
  const diffMs = instanceStart.getTime() - Date.now();
  return diffMs < CANCEL_DEADLINE_HOURS * 60 * 60 * 1000;
}

export function formatDateTimeDe(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Liefert die Uhrzeit-Offsetdifferenz (ms) zwischen UTC und Europe/Berlin zum gegebenen Moment (beachtet DST).
function berlinOffsetMs(at: Date): number {
  const tz = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', timeZoneName: 'shortOffset' }).formatToParts(at);
  const part = tz.find(p => p.type === 'timeZoneName')?.value ?? 'GMT+1';
  const m = /GMT([+-])(\d{1,2})(?::?(\d{2}))?/.exec(part);
  if (!m) return 60 * 60 * 1000;
  const sign = m[1] === '-' ? -1 : 1;
  const hours = parseInt(m[2], 10);
  const mins = m[3] ? parseInt(m[3], 10) : 0;
  return sign * (hours * 60 + mins) * 60 * 1000;
}

// Kombiniert ein Berliner Datum (YYYY-MM-DD) und eine Uhrzeit (HH:MM) zu einem ISO-UTC-String.
export function berlinLocalToUtcIso(dateYmd: string, timeHm: string): string {
  const [y, mo, d] = dateYmd.split('-').map(Number);
  const [h, mi] = timeHm.split(':').map(Number);
  const assumed = new Date(Date.UTC(y, mo - 1, d, h, mi, 0));
  const off = berlinOffsetMs(assumed);
  return new Date(assumed.getTime() - off).toISOString();
}

// Gibt YYYY-MM-DD in Europe/Berlin für einen Date-Instant zurück.
export function berlinDateString(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  return parts; // en-CA liefert YYYY-MM-DD
}

// day_of_week in unserer Konvention (0=Mo..6=So) für einen Instant in Europe/Berlin.
export function berlinDayOfWeek(d: Date): number {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', weekday: 'short' }).format(d);
  const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return map[wd] ?? 0;
}
