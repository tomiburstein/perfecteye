import type { RoundId } from './types';

/**
 * SCORING FORMULA (documented in docs/SCORING.md)
 *
 *   excess = max(0, error − tolerance)
 *   score  = round( 100 × 2^( −(excess / halfAt)^exponent ) )   (exponent 1.5 or 2)
 *
 * - error ≤ tolerance  → 100 (absorbs normal touch / pointer imprecision)
 * - error = tolerance + halfAt → 50
 * - grows smoothly towards 0 for large errors
 *
 * The function is pure, deterministic and monotonically non-increasing in the
 * error, so a more accurate answer can never score less than a worse one.
 */
export interface ScoreCurve {
  tolerance: number;
  halfAt: number;
  exponent: number;
}

export const SCORE_CURVES: Record<RoundId, ScoreCurve> = {
  // error = distance to the true centre / circle radius
  center: { tolerance: 0.01, halfAt: 0.1, exponent: 1.5 },
  // error = |marker − midpoint| / segment length
  half: { tolerance: 0.005, halfAt: 0.05, exponent: 1.5 },
  // error = angular difference in degrees
  angle: { tolerance: 1, halfAt: 12, exponent: 1.5 },
  // error = |BC − AB| / AB. Gentler curve (exponent 2): comparing lengths in
  // different directions is hard, so small misses barely cost points.
  distance: { tolerance: 0.02, halfAt: 0.15, exponent: 2 },
  // error = mean vertex distance / board size
  shape: { tolerance: 0.008, halfAt: 0.07, exponent: 1.5 },
};

export function scoreFromError(error: number, curve: ScoreCurve): number {
  if (!Number.isFinite(error) || error < 0) return 0;
  const excess = Math.max(0, error - curve.tolerance);
  const raw = 100 * Math.pow(2, -Math.pow(excess / curve.halfAt, curve.exponent));
  return Math.min(100, Math.max(0, Math.round(raw)));
}

export function scoreRound(id: RoundId, error: number): number {
  return scoreFromError(error, SCORE_CURVES[id]);
}
