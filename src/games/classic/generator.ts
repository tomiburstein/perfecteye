import { createRng, type Rng } from '../../platform/rng';
import type { DayKey } from '../../platform/date';
import {
  BOARD_SIZE,
  angleDiff,
  dist,
  interiorAngle,
  normDeg,
  polar,
  pt,
  type Point,
} from '../../platform/geometry';
import { GAME_ID, GENERATOR_VERSION, challengeNumber } from './config';
import type {
  AngleChallenge,
  CenterChallenge,
  DailyChallenge,
  DistanceChallenge,
  HalfChallenge,
  RoundId,
  ShapeChallenge,
  Triangle,
} from './types';

/**
 * Daily challenge generation.
 *
 * Seed = "<gameId>:v<version>:<UTC day>:<round>". Each round gets its own
 * independent random stream, so tweaking one generator never changes the
 * others. Generated coordinates are rounded to 0.1 board units so the result
 * is stable across JavaScript engines.
 */

const MAX_ATTEMPTS = 500;
const C = BOARD_SIZE / 2;
const round1 = (v: number): number => Math.round(v * 10) / 10;
const roundPt = (p: Point): Point => pt(round1(p.x), round1(p.y));
const inside = (p: Point, margin: number): boolean =>
  p.x >= margin && p.x <= BOARD_SIZE - margin && p.y >= margin && p.y <= BOARD_SIZE - margin;

/** `key` is the UTC day for daily challenges, or `practice-<id>` for free play. */
export function roundSeed(key: string, round: RoundId): string {
  return `${GAME_ID}:v${GENERATOR_VERSION}:${key}:${round}`;
}

function attempt<T>(rng: Rng, make: (rng: Rng) => T | null, fallback: T): T {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const result = make(rng);
    if (result) return result;
  }
  return fallback;
}

export function generateCenter(rng: Rng): CenterChallenge {
  return attempt(
    rng,
    (r) => {
      const radius = round1(r.range(210, 340));
      const min = radius + 50;
      const max = BOARD_SIZE - radius - 50;
      const center = roundPt(pt(r.range(min, max), r.range(min, max)));
      // Avoid the board centre so the frame itself is not a clue.
      if (dist(center, pt(C, C)) < 80) return null;
      return { center, radius };
    },
    { center: pt(470, 540), radius: 320 },
  );
}

export function generateHalf(rng: Rng): HalfChallenge {
  return attempt(
    rng,
    (r) => {
      const orientation = r.bool() ? 'horizontal' : 'vertical';
      const length = r.range(440, 820);
      const along = r.range(90, BOARD_SIZE - 90 - length);
      const across = r.range(180, 820);
      const mid = along + length / 2;
      // The midpoint must not coincide with the board centre (a free clue).
      if (Math.abs(mid - C) < 40) return null;
      const start =
        orientation === 'horizontal' ? pt(along, across) : pt(across, along);
      const end =
        orientation === 'horizontal' ? pt(along + length, across) : pt(across, along + length);
      return { start: roundPt(start), end: roundPt(end), orientation };
    },
    { start: pt(140, 420), end: pt(780, 420), orientation: 'horizontal' },
  );
}

export function generateAngle(rng: Rng): AngleChallenge {
  return attempt(
    rng,
    (r) => {
      const targetDeg = round1(r.range(20, 160));
      // Skip "easy" reference angles that are trivial to reproduce.
      if (Math.abs(targetDeg - 90) < 5) return null;
      if (Math.abs(targetDeg - 45) < 3 || Math.abs(targetDeg - 135) < 3) return null;
      const previewBaseDeg = round1(r.range(0, 360));
      const rotation = r.range(70, 290);
      const inputBaseDeg = round1(normDeg(previewBaseDeg + rotation));
      if (angleDiff(previewBaseDeg, inputBaseDeg) < 60) return null;
      const vertex = roundPt(pt(C + r.range(-40, 40), C + r.range(-40, 40)));
      return { vertex, rayLength: 360, targetDeg, previewBaseDeg, inputBaseDeg };
    },
    { vertex: pt(500, 520), rayLength: 360, targetDeg: 62, previewBaseDeg: 15, inputBaseDeg: 200 },
  );
}

