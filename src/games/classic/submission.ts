import { addDays, isDayKey, type DayKey } from '../../platform/date';
import { isRecord } from '../../platform/storage';
import { evaluateRound, isValidAnswer } from './evaluate';
import { generateDailyChallenge } from './generator';
import { ROUND_COUNT, ROUND_IDS, type AnswerMap, type AnyAnswer, type RoundId } from './types';

/**
 * A daily result sent to the ranking server. The server never trusts a
 * score: it receives the answers and recomputes everything itself.
 */
export interface Submission {
  day: DayKey;
  playerId: string;
  name: string;
  answers: (AnyAnswer | null)[];
}

export const PLAYER_ID_RE = /^[0-9a-f]{16,32}$/;
export const NAME_MIN = 2;
export const NAME_MAX = 20;

// Small, deliberately conservative list. Names are also length/charset-limited.
const BLOCKED = [
  'puta', 'puto', 'mierda', 'pija', 'concha', 'verga', 'pene', 'culo', 'nazi', 'hitler',
  'fuck', 'shit', 'cunt', 'nigg', 'fag', 'whore', 'bitch', 'dick', 'pussy', 'rape',
];

/** Normalise a player name, or return null if it is not acceptable. */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (name.length < NAME_MIN || name.length > NAME_MAX) return null;
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u.test(name)) return null;
  const folded = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
  if (BLOCKED.some((w) => folded.includes(w))) return null;
  return name;
}

/** Days a submission is accepted for: today, or yesterday (games started before midnight UTC). */
export function acceptedDays(today: DayKey): DayKey[] {
  return [today, addDays(today, -1)];
}

export type ParseError = 'body' | 'day' | 'player' | 'name' | 'answers';

export function parseSubmission(
  body: unknown,
  today: DayKey,
  anyDay = false,
): { ok: true; value: Submission } | { ok: false; error: ParseError } {
  if (!isRecord(body)) return { ok: false, error: 'body' };
  const { day, playerId, name, answers } = body;
  if (!isDayKey(day) || (!anyDay && !acceptedDays(today).includes(day))) return { ok: false, error: 'day' };
  if (typeof playerId !== 'string' || !PLAYER_ID_RE.test(playerId)) return { ok: false, error: 'player' };
  const clean = cleanName(name);
  if (!clean) return { ok: false, error: 'name' };
  if (!Array.isArray(answers) || answers.length !== ROUND_COUNT) return { ok: false, error: 'answers' };
  for (let i = 0; i < ROUND_COUNT; i++) {
    if (answers[i] !== null && !isValidAnswer(ROUND_IDS[i], answers[i])) return { ok: false, error: 'answers' };
  }
  return { ok: true, value: { day, playerId, name: clean, answers: answers as (AnyAnswer | null)[] } };
}

/** Authoritative scores for a set of answers (null = no answer = 0). */
export function scoreAnswers(day: DayKey, answers: (AnyAnswer | null)[]): number[] {
  const challenge = generateDailyChallenge(day);
  return ROUND_IDS.map((id, i) => {
    const a = answers[i];
    return a === null ? 0 : evaluateRound(challenge, id, a as AnswerMap[RoundId]).score;
  });
}

// ---- What the server returns -----------------------------------------------

export interface RankingRow {
  rank: number;
  name: string;
  total: number;
  me: boolean;
}

export interface MyStanding {
  name: string;
  scores: number[];
  total: number;
  rank: number;
  /** % of the other players today you beat (null if you're the only one). */
  percentiles: { total: number | null; rounds: (number | null)[] };
}

export interface DaySummary {
  day: DayKey;
  players: number;
  top: RankingRow[];
  me: MyStanding | null;
}

const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
const isPct = (v: unknown) => v === null || isInt(v, 0, 100);

/** Validate a summary received from the network (client side). */
export function parseSummary(value: unknown): DaySummary | null {
  if (!isRecord(value) || !isDayKey(value.day) || !isInt(value.players, 0, 1e9)) return null;
  if (!Array.isArray(value.top)) return null;
  const top: RankingRow[] = [];
  for (const r of value.top) {
    if (!isRecord(r) || !isInt(r.rank, 1, 1e9) || typeof r.name !== 'string' || !isInt(r.total, 0, 500))
      return null;
    top.push({ rank: r.rank, name: r.name.slice(0, NAME_MAX), total: r.total, me: r.me === true });
  }
  let me: MyStanding | null = null;
  if (value.me !== null && value.me !== undefined) {
    const m = value.me;
    if (!isRecord(m) || typeof m.name !== 'string' || !isInt(m.total, 0, 500) || !isInt(m.rank, 1, 1e9)) return null;
    if (!Array.isArray(m.scores) || m.scores.length !== ROUND_COUNT || !m.scores.every((s) => isInt(s, 0, 100))) return null;
    const p = m.percentiles;
    if (!isRecord(p) || !isPct(p.total) || !Array.isArray(p.rounds) || p.rounds.length !== ROUND_COUNT || !p.rounds.every(isPct))
      return null;
    me = {
      name: m.name.slice(0, NAME_MAX),
      scores: m.scores as number[],
      total: m.total,
      rank: m.rank,
      percentiles: { total: p.total as number | null, rounds: p.rounds as (number | null)[] },
    };
  }
  return { day: value.day, players: value.players, top, me };
}
