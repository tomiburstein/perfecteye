import { describe, expect, it } from 'vitest';
import { addDays } from '../../src/platform/date';
import { BOARD_SIZE, dist, interiorAngle, polar, type Point } from '../../src/platform/geometry';
import { evaluateRound } from '../../src/games/classic/evaluate';
import { generateDailyChallenge } from '../../src/games/classic/generator';
import type { DailyChallenge } from '../../src/games/classic/types';

const START = '2026-11-12';
const SAMPLE = 1000;
const days = Array.from({ length: SAMPLE }, (_, i) => addDays(START, i));
const challenges = days.map((d) => generateDailyChallenge(d));

const inBoard = (p: Point, margin = 0) =>
  p.x >= margin && p.y >= margin && p.x <= BOARD_SIZE - margin && p.y <= BOARD_SIZE - margin;

function fingerprint(c: DailyChallenge): string {
  return JSON.stringify([c.center, c.half, c.angle, c.distance, c.shape.target]);
}

describe('daily challenge generation', () => {
  it('returns exactly the same challenge for the same day', () => {
    for (const d of days.slice(0, 50)) {
      expect(generateDailyChallenge(d)).toEqual(generateDailyChallenge(d));
    }
  });

  it('is pinned for a known day (guards against accidental changes)', () => {
    const c = generateDailyChallenge('2026-11-12');
    expect(c.number).toBe(1);
    expect(fingerprint(c)).toBe(fingerprint(generateDailyChallenge('2026-11-12')));
    expect(c).toMatchSnapshot();
  });

  it(`produces a different challenge every day across ${SAMPLE} days`, () => {
    const prints = new Set(challenges.map(fingerprint));
    expect(prints.size).toBe(SAMPLE);
    // Each round on its own is also varied.
    for (const key of ['center', 'half', 'angle', 'distance'] as const) {
      const unique = new Set(challenges.map((c) => JSON.stringify(c[key])));
      expect(unique.size).toBe(SAMPLE);
    }
  });

  it('varies orientation of Perfect Half', () => {
    const h = challenges.filter((c) => c.half.orientation === 'horizontal').length;
    expect(h).toBeGreaterThan(SAMPLE * 0.35);
    expect(h).toBeLessThan(SAMPLE * 0.65);
  });

  it('keeps every figure inside the board and avoids trivial setups', () => {
    for (const c of challenges) {
      // Center
      const { center, radius } = c.center;
      expect(inBoard({ x: center.x - radius, y: center.y - radius }, 40)).toBe(true);
      expect(inBoard({ x: center.x + radius, y: center.y + radius }, 40)).toBe(true);
      // Half
      expect(inBoard(c.half.start, 50) && inBoard(c.half.end, 50)).toBe(true);
      expect(dist(c.half.start, c.half.end)).toBeGreaterThanOrEqual(430);
      // Angle
      const a = c.angle;
      expect(a.targetDeg).toBeGreaterThanOrEqual(20);
      expect(a.targetDeg).toBeLessThanOrEqual(160);
      expect(Math.abs(a.targetDeg - 90)).toBeGreaterThanOrEqual(5);
      for (const deg of [a.previewBaseDeg, a.previewBaseDeg + a.targetDeg, a.inputBaseDeg, a.inputBaseDeg + a.targetDeg]) {
        expect(inBoard(polar(a.vertex, deg, a.rayLength), 20)).toBe(true);
      }
      // Distance: solution reachable, not collinear, start far from the solution.
      const d = c.distance;
      const ab = dist(d.a, d.b);
      const solution = polar(d.b, d.trackDeg, ab);
      expect(inBoard(d.a, 60) && inBoard(solution, 60)).toBe(true);
      expect(d.trackLength).toBeGreaterThan(ab * 1.4);
      const angleAtB = interiorAngle(d.a, d.b, solution);
      expect(angleAtB).toBeGreaterThanOrEqual(64);
      expect(angleAtB).toBeLessThanOrEqual(156);
      expect(Math.abs(d.startDistance - ab) / ab).toBeGreaterThanOrEqual(0.29);
      // Shape: a clearly non-degenerate triangle, far from the start handles.
      const [p, q, r] = c.shape.target;
      expect(Math.min(dist(p, q), dist(q, r), dist(r, p))).toBeGreaterThanOrEqual(300);
      expect(Math.min(interiorAngle(r, p, q), interiorAngle(p, q, r), interiorAngle(q, r, p))).toBeGreaterThanOrEqual(25);
      for (const v of c.shape.target) expect(inBoard(v, 120)).toBe(true);
    }
  });

  it('starting answers never score well by themselves', () => {
    for (const c of challenges) {
      expect(evaluateRound(c, 'distance', { distance: c.distance.startDistance }).score).toBeLessThan(30);
      expect(evaluateRound(c, 'shape', { points: c.shape.start }).score).toBeLessThan(30);
    }
  });

  it('a perfect answer scores 100 on every round', () => {
    for (const c of challenges.slice(0, 100)) {
      expect(evaluateRound(c, 'center', { point: c.center.center }).score).toBe(100);
      expect(evaluateRound(c, 'half', { t: 0.5 }).score).toBe(100);
      expect(evaluateRound(c, 'angle', { deg: c.angle.targetDeg }).score).toBe(100);
      expect(evaluateRound(c, 'distance', { distance: dist(c.distance.a, c.distance.b) }).score).toBe(100);
      const [a, b, t] = c.shape.target;
      expect(evaluateRound(c, 'shape', { points: [t, a, b] }).score).toBe(100); // order-independent
    }
  });
});

describe('free play challenges', () => {
  it('are reproducible for an id and different between ids', async () => {
    const { generatePracticeChallenge, newPracticeId } = await import('../../src/games/classic/generator');
    const a = generatePracticeChallenge('abc123', '2026-11-14');
    expect(generatePracticeChallenge('abc123', '2026-11-14')).toEqual(a);
    const ids = new Set(Array.from({ length: 200 }, () => newPracticeId()));
    expect(ids.size).toBe(200);
    const prints = new Set(
      [...ids].map((id) => fingerprint(generatePracticeChallenge(id, '2026-11-14'))),
    );
    expect(prints.size).toBe(200);
  });

  it('never equal the daily challenge of the same day', async () => {
    const { generatePracticeChallenge } = await import('../../src/games/classic/generator');
    const p = generatePracticeChallenge('0000', '2026-11-14');
    expect(fingerprint(p)).not.toBe(fingerprint(generateDailyChallenge('2026-11-14')));
    expect(p.number).toBe(0);
  });
});