/** Longest distance from `origin` in direction `deg` that stays inside the margin. */
function maxRun(origin: Point, deg: number, margin: number): number {
  let lo = 0;
  let hi = BOARD_SIZE * 2;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (inside(polar(origin, deg, mid), margin)) lo = mid;
    else hi = mid;
  }
  return lo;
}

export function generateDistance(rng: Rng): DistanceChallenge {
  return attempt(
    rng,
    (r) => {
      const ab = r.range(240, 350);
      const b = roundPt(pt(r.range(280, 720), r.range(280, 720)));
      const towardA = r.range(0, 360);
      const a = roundPt(polar(b, towardA, ab));
      if (!inside(a, 80)) return null;
      const opening = r.range(70, 150) * (r.bool() ? 1 : -1);
      const trackDeg = round1(normDeg(towardA + opening));
      const available = maxRun(b, trackDeg, 70);
      const realAb = dist(a, b);
      const trackLength = round1(Math.min(available, realAb * 1.9));
      if (trackLength < realAb * 1.45) return null;
      const c = polar(b, trackDeg, realAb);
      const angleAtB = interiorAngle(a, b, c);
      if (angleAtB < 65 || angleAtB > 155) return null;
      // Start C clearly away from the solution (too short or too long).
      const short = r.bool();
      const startDistance = round1(
        short ? r.range(0.25, 0.7) * realAb : r.range(realAb * 1.3, trackLength - 5),
      );
      return { a, b, trackDeg, trackLength, startDistance };
    },
    { a: pt(300, 640), b: pt(520, 520), trackDeg: 20, trackLength: 400, startDistance: 120 },
  );
}

export const SHAPE_START: Triangle = [
  roundPt(polar(pt(C, C), 90, 110)),
  roundPt(polar(pt(C, C), 210, 110)),
  roundPt(polar(pt(C, C), 330, 110)),
];

export function generateShape(rng: Rng): ShapeChallenge {
  return attempt(
    rng,
    (r) => {
      const target: Triangle = [0, 1, 2].map(() =>
        roundPt(pt(r.range(130, 870), r.range(130, 870))),
      ) as Triangle;
      const [p, q, s] = target;
      if (dist(p, q) < 300 || dist(q, s) < 300 || dist(s, p) < 300) return null;
      const angles = [interiorAngle(s, p, q), interiorAngle(p, q, s), interiorAngle(q, s, p)];
      if (Math.min(...angles) < 25) return null;
      for (const v of target) {
        for (const st of SHAPE_START) if (dist(v, st) < 150) return null;
      }
      return { target, start: SHAPE_START };
    },
    { target: [pt(220, 250), pt(780, 330), pt(400, 800)], start: SHAPE_START },
  );
}

function generateChallenge(key: string, day: DayKey, number: number): DailyChallenge {
  const rng = (id: RoundId) => createRng(roundSeed(key, id));
  return {
    gameId: GAME_ID,
    version: GENERATOR_VERSION,
    day,
    number,
    center: generateCenter(rng('center')),
    half: generateHalf(rng('half')),
    angle: generateAngle(rng('angle')),
    distance: generateDistance(rng('distance')),
    shape: generateShape(rng('shape')),
  };
}

export function generateDailyChallenge(day: DayKey): DailyChallenge {
  return generateChallenge(day, day, challengeNumber(day));
}

/** Free play: a fresh challenge from a random id. Not shared, not counted in stats. */
export function generatePracticeChallenge(id: string, day: DayKey): DailyChallenge {
  return generateChallenge(`practice-${id}`, day, 0);
}

/** Random id for a free-play game (crypto when available). */
export function newPracticeId(): string {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
