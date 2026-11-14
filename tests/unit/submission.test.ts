import { describe, expect, it } from 'vitest';
import { cleanName, parseSubmission, parseSummary, scoreAnswers } from '../../src/games/classic/submission';
import { generateDailyChallenge } from '../../src/games/classic/generator';
import { confirmRound, newProgress, parseProgress, scoresFor, markInputStarted, answersOf } from '../../src/games/classic/persistence';

const day = '2026-11-14';
const c = generateDailyChallenge(day);
const perfect = [
  { point: c.center.center },
  { t: 0.5 },
  { deg: c.angle.targetDeg },
  { distance: Math.hypot(c.distance.a.x - c.distance.b.x, c.distance.a.y - c.distance.b.y) },
  { points: c.shape.target },
];
const base = { day, playerId: 'a1b2c3d4e5f60718', name: 'Ana', answers: perfect };

describe('player names', () => {
  it('accepts normal names and trims spaces', () => {
    expect(cleanName('  Tomás   B ')).toBe('Tomás B');
    expect(cleanName('ojo_fino-99')).toBe('ojo_fino-99');
  });
  it('rejects bad names', () => {
    for (const n of ['a', 'x'.repeat(21), '<script>', 'hola!', '', ' ', 123, null, 'PuTa madre', 'f.u.c.k', '-start']) {
      expect(cleanName(n), String(n)).toBeNull();
    }
  });
});

describe('parseSubmission', () => {
  it('accepts a valid submission for today or yesterday', () => {
    expect(parseSubmission(base, day).ok).toBe(true);
    expect(parseSubmission(base, '2026-11-15').ok).toBe(true);
  });
  it('rejects other days, bad ids and bad answers', () => {
    expect(parseSubmission(base, '2026-11-16')).toEqual({ ok: false, error: 'day' });
    expect(parseSubmission({ ...base, playerId: 'xyz' }, day)).toEqual({ ok: false, error: 'player' });
    expect(parseSubmission({ ...base, answers: perfect.slice(0, 4) }, day)).toEqual({ ok: false, error: 'answers' });
    expect(parseSubmission({ ...base, answers: [{ t: 5 }, null, null, null, null] }, day)).toEqual({ ok: false, error: 'answers' });
    expect(parseSubmission('nope', day)).toEqual({ ok: false, error: 'body' });
  });
  it('allows null answers (time ran out)', () => {
    expect(parseSubmission({ ...base, answers: [null, null, null, null, null] }, day).ok).toBe(true);
  });
});

describe('scoreAnswers (server-side scoring)', () => {
  it('recomputes scores from answers, ignoring any claimed score', () => {
    expect(scoreAnswers(day, perfect)).toEqual([100, 100, 100, 100, 100]);
    expect(scoreAnswers(day, [null, null, null, null, null])).toEqual([0, 0, 0, 0, 0]);
  });
});

describe('parseSummary (client-side validation of server data)', () => {
  it('accepts a well-formed summary and rejects garbage', () => {
    const ok = {
      day,
      players: 3,
      top: [{ rank: 1, name: 'Ana', total: 450, me: true }],
      me: { name: 'Ana', scores: [90, 90, 90, 90, 90], total: 450, rank: 1, percentiles: { total: 100, rounds: [100, 50, null, 0, 100] } },
    };
    expect(parseSummary(ok)?.me?.percentiles.rounds[2]).toBeNull();
    expect(parseSummary({ ...ok, players: -1 })).toBeNull();
    expect(parseSummary({ ...ok, top: [{ rank: 1, name: 'x', total: 999 }] })).toBeNull();
    expect(parseSummary('<html>')).toBeNull();
  });
});

describe('round timer in saved progress', () => {
  it('records the start once and survives a reload', () => {
    let p = markInputStarted(newProgress(day, 1), 0, 1000);
    expect(markInputStarted(p, 0, 9999).inputStartedAt[0]).toBe(1000);
    p = confirmRound(p, 0, null, 61_000, true)!;
    expect(p).not.toBeNull();
    const reloaded = parseProgress(JSON.parse(JSON.stringify(p)))!;
    expect(reloaded.rounds[0]).toEqual({ answer: null, at: 61_000, timedOut: true });
    expect(scoresFor(c, reloaded)[0]).toBe(0);
    expect(answersOf(reloaded)[0]).toBeNull();
  });
  it('a null answer is only allowed when time ran out', () => {
    expect(confirmRound(newProgress(day, 1), 0, null, 5, false)).toBeNull();
  });
});
