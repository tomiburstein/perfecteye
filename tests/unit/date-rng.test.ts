import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysBetween,
  formatCountdown,
  isDayKey,
  msUntilNextDay,
  nextUtcMidnight,
  toDayKey,
} from '../../src/platform/date';
import { createRng, hashString } from '../../src/platform/rng';
import { challengeNumber, LAUNCH_DAY } from '../../src/games/classic/config';

describe('UTC dates', () => {
  it('uses the UTC calendar, not local time', () => {
    expect(toDayKey(new Date('2026-11-12T23:59:59.999Z'))).toBe('2026-11-12');
    expect(toDayKey(new Date('2026-11-13T00:00:00.000Z'))).toBe('2026-11-13');
    // 21:30 in Buenos Aires (UTC-3) on the 12th is already the 13th in UTC.
    expect(toDayKey(new Date('2026-11-12T21:30:00-03:00'))).toBe('2026-11-13');
  });

  it('validates day keys', () => {
    expect(isDayKey('2026-02-28')).toBe(true);
    expect(isDayKey('2026-02-30')).toBe(false);
    expect(isDayKey('2026-2-3')).toBe(false);
    expect(isDayKey(20261112)).toBe(false);
  });

  it('adds and counts days across months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
    expect(daysBetween('2026-11-12', '2027-11-12')).toBe(365);
  });

  it('computes time until the next UTC midnight', () => {
    const now = new Date('2026-11-12T22:00:00Z');
    expect(nextUtcMidnight(now).toISOString()).toBe('2026-11-13T00:00:00.000Z');
    expect(msUntilNextDay(now)).toBe(2 * 3600 * 1000);
    expect(formatCountdown(2 * 3600 * 1000 + 61_000)).toBe('02:01:01');
  });

  it('numbers challenges from the launch day', () => {
    expect(challengeNumber(LAUNCH_DAY)).toBe(1);
    expect(challengeNumber(addDays(LAUNCH_DAY, 41))).toBe(42);
  });
});

describe('deterministic RNG', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createRng('seed');
    const b = createRng('seed');
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('produces different sequences for different seeds', () => {
    expect(createRng('a').next()).not.toBe(createRng('b').next());
    expect(hashString('2026-11-12')).not.toEqual(hashString('2026-11-13'));
  });

  it('stays within range and is roughly uniform', () => {
    const r = createRng('uniform');
    const buckets = new Array(10).fill(0);
    for (let i = 0; i < 20000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      buckets[Math.floor(v * 10)]++;
    }
    for (const b of buckets) expect(b).toBeGreaterThan(1700);
  });

  it('is pinned to known values (guards against accidental changes)', () => {
    const r = createRng('perfecteye');
    const first = [r.next(), r.next(), r.next()];
    expect(first).toMatchSnapshot();
  });
});
