import { daysBetween, type DayKey } from '../../platform/date';

/** Stable identifier of this daily game on the platform. */
export const GAME_ID = 'perfecteye-classic';

/**
 * Version of the challenge generator. Bumping it changes every future (and
 * past) challenge, so only do it deliberately (see MAINTENANCE in README).
 */
export const GENERATOR_VERSION = 1;

/** UTC day that is challenge #1. */
export const LAUNCH_DAY: DayKey = '2026-11-12';

export function challengeNumber(day: DayKey): number {
  return daysBetween(LAUNCH_DAY, day) + 1;
}

/** Time to answer each test, in milliseconds. */
export const ROUND_TIME_MS = 60_000;

/** How long memory rounds show their target, in milliseconds. */
export const PREVIEW_MS = { angle: 3000, shape: 5000 } as const;
