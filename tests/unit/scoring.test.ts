import { describe, expect, it } from 'vitest';
import { SCORE_CURVES, scoreFromError, scoreRound } from '../../src/games/classic/scoring';
import { ROUND_IDS } from '../../src/games/classic/types';

describe('scoreFromError', () => {
  for (const id of ROUND_IDS) {
    const curve = SCORE_CURVES[id];
    describe(id, () => {
      it('gives 100 to a perfect answer', () => {
        expect(scoreRound(id, 0)).toBe(100);
      });

      it('gives 100 within the touch tolerance', () => {
        expect(scoreRound(id, curve.tolerance)).toBe(100);
        expect(scoreRound(id, curve.tolerance * 0.5)).toBe(100);
      });

      it('gives 50 at tolerance + halfAt', () => {
        expect(scoreRound(id, curve.tolerance + curve.halfAt)).toBe(50);
      });

      it('is monotonically non-increasing and within [0, 100]', () => {
        let prev = 101;
        const max = (curve.tolerance + curve.halfAt) * 8;
        for (let i = 0; i <= 5000; i++) {
          const s = scoreRound(id, (max * i) / 5000);
          expect(Number.isInteger(s)).toBe(true);
          expect(s).toBeGreaterThanOrEqual(0);
          expect(s).toBeLessThanOrEqual(100);
          expect(s).toBeLessThanOrEqual(prev);
          prev = s;
        }
      });

      it('reaches 0 for huge errors', () => {
        expect(scoreRound(id, (curve.tolerance + curve.halfAt) * 10)).toBe(0);
      });

      it('is deterministic', () => {
        const e = curve.halfAt * 0.37;
        expect(scoreRound(id, e)).toBe(scoreRound(id, e));
      });
    });
  }

  it('returns 0 for invalid errors', () => {
    const c = SCORE_CURVES.center;
    expect(scoreFromError(Number.NaN, c)).toBe(0);
    expect(scoreFromError(-1, c)).toBe(0);
    expect(scoreFromError(Number.POSITIVE_INFINITY, c)).toBe(0);
  });

  it('matches documented reference values', () => {
    // These values are listed in docs/SCORING.md — update both together.
    expect(scoreRound('center', 0.03)).toBe(94);
    expect(scoreRound('center', 0.05)).toBe(84);
    expect(scoreRound('half', 0.02)).toBe(89);
    expect(scoreRound('angle', 5)).toBe(88);
    expect(scoreRound('angle', 10)).toBe(64);
    expect(scoreRound('distance', 0.05)).toBe(97);
    expect(scoreRound('distance', 0.1)).toBe(82);
    expect(scoreRound('distance', 0.2)).toBe(37);
    expect(scoreRound('shape', 0.04)).toBe(81);
  });
});
