/**
 * Ranking storage on Cloudflare D1 (SQLite). Runs only on the server
 * (Cloudflare Pages Functions). Free tier: 5 GB, 5M reads and 100k writes/day.
 */
import type { DayKey } from '../platform/date';
import type { DaySummary, MyStanding, RankingRow, Submission } from '../games/classic/submission';
import { scoreAnswers } from '../games/classic/submission';
import { addDays } from '../platform/date';
import { BOARD_SIZE, dist } from '../platform/geometry';
import { angleOpening, isValidAnswer, matchTriangles } from '../games/classic/evaluate';
import { generateDailyChallenge } from '../games/classic/generator';
import { ROUND_IDS, type AnswerMap } from '../games/classic/types';

/** Minimal subset of the D1 API we use (keeps us free of extra type packages). */
export interface D1Like {
  prepare(sql: string): D1Stmt;
  batch(stmts: D1Stmt[]): Promise<unknown>;
}
export interface D1Stmt {
  bind(...values: unknown[]): D1Stmt;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS results (
    day TEXT NOT NULL,
    player_id TEXT NOT NULL,
    name TEXT NOT NULL,
    s1 INTEGER NOT NULL, s2 INTEGER NOT NULL, s3 INTEGER NOT NULL, s4 INTEGER NOT NULL, s5 INTEGER NOT NULL,
    total INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (day, player_id)
  )`,
  `CREATE INDEX IF NOT EXISTS results_day_total ON results (day, total DESC)`,
  // Unique visitors per day (random anonymous player id, no personal data).
  `CREATE TABLE IF NOT EXISTS visits (day TEXT NOT NULL, player_id TEXT NOT NULL, PRIMARY KEY (day, player_id))`,
  // Simple daily counters (e.g. finished free-play games).
  `CREATE TABLE IF NOT EXISTS counters (day TEXT NOT NULL, name TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, name))`,
  `CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at INTEGER NOT NULL,
    day TEXT NOT NULL,
    player_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    message TEXT NOT NULL,
    contact TEXT NOT NULL DEFAULT '',
    lang TEXT NOT NULL DEFAULT '',
    resolved INTEGER NOT NULL DEFAULT 0
  )`,
];

/** Columns added after the first release (added in place, data is kept). */
const RESULT_COLUMNS: [string, string][] = [
  ['hidden', 'INTEGER NOT NULL DEFAULT 0'],
  ['answers', 'TEXT'],
];

let schemaReady = false;
/** Creates/updates tables on first use, so the owner never has to run SQL by hand. */
export async function ensureSchema(db: D1Like): Promise<void> {
  if (schemaReady) return;
  await db.batch(SCHEMA.map((sql) => db.prepare(sql)));
  const cols = await db.prepare('PRAGMA table_info(results)').all<{ name: string }>();
  const have = new Set(cols.results.map((c) => c.name));
  for (const [name, type] of RESULT_COLUMNS) {
    if (!have.has(name)) await db.prepare(`ALTER TABLE results ADD COLUMN ${name} ${type}`).run();
  }
  schemaReady = true;
}

/**
 * Store a result. The FIRST result of a player for a day is final; sending
 * again only updates the display name.
 */
export async function saveResult(db: D1Like, s: Submission, now: number): Promise<void> {
  const scores = scoreAnswers(s.day, s.answers);
  const total = scores.reduce((a, b) => a + b, 0);
  await db
    .prepare(
      `INSERT INTO results (day, player_id, name, s1, s2, s3, s4, s5, total, created_at, answers)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (day, player_id) DO UPDATE SET name = excluded.name`,
    )
    .bind(s.day, s.playerId, s.name, ...scores, total, now, JSON.stringify(s.answers))
    .run();
}

const pct = (below: number, players: number): number | null =>
  players > 1 ? Math.round((100 * below) / (players - 1)) : null;

export async function daySummary(
  db: D1Like,
  day: DayKey,
  playerId: string | null,
  limit = 50,
): Promise<DaySummary> {
  const countRow = await db.prepare('SELECT COUNT(*) AS n FROM results WHERE day = ?').bind(day).first<{ n: number }>();
  const players = Number(countRow?.n ?? 0);

  const topRows = await db
    .prepare(
      `SELECT player_id, name, total,
              RANK() OVER (ORDER BY total DESC) AS rank
       FROM results WHERE day = ? AND hidden = 0
       ORDER BY total DESC, created_at ASC LIMIT ?`,
    )
    .bind(day, limit)
    .all<{ player_id: string; name: string; total: number; rank: number }>();
  const top: RankingRow[] = topRows.results.map((r) => ({
    rank: Number(r.rank),
    name: r.name,
    total: Number(r.total),
    me: playerId !== null && r.player_id === playerId,
  }));

  let me: MyStanding | null = null;
  if (playerId) {
    const mine = await db
      .prepare('SELECT name, s1, s2, s3, s4, s5, total FROM results WHERE day = ? AND player_id = ?')
      .bind(day, playerId)
      .first<{ name: string; s1: number; s2: number; s3: number; s4: number; s5: number; total: number }>();
    if (mine) {
      const scores = [mine.s1, mine.s2, mine.s3, mine.s4, mine.s5].map(Number);
      const below = await db
        .prepare(
          `SELECT SUM(total < ?) AS bt, SUM(total > ?) AS above,
                  SUM(s1 < ?) AS b1, SUM(s2 < ?) AS b2, SUM(s3 < ?) AS b3, SUM(s4 < ?) AS b4, SUM(s5 < ?) AS b5
           FROM results WHERE day = ?`,
        )
        .bind(mine.total, mine.total, ...scores, day)
        .first<Record<'bt' | 'above' | 'b1' | 'b2' | 'b3' | 'b4' | 'b5', number>>();
      const b = (k: 'bt' | 'b1' | 'b2' | 'b3' | 'b4' | 'b5') => Number(below?.[k] ?? 0);
      me = {
        name: mine.name,
        scores,
        total: Number(mine.total),
        rank: Number(below?.above ?? 0) + 1,
        percentiles: {
          total: pct(b('bt'), players),
          rounds: (['b1', 'b2', 'b3', 'b4', 'b5'] as const).map((k) => pct(b(k), players)),
        },
      };
    }
  }
  return { day, players, top, me };
}

// ---- How the world answered -------------------------------------------------

/** Per test, how far each player was from the solution (signed where it makes sense). */
export interface WorldAnswers {
  day: string;
  players: number;
  /** Offsets from the true centre, divided by the radius: [dx, dy]. */
  center: [number, number][];
  /** Marker position minus the midpoint, % of the line length. */
  half: number[];
  /** Built opening minus the target, degrees. */
  angle: number[];
  /** (BC − AB) / AB, %. */
  distance: number[];
  /** Mean vertex distance, % of the board (always ≥ 0). */
  shape: number[];
  mine: { center: [number, number] | null; half: number | null; angle: number | null; distance: number | null; shape: number | null } | null;
}

const MAX_SAMPLE = 1000;
const r2 = (v: number) => Math.round(v * 100) / 100;

function measure(day: string, answers: unknown) {
  const c = generateDailyChallenge(day);
  const out: WorldAnswers['mine'] = { center: null, half: null, angle: null, distance: null, shape: null };
  if (!Array.isArray(answers) || answers.length !== ROUND_IDS.length) return out;
  const ok = (i: number) => answers[i] !== null && isValidAnswer(ROUND_IDS[i], answers[i]);
  if (ok(0)) {
    const a = answers[0] as AnswerMap['center'];
    out.center = [r2((a.point.x - c.center.center.x) / c.center.radius), r2((a.point.y - c.center.center.y) / c.center.radius)];
  }
  if (ok(1)) out.half = r2(((answers[1] as AnswerMap['half']).t - 0.5) * 100);
  if (ok(2)) out.angle = r2(angleOpening((answers[2] as AnswerMap['angle']).deg) - c.angle.targetDeg);
  if (ok(3)) {
    const ab = dist(c.distance.a, c.distance.b);
    out.distance = r2((((answers[3] as AnswerMap['distance']).distance - ab) / ab) * 100);
  }
  if (ok(4)) out.shape = r2((matchTriangles(c.shape.target, (answers[4] as AnswerMap['shape']).points).meanDistance / BOARD_SIZE) * 100);
  return out;
}

/** Only for players who already finished that day, so nobody gets spoilers. */
export async function worldAnswers(db: D1Like, day: string, playerId: string): Promise<WorldAnswers | null> {
  const mine = await db
    .prepare('SELECT answers FROM results WHERE day = ? AND player_id = ?')
    .bind(day, playerId)
    .first<{ answers: string | null }>();
  if (!mine) return null;
  const rows = await db
    .prepare('SELECT answers FROM results WHERE day = ? AND answers IS NOT NULL ORDER BY created_at DESC LIMIT ?')
    .bind(day, MAX_SAMPLE)
    .all<{ answers: string }>();
  const res: WorldAnswers = { day, players: rows.results.length, center: [], half: [], angle: [], distance: [], shape: [], mine: null };
  for (const row of rows.results) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(row.answers);
    } catch {
      continue;
    }
    const m = measure(day, parsed)!;
    if (m.center) res.center.push(m.center);
    if (m.half !== null) res.half.push(m.half);
    if (m.angle !== null) res.angle.push(m.angle);
    if (m.distance !== null) res.distance.push(m.distance);
    if (m.shape !== null) res.shape.push(m.shape);
  }
  if (mine.answers) {
    try {
      res.mine = measure(day, JSON.parse(mine.answers));
    } catch {
      res.mine = null;
    }
  }
  return res;
}

// ---- Visits, counters and feedback -----------------------------------------

export async function recordVisit(db: D1Like, day: string, playerId: string): Promise<void> {
  await db.prepare('INSERT OR IGNORE INTO visits (day, player_id) VALUES (?, ?)').bind(day, playerId).run();
}

export const COUNTERS = ['practice_finish'] as const;
export type CounterName = (typeof COUNTERS)[number];

export async function bumpCounter(db: D1Like, day: string, name: CounterName): Promise<void> {
  await db
    .prepare('INSERT INTO counters (day, name, n) VALUES (?, ?, 1) ON CONFLICT (day, name) DO UPDATE SET n = n + 1')
    .bind(day, name)
    .run();
}

export const FEEDBACK_KINDS = ['bug', 'idea', 'name', 'other'] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];
export const FEEDBACK_MAX = 1000;
export const FEEDBACK_PER_DAY = 5;

/** Stores a message; false if this player already sent too many today. */
export async function addFeedback(
  db: D1Like,
  f: { day: string; playerId: string; kind: FeedbackKind; message: string; contact: string; lang: string },
  now: number,
): Promise<boolean> {
  const count = await db
    .prepare('SELECT COUNT(*) AS n FROM feedback WHERE day = ? AND player_id = ?')
    .bind(f.day, f.playerId)
    .first<{ n: number }>();
  if (Number(count?.n ?? 0) >= FEEDBACK_PER_DAY) return false;
  await db
    .prepare('INSERT INTO feedback (created_at, day, player_id, kind, message, contact, lang) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(now, f.day, f.playerId, f.kind, f.message, f.contact, f.lang)
    .run();
  return true;
}

// ---- Owner's admin panel ------------------------------------------------------

export interface AdminOverview {
  days: { day: string; visitors: number; daily: number; practice: number }[];
  feedback: { id: number; createdAt: number; kind: string; message: string; contact: string; lang: string; resolved: boolean }[];
  ranking: { day: string; playerId: string; name: string; total: number; hidden: boolean }[];
}

export async function adminOverview(db: D1Like, today: string, days = 14): Promise<AdminOverview> {
  const from = addDays(today, -(days - 1));
  const [visits, results, counters, feedback, ranking] = await Promise.all([
    db.prepare('SELECT day, COUNT(*) AS n FROM visits WHERE day >= ? GROUP BY day').bind(from).all<{ day: string; n: number }>(),
    db.prepare('SELECT day, COUNT(*) AS n FROM results WHERE day >= ? GROUP BY day').bind(from).all<{ day: string; n: number }>(),
    db.prepare("SELECT day, n FROM counters WHERE day >= ? AND name = 'practice_finish'").bind(from).all<{ day: string; n: number }>(),
    db.prepare('SELECT id, created_at, kind, message, contact, lang, resolved FROM feedback ORDER BY resolved ASC, id DESC LIMIT 100')
      .all<{ id: number; created_at: number; kind: string; message: string; contact: string; lang: string; resolved: number }>(),
    db.prepare('SELECT day, player_id, name, total, hidden FROM results WHERE day >= ? ORDER BY day DESC, total DESC LIMIT 300')
      .bind(addDays(today, -1))
      .all<{ day: string; player_id: string; name: string; total: number; hidden: number }>(),
  ]);
  const by = (rows: { day: string; n: number }[]) => new Map(rows.map((r) => [r.day, Number(r.n)]));
  const v = by(visits.results);
  const r = by(results.results);
  const p = by(counters.results);
  return {
    days: Array.from({ length: days }, (_, i) => {
      const day = addDays(today, -i);
      return { day, visitors: v.get(day) ?? 0, daily: r.get(day) ?? 0, practice: p.get(day) ?? 0 };
    }),
    feedback: feedback.results.map((f) => ({
      id: Number(f.id),
      createdAt: Number(f.created_at),
      kind: f.kind,
      message: f.message,
      contact: f.contact,
      lang: f.lang,
      resolved: Number(f.resolved) === 1,
    })),
    ranking: ranking.results.map((x) => ({
      day: x.day,
      playerId: x.player_id,
      name: x.name,
      total: Number(x.total),
      hidden: Number(x.hidden) === 1,
    })),
  };
}

export async function setHidden(db: D1Like, day: string, playerId: string, hidden: boolean): Promise<void> {
  await db.prepare('UPDATE results SET hidden = ? WHERE day = ? AND player_id = ?').bind(hidden ? 1 : 0, day, playerId).run();
}

export async function setResolved(db: D1Like, id: number, resolved: boolean): Promise<void> {
  await db.prepare('UPDATE feedback SET resolved = ? WHERE id = ?').bind(resolved ? 1 : 0, id).run();
}
