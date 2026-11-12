import { describe, expect, it } from 'vitest';
import { BOARD_SIZE, clientToBoard } from '../../src/platform/geometry';
import { evaluateRound, isValidAnswer, matchTriangles } from '../../src/games/classic/evaluate';
import { generateDailyChallenge } from '../../src/games/classic/generator';

const c = generateDailyChallenge('2026-12-01');

describe('evaluateRound', () => {
  it('center: error is relative to the radius', () => {
    const p = { x: c.center.center.x + c.center.radius * 0.1, y: c.center.center.y };
    const r = evaluateRound(c, 'center', { point: p });
    expect(r.error).toBeCloseTo(0.1, 10);
    expect(r.details.pct).toBeCloseTo(10, 8);
  });

  it('center: closer answers never score less', () => {
    let prev = 101;
    for (let k = 0; k <= 60; k++) {
      const p = { x: c.center.center.x + k * 4, y: c.center.center.y - k * 2 };
      const s = evaluateRound(c, 'center', { point: p }).score;
      expect(s).toBeLessThanOrEqual(prev);
      prev = s;
    }
  });

  it('half: symmetric around the midpoint', () => {
    expect(evaluateRound(c, 'half', { t: 0.47 }).score).toBe(evaluateRound(c, 'half', { t: 0.53 }).score);
  });

  it('angle: uses circular difference', () => {
    const r = evaluateRound(c, 'angle', { deg: (c.angle.targetDeg + 350) % 360 });
    expect(r.error).toBeCloseTo(10, 8);
  });

  it('distance: signed difference is reported', () => {
    const ab = Math.hypot(c.distance.a.x - c.distance.b.x, c.distance.a.y - c.distance.b.y);
    const r = evaluateRound(c, 'distance', { distance: ab * 0.9 });
    expect(r.details.diffPct).toBeCloseTo(-10, 6);
    expect(r.error).toBeCloseTo(0.1, 8);
  });

  it('shape: correspondence is the best vertex matching', () => {
    const [a, b, t] = c.shape.target;
    const shifted = [
      { x: t.x + 10, y: t.y },
      { x: a.x, y: a.y + 10 },
      { x: b.x - 10, y: b.y },
    ] as [typeof a, typeof a, typeof a];
    const m = matchTriangles(c.shape.target, shifted);
    expect(m.meanDistance).toBeCloseTo(10, 8);
    expect(m.order).toEqual([1, 2, 0]);
  });
});

describe('resolution independence', () => {
  it('the same relative pointer position maps to the same board point on any screen', () => {
    const rects = [
      { left: 0, top: 0, width: 320, height: 320 },
      { left: 16, top: 140, width: 390, height: 390 },
      { left: 300, top: 80, width: 1024, height: 1024 },
      { left: 0, top: 0, width: 600, height: 500 }, // letterboxed
    ];
    for (const rect of rects) {
      const size = Math.min(rect.width, rect.height);
      const ox = rect.left + (rect.width - size) / 2;
      const oy = rect.top + (rect.height - size) / 2;
      const p = clientToBoard(ox + size * 0.25, oy + size * 0.6, rect);
      expect(p.x).toBeCloseTo(BOARD_SIZE * 0.25, 8);
      expect(p.y).toBeCloseTo(BOARD_SIZE * 0.6, 8);
    }
  });
});

describe('isValidAnswer', () => {
  it('rejects malformed values', () => {
    expect(isValidAnswer('center', { point: { x: 'a', y: 1 } })).toBe(false);
    expect(isValidAnswer('center', null)).toBe(false);
    expect(isValidAnswer('half', { t: 2 })).toBe(false);
    expect(isValidAnswer('half', { t: Number.NaN })).toBe(false);
    expect(isValidAnswer('angle', { deg: 400 })).toBe(false);
    expect(isValidAnswer('distance', { distance: -5 })).toBe(false);
    expect(isValidAnswer('shape', { points: [{ x: 1, y: 2 }] })).toBe(false);
  });
  it('accepts well-formed values', () => {
    expect(isValidAnswer('center', { point: { x: 1, y: 2 } })).toBe(true);
    expect(isValidAnswer('half', { t: 0.4 })).toBe(true);
    expect(isValidAnswer('angle', { deg: 359.9 })).toBe(true);
    expect(isValidAnswer('distance', { distance: 300 })).toBe(true);
    expect(isValidAnswer('shape', { points: [{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 6 }] })).toBe(true);
  });
});
