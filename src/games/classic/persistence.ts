import { addDays, daysBetween, isDayKey, type DayKey } from '../../platform/date';
import { isRecord, readJson, writeJson, type KeyValueStore } from '../../platform/storage';
import { GAME_ID } from './config';
import { evaluateRound, isValidAnswer } from './evaluate';
import { generateDailyChallenge } from './generator';
import {
  MAX_ROUND_SCORE,
  ROUND_COUNT,
  ROUND_IDS,
  type AnswerMap,
  type AnyAnswer,
  type DailyChallenge,
  type RoundId,
} from './types';

/**
 * Local persistence for PerfectEye.
 *
 * Everything read back from storage is treated as untrusted and validated.
 * Scores are never trusted from storage for in-progress games: they are
 * recomputed from the stored answer, which is deterministic.
 */

export const STORAGE_KEYS = {
  progress: `${GAME_ID}.v1.progress`,
  history: `${GAME_ID}.v1.history`,
  practice: `${GAME_ID}.v1.practiceHistory`,
} as const;

/** Maximum free-play games kept on the device. */
export const PRACTICE_HISTORY_LIMIT = 300;

export interface ConfirmedRound {
  /** null only when time ran out before any answer was placed (scores 0). */
  answer: AnyAnswer | null;
  at: number;
  timedOut?: true;
}

export interface GameProgress {
  v: 1;
  day: DayKey;
  startedAt: number;
  rounds: (ConfirmedRound | null)[];
  /** Memory rounds whose target was already shown (cannot be shown again). */
  previewed: boolean[];
  /** When each round's 60-second answer timer started (survives reloads). */
  inputStartedAt: (number | null)[];
}

export interface HistoryEntry {
  day: DayKey;
  number: number;
  scores: number[];
  total: number;
  finishedAt: number;
}

export type History = Record<DayKey, HistoryEntry>;

// ---- Validation ------------------------------------------------------------

const isTimestamp = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0;

export function parseProgress(value: unknown): GameProgress | null {
  if (!isRecord(value) || value.v !== 1 || !isDayKey(value.day) || !isTimestamp(value.startedAt))
    return null;
  if (!Array.isArray(value.rounds) || value.rounds.length !== ROUND_COUNT) return null;
  if (!Array.isArray(value.previewed) || value.previewed.length !== ROUND_COUNT) return null;
  const rounds: (ConfirmedRound | null)[] = [];
  for (let i = 0; i < ROUND_COUNT; i++) {
    const r = value.rounds[i];
    if (r === null) {
      rounds.push(null);
      continue;
    }
    if (!isRecord(r) || !isTimestamp(r.at)) return null;
    if (r.answer === null && r.timedOut === true) {
      rounds.push({ answer: null, at: r.at, timedOut: true });
      continue;
    }
    if (!isValidAnswer(ROUND_IDS[i], r.answer)) return null;
    rounds.push({ answer: r.answer as AnyAnswer, at: r.at, ...(r.timedOut === true ? { timedOut: true as const } : {}) });
  }
  // Rounds must be confirmed in order: no gaps.
  const firstOpen = rounds.indexOf(null);
  if (firstOpen !== -1 && rounds.slice(firstOpen).some((r) => r !== null)) return null;
  return {
    v: 1,
    day: value.day,
    startedAt: value.startedAt,
    rounds,
    previewed: value.previewed.map((p) => p === true),
    inputStartedAt:
      Array.isArray(value.inputStartedAt) && value.inputStartedAt.length === ROUND_COUNT
        ? value.inputStartedAt.map((t) => (isTimestamp(t) ? t : null))
        : Array.from({ length: ROUND_COUNT }, () => null),
  };
}

function parseHistoryEntry(day: string, value: unknown): HistoryEntry | null {
  if (!isDayKey(day) || !isRecord(value) || value.day !== day) return null;
  const { number, scores, total, finishedAt } = value;
  if (typeof number !== 'number' || !Number.isInteger(number)) return null;
  if (!isTimestamp(finishedAt)) return null;
  if (!Array.isArray(scores) || scores.length !== ROUND_COUNT) return null;
  if (
    !scores.every(
      (s) => typeof s === 'number' && Number.isInteger(s) && s >= 0 && s <= MAX_ROUND_SCORE,
    )
  )
    return null;
  const sum = (scores as number[]).reduce((a, b) => a + b, 0);
  if (total !== sum) return null;
  return { day, number, scores: scores as number[], total: sum, finishedAt };
}

export function parseHistory(value: unknown): History {
  const history: History = {};
  if (!isRecord(value)) return history;
  for (const [day, entry] of Object.entries(value)) {
    const parsed = parseHistoryEntry(day, entry);
    if (parsed) history[day] = parsed;
  }
  return history;
}

// ---- Progress --------------------------------------------------------------

type ProgressMap = Record<DayKey, GameProgress>;

function loadProgressMap(store: KeyValueStore): ProgressMap {
  const raw = readJson(store, STORAGE_KEYS.progress);
  const map: ProgressMap = {};
  if (!isRecord(raw)) return map;
  for (const [day, value] of Object.entries(raw)) {
    const p = parseProgress(value);
    if (p && p.day === day) map[day] = p;
  }
  return map;
}

export function loadProgress(store: KeyValueStore, day: DayKey): GameProgress | null {
  return loadProgressMap(store)[day] ?? null;
}

export function saveProgress(store: KeyValueStore, progress: GameProgress): void {
  const map = loadProgressMap(store);
  map[progress.day] = progress;
  // Keep only recent entries (today and the day before) to stay small.
  for (const day of Object.keys(map)) {
    if (Math.abs(daysBetween(day, progress.day)) > 2) delete map[day];
  }
  writeJson(store, STORAGE_KEYS.progress, map);
}

