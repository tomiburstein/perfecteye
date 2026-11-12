import { describe, expect, it } from 'vitest';
import { addDays } from '../../src/platform/date';
import { createMemoryStore, writeJson } from '../../src/platform/storage';
import { generateDailyChallenge } from '../../src/games/classic/generator';
import {
  STORAGE_KEYS,
  confirmRound,
  currentRoundIndex,
  findResumableDay,
  isFinished,
  loadHistory,
  loadProgress,
  markPreviewed,
  newProgress,
  parseHistory,
  parseProgress,
  recordFinished,
  saveProgress,
  type GameProgress,
} from '../../src/games/classic/persistence';
import { computeStats } from '../../src/games/classic/stats';
import { dist } from '../../src/platform/geometry';

const DAY = '2026-11-20';
const ch = generateDailyChallenge(DAY);
const perfectAnswers = [
  { point: ch.center.center },
  { t: 0.5 },
  { deg: ch.angle.targetDeg },
  { distance: dist(ch.distance.a, ch.distance.b) },
  { points: ch.shape.target },
];

function playAll(p: GameProgress, answers = perfectAnswers): GameProgress {
  let cur = p;
  answers.forEach((a, i) => {
    const next = confirmRound(cur, i, a as never, 1000 + i);
    if (!next) throw new Error('confirm failed');
    cur = next;
  });
  return cur;
}

describe('game progress', () => {
  it('saves and restores progress exactly (reload-safe)', () => {
    const store = createMemoryStore();
    let p = newProgress(DAY, 1);
    p = confirmRound(p, 0, perfectAnswers[0] as never, 5)!;
    p = markPreviewed(p, 2);
    saveProgress(store, p);
    expect(loadProgress(store, DAY)).toEqual(p);
    expect(currentRoundIndex(loadProgress(store, DAY)!)).toBe(1);
  });

  it('cannot score the same round twice', () => {
    let p = newProgress(DAY, 1);
    p = confirmRound(p, 0, { point: { x: 10, y: 10 } } as never, 2)!;
    // Trying to re-answer round 0 (e.g. after a reload) is refused.
    expect(confirmRound(p, 0, perfectAnswers[0] as never, 3)).toBeNull();
    // Skipping ahead is refused too.
    expect(confirmRound(p, 3, perfectAnswers[3] as never, 3)).toBeNull();
  });

  it('rejects invalid answers', () => {
    expect(confirmRound(newProgress(DAY, 1), 0, { point: { x: Number.NaN, y: 0 } } as never, 2)).toBeNull();
  });

  it('keeps a memory round marked as previewed after reload', () => {
    const store = createMemoryStore();
    saveProgress(store, markPreviewed(newProgress(DAY, 1), 4));
    expect(loadProgress(store, DAY)?.previewed[4]).toBe(true);
  });

  it('discards corrupted or tampered progress', () => {
    const store = createMemoryStore();
    store.set(STORAGE_KEYS.progress, '{not json');
    expect(loadProgress(store, DAY)).toBeNull();
    const p = playAll(newProgress(DAY, 1));
    const gap = { ...p, rounds: [null, ...p.rounds.slice(1)] };
    expect(parseProgress(gap)).toBeNull();
    expect(parseProgress({ ...p, day: '2026-13-01' })).toBeNull();
    expect(parseProgress({ ...p, rounds: p.rounds.slice(0, 3) })).toBeNull();
    writeJson(store, STORAGE_KEYS.progress, { [DAY]: { ...p, rounds: [{ answer: { point: 'x' }, at: 1 }, null, null, null, null] } });
    expect(loadProgress(store, DAY)).toBeNull();
  });
});

describe('history', () => {
  it('records a finished game once, with recomputed scores', () => {
    const store = createMemoryStore();
    const p = playAll(newProgress(DAY, 1));
    expect(isFinished(p)).toBe(true);
    const entry = recordFinished(store, p, 99)!;
    expect(entry.scores).toEqual([100, 100, 100, 100, 100]);
    expect(entry.total).toBe(500);
    expect(entry.number).toBe(ch.number);
    // A second attempt does not overwrite the first result.
    const worse = playAll(newProgress(DAY, 2), [
      { point: { x: 0, y: 0 } },
      { t: 0 },
      { deg: 0 },
      { distance: 20 },
      { points: ch.shape.start },
    ]);
    expect(recordFinished(store, worse, 100)!.total).toBe(500);
    expect(loadHistory(store)[DAY].finishedAt).toBe(99);
  });

  it('does not record unfinished games', () => {
    const store = createMemoryStore();
    expect(recordFinished(store, newProgress(DAY, 1), 1)).toBeNull();
    expect(loadHistory(store)).toEqual({});
  });

  it('drops invalid history entries', () => {
    const good = { day: DAY, number: 9, scores: [1, 2, 3, 4, 5], total: 15, finishedAt: 1 };
    const h = parseHistory({
      [DAY]: good,
      '2026-11-21': { ...good, day: '2026-11-21', total: 999 }, // total mismatch
      '2026-11-22': { ...good, day: '2026-11-22', scores: [101, 0, 0, 0, 0], total: 101 },
      '2026-11-23': { ...good, day: '2026-11-24' }, // key mismatch
      nonsense: good,
    });
    expect(Object.keys(h)).toEqual([DAY]);
    expect(parseHistory('garbage')).toEqual({});
    expect(parseHistory([1, 2])).toEqual({});
  });

  it('offers to finish yesterday’s started game after midnight UTC', () => {
    const store = createMemoryStore();
    const yesterday = addDays(DAY, -1);
    let p = newProgress(yesterday, 1);
    expect(findResumableDay(store, DAY)).toBeNull();
    p = confirmRound(p, 0, { point: { x: 500, y: 500 } } as never, 2)!;
    saveProgress(store, p);
    expect(findResumableDay(store, DAY)).toBe(yesterday);
    // Not offered two days later.
    expect(findResumableDay(store, addDays(DAY, 1))).toBeNull();
  });
});

describe('stats', () => {
  const entry = (day: string, total: number) => ({
    day,
    number: 1,
    scores: [total / 5, total / 5, total / 5, total / 5, total / 5],
    total,
    finishedAt: 1,
  });

  it('computes totals, streaks and the 30-day window', () => {
    const today = '2026-12-10';
    const history = Object.fromEntries(
      [
        entry('2026-12-01', 300),
        entry('2026-12-02', 400),
        entry('2026-12-03', 350),
        entry('2026-12-08', 250),
        entry('2026-12-09', 450),
        entry('2026-12-10', 500),
      ].map((e) => [e.day, e]),
    );
    const s = computeStats(history, today);
    expect(s.played).toBe(6);
    expect(s.best).toBe(500);
    expect(s.average).toBeCloseTo(375, 8);
    expect(s.currentStreak).toBe(3);
    expect(s.maxStreak).toBe(3);
    expect(s.last30).toHaveLength(30);
    expect(s.last30[29]).toEqual({ day: today, total: 500 });
    expect(s.rounds[0].best).toBe(100);
  });

  it('keeps the streak alive until the end of today', () => {
    const history = { '2026-12-09': entry('2026-12-09', 300) };
    expect(computeStats(history, '2026-12-10').currentStreak).toBe(1);
    expect(computeStats(history, '2026-12-11').currentStreak).toBe(0);
  });

  it('handles an empty history', () => {
    const s = computeStats({}, '2026-12-10');
    expect(s).toMatchObject({ played: 0, best: null, average: null, currentStreak: 0, maxStreak: 0 });
  });
});
