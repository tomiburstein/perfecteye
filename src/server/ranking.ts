/**
 * Ranking storage on Cloudflare D1 (SQLite). Runs only on the server
 * (Cloudflare Pages Functions). Free tier: 5 GB, 5M reads and 100k writes/day.
 */
import type { DayKey } from '../platform/date';
import type { DaySummary, MyStanding, RankingRow, Submission } from '../games/classic/submission';
import { scoreAnswers } from '../games/classic/submission';

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
];

let schemaReady = false;
/** Creates the table on first use, so the owner never has to run SQL by hand. */
export async function ensureSchema(db: D1Like): Promise<void> {
  if (schemaReady) return;
  await db.batch(SCHEMA.map((sql) => db.prepare(sql)));
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
      `INSERT INTO results (day, player_id, name, s1, s2, s3, s4, s5, total, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (day, player_id) DO UPDATE SET name = excluded.name`,
    )
    .bind(s.day, s.playerId, s.name, ...scores, total, now)
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
       FROM results WHERE day = ?
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
