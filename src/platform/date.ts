/**
 * UTC calendar helpers. A "day key" is an ISO date string (YYYY-MM-DD) in UTC.
 * Every player in the world shares the same day key at the same instant, so
 * the daily challenge switches at 00:00 UTC for everyone.
 */

export type DayKey = string;

const DAY_MS = 86_400_000;
const DAY_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toDayKey(date: Date): DayKey {
  return date.toISOString().slice(0, 10);
}

export function isDayKey(value: unknown): value is DayKey {
  if (typeof value !== 'string') return false;
  const m = DAY_KEY_RE.exec(value);
  if (!m) return false;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return toDayKey(new Date(ms)) === value;
}

/** Milliseconds since epoch for 00:00 UTC of the given day. */
export function dayKeyToMs(key: DayKey): number {
  const m = DAY_KEY_RE.exec(key);
  if (!m) throw new Error(`Invalid day key: ${key}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function addDays(key: DayKey, days: number): DayKey {
  return toDayKey(new Date(dayKeyToMs(key) + days * DAY_MS));
}

/** Whole days from `from` to `to` (positive if `to` is later). */
export function daysBetween(from: DayKey, to: DayKey): number {
  return Math.round((dayKeyToMs(to) - dayKeyToMs(from)) / DAY_MS);
}

export function nextUtcMidnight(now: Date): Date {
  return new Date(dayKeyToMs(toDayKey(now)) + DAY_MS);
}

export function msUntilNextDay(now: Date): number {
  return nextUtcMidnight(now).getTime() - now.getTime();
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}
