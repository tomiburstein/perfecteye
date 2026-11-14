import { BOARD_SIZE, dist, isFinitePoint, normDeg, polar } from '../../platform/geometry';
import { scoreRound } from './scoring';
import type {
  AnswerMap,
  DailyChallenge,
  DistanceChallenge,
  RoundId,
  RoundResult,
  Triangle,
} from './types';

/**
 * Opening of the angle the player built, in [0, 180]. The answer is stored
 * counter-clockwise from the base ray, but an angle is the same opening on
 * either side of the base, so 300° counter-clockwise = 60° clockwise = 60°.
 */
export function angleOpening(deg: number): number {
  const d = normDeg(deg);
  return d > 180 ? 360 - d : d;
}

/** C's position for a given distance along the track. */
export function distancePointC(ch: DistanceChallenge, distance: number) {
  return polar(ch.b, ch.trackDeg, distance);
}

const PERMUTATIONS: ReadonlyArray<[number, number, number]> = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];

/**
 * Best vertex correspondence between two triangles: the permutation that
 * minimises the mean vertex distance. Deterministic (ties → first in list).
 */
export function matchTriangles(
  target: Triangle,
  guess: Triangle,
): { meanDistance: number; order: [number, number, number] } {
  let best = { meanDistance: Infinity, order: PERMUTATIONS[0] };
  for (const perm of PERMUTATIONS) {
    const mean =
      (dist(target[0], guess[perm[0]]) +
        dist(target[1], guess[perm[1]]) +
        dist(target[2], guess[perm[2]])) /
      3;
    if (mean < best.meanDistance) best = { meanDistance: mean, order: perm };
  }
  return best;
}

export function evaluateRound<K extends RoundId>(
  challenge: DailyChallenge,
  id: K,
  answer: AnswerMap[K],
): RoundResult {
  switch (id) {
    case 'center': {
      const { center, radius } = challenge.center;
      const a = answer as AnswerMap['center'];
      const error = dist(a.point, center) / radius;
      return { score: scoreRound('center', error), error, details: { pct: error * 100 } };
    }
    case 'half': {
      const a = answer as AnswerMap['half'];
      const error = Math.abs(a.t - 0.5);
      return { score: scoreRound('half', error), error, details: { pct: error * 100 } };
    }
    case 'angle': {
      const a = answer as AnswerMap['angle'];
      const yours = angleOpening(a.deg);
      const error = Math.abs(yours - challenge.angle.targetDeg);
      return {
        score: scoreRound('angle', error),
        error,
        details: { target: challenge.angle.targetDeg, yours },
      };
    }
    case 'distance': {
      const a = answer as AnswerMap['distance'];
      const ab = dist(challenge.distance.a, challenge.distance.b);
      const bc = a.distance;
      const error = Math.abs(bc - ab) / ab;
      return {
        score: scoreRound('distance', error),
        error,
        details: { ab, bc, diffPct: ((bc - ab) / ab) * 100 },
      };
    }
    case 'shape': {
      const a = answer as AnswerMap['shape'];
      const { meanDistance } = matchTriangles(challenge.shape.target, a.points);
      const error = meanDistance / BOARD_SIZE;
      return { score: scoreRound('shape', error), error, details: { pct: error * 100 } };
    }
    default:
      throw new Error(`Unknown round ${String(id)}`);
  }
}

// ---- Validation of untrusted answers (e.g. from localStorage) --------------

const finiteIn = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

const pointOnBoard = (p: unknown): boolean =>
  isFinitePoint(p) && finiteIn(p.x, -BOARD_SIZE, 2 * BOARD_SIZE) && finiteIn(p.y, -BOARD_SIZE, 2 * BOARD_SIZE);

export function isValidAnswer(id: RoundId, value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  switch (id) {
    case 'center':
      return pointOnBoard(v.point);
    case 'half':
      return finiteIn(v.t, 0, 1);
    case 'angle':
      return finiteIn(v.deg, 0, 360);
    case 'distance':
      return finiteIn(v.distance, 0, 2 * BOARD_SIZE);
    case 'shape':
      return Array.isArray(v.points) && v.points.length === 3 && v.points.every(pointOnBoard);
    default:
      return false;
  }
}