export function newProgress(day: DayKey, now: number): GameProgress {
  return {
    v: 1,
    day,
    startedAt: now,
    rounds: Array.from({ length: ROUND_COUNT }, () => null),
    previewed: Array.from({ length: ROUND_COUNT }, () => false),
    inputStartedAt: Array.from({ length: ROUND_COUNT }, () => null),
  };
}

export function currentRoundIndex(progress: GameProgress): number {
  const i = progress.rounds.indexOf(null);
  return i === -1 ? ROUND_COUNT : i;
}

export const isFinished = (p: GameProgress): boolean => currentRoundIndex(p) === ROUND_COUNT;

/**
 * Confirm the answer of a round. Returns the updated progress, or `null` if
 * the round is not the current one (already scored or out of order). This
 * is what prevents scoring the same round twice, e.g. after a reload.
 */
export function confirmRound<K extends RoundId>(
  progress: GameProgress,
  index: number,
  answer: AnswerMap[K] | null,
  now: number,
  timedOut = false,
): GameProgress | null {
  if (index !== currentRoundIndex(progress)) return null;
  if (answer === null ? !timedOut : !isValidAnswer(ROUND_IDS[index], answer)) return null;
  const rounds = progress.rounds.slice();
  rounds[index] = { answer, at: now, ...(timedOut ? { timedOut: true as const } : {}) };
  return { ...progress, rounds };
}

/** Start a round's answer timer (only the first call counts, so reloads don't reset it). */
export function markInputStarted(progress: GameProgress, index: number, now: number): GameProgress {
  if (progress.inputStartedAt[index] !== null) return progress;
  const inputStartedAt = progress.inputStartedAt.slice();
  inputStartedAt[index] = now;
  return { ...progress, inputStartedAt };
}

export function markPreviewed(progress: GameProgress, index: number): GameProgress {
  if (progress.previewed[index]) return progress;
  const previewed = progress.previewed.slice();
  previewed[index] = true;
  return { ...progress, previewed };
}

export function scoresFor(challenge: DailyChallenge, progress: GameProgress): (number | null)[] {
  return progress.rounds.map((r, i) =>
    r === null ? null : r.answer === null ? 0 : evaluateRound(challenge, ROUND_IDS[i], r.answer as AnswerMap[RoundId]).score,
  );
}

/** Answers of a game in round order (null = no answer / time ran out). */
export function answersOf(progress: GameProgress): (AnyAnswer | null)[] {
  return progress.rounds.map((r) => r?.answer ?? null);
}

// ---- History ---------------------------------------------------------------

export function loadHistory(store: KeyValueStore): History {
  return parseHistory(readJson(store, STORAGE_KEYS.history));
}

/** Store a finished game in the history. The first result of a day is kept. */
export function recordFinished(
  store: KeyValueStore,
  progress: GameProgress,
  now: number,
): HistoryEntry | null {
  if (!isFinished(progress)) return null;
  const history = loadHistory(store);
  if (history[progress.day]) return history[progress.day];
  const challenge = generateDailyChallenge(progress.day);
  const scores = scoresFor(challenge, progress) as number[];
  const entry: HistoryEntry = {
    day: progress.day,
    number: challenge.number,
    scores,
    total: scores.reduce((a, b) => a + b, 0),
    finishedAt: now,
  };
  history[progress.day] = entry;
  writeJson(store, STORAGE_KEYS.history, history);
  return entry;
}

/**
 * The game the player should resume: today's, or yesterday's if it was
 * started before midnight UTC and not finished yet.
 */
export function findResumableDay(
  store: KeyValueStore,
  today: DayKey,
): DayKey | null {
  const yesterday = addDays(today, -1);
  const history = loadHistory(store);
  const p = loadProgress(store, yesterday);
  if (p && !isFinished(p) && !history[yesterday] && p.rounds.some((r) => r !== null)) {
    return yesterday;
  }
  return null;
}

// ---- Free-play history (for "My games"; never part of stats) --------------

export interface PracticeEntry {
  id: string;
  day: DayKey;
  scores: number[];
  total: number;
  finishedAt: number;
}

function parsePracticeEntry(value: unknown): PracticeEntry | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !/^[0-9a-f]{4,32}$/.test(value.id)) return null;
  if (!isDayKey(value.day) || !isTimestamp(value.finishedAt)) return null;
  const { scores } = value;
  if (!Array.isArray(scores) || scores.length !== ROUND_COUNT) return null;
  if (!scores.every((s) => typeof s === 'number' && Number.isInteger(s) && s >= 0 && s <= MAX_ROUND_SCORE)) return null;
  const total = (scores as number[]).reduce((a, b) => a + b, 0);
  return { id: value.id, day: value.day, scores: scores as number[], total, finishedAt: value.finishedAt };
}

export function loadPracticeHistory(store: KeyValueStore): PracticeEntry[] {
  const raw = readJson(store, STORAGE_KEYS.practice);
  if (!Array.isArray(raw)) return [];
  return raw.map(parsePracticeEntry).filter((e): e is PracticeEntry => e !== null);
}

export function recordPractice(
  store: KeyValueStore,
  entry: Omit<PracticeEntry, 'total'>,
): void {
  const list = loadPracticeHistory(store).filter((e) => e.id !== entry.id);
  list.push({ ...entry, total: entry.scores.reduce((a, b) => a + b, 0) });
  writeJson(store, STORAGE_KEYS.practice, list.slice(-PRACTICE_HISTORY_LIMIT));
}
