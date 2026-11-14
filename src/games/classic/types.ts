import type { DayKey } from '../../platform/date';
import type { Point } from '../../platform/geometry';

export type RoundId = 'center' | 'half' | 'angle' | 'distance' | 'shape';
export const ROUND_IDS: readonly RoundId[] = ['center', 'half', 'angle', 'distance', 'shape'];
export const ROUND_COUNT = ROUND_IDS.length;
export const MAX_ROUND_SCORE = 100;
export const MAX_TOTAL_SCORE = MAX_ROUND_SCORE * ROUND_COUNT;

// ---- Challenges (what the board shows) -------------------------------------

export interface CenterChallenge {
  center: Point;
  radius: number;
}

export interface HalfChallenge {
  start: Point;
  end: Point;
  orientation: 'horizontal' | 'vertical';
}

export interface AngleChallenge {
  vertex: Point;
  rayLength: number;
  /** Opening to reproduce, degrees, measured counter-clockwise from the base ray. */
  targetDeg: number;
  /** Base ray direction while the target is visible. */
  previewBaseDeg: number;
  /** Base ray direction while the player reproduces the angle (rotated). */
  inputBaseDeg: number;
}

export interface DistanceChallenge {
  a: Point;
  b: Point;
  /** Direction of the track C slides along, starting at B. */
  trackDeg: number;
  trackLength: number;
  /** Initial distance from B to C along the track. */
  startDistance: number;
}

export type Triangle = [Point, Point, Point];

export interface ShapeChallenge {
  target: Triangle;
  start: Triangle;
}

export interface DailyChallenge {
  gameId: string;
  version: number;
  day: DayKey;
  number: number;
  center: CenterChallenge;
  half: HalfChallenge;
  angle: AngleChallenge;
  distance: DistanceChallenge;
  shape: ShapeChallenge;
}

// ---- Answers (what the player submits) -------------------------------------

export interface CenterAnswer {
  point: Point;
}
/** Position of the marker along the segment, 0 = start, 1 = end. */
export interface HalfAnswer {
  t: number;
}
/** Opening the player built, counter-clockwise from the input base ray, [0,360). */
export interface AngleAnswer {
  deg: number;
}
/** Distance from B to C along the track. */
export interface DistanceAnswer {
  distance: number;
}
export interface ShapeAnswer {
  points: Triangle;
}

export interface AnswerMap {
  center: CenterAnswer;
  half: HalfAnswer;
  angle: AngleAnswer;
  distance: DistanceAnswer;
  shape: ShapeAnswer;
}
export type AnyAnswer = AnswerMap[RoundId];

// ---- Results ---------------------------------------------------------------

export interface RoundResult {
  score: number;
  /** Error in the unit used by the scoring curve (relative or degrees). */
  error: number;
  /** Extra numbers used to explain the result to the player. */
  details: Record<string, number>;
}

/** Which game is being played: the official daily challenge or a free-play one. */
export type GameRef = { kind: 'daily'; day: DayKey } | { kind: 'practice'; id: string; day: DayKey };
