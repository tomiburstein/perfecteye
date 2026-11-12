import { addDays, daysBetween, type DayKey } from '../../platform/date';
import type { History } from './persistence';
import { ROUND_IDS, type RoundId } from './types';

export interface RoundStats {
  id: RoundId;
  average: number | null;
  best: number | null;
}

export interface Stats {
  played: number;
  best: number | null;
  average: number | null;
  currentStreak: number;
  maxStreak: number;
  /** Oldest first, exactly 30 entries ending today. */
  last30: { day: DayKey; total: number | null }[];
  rounds: RoundStats[];
}

export function computeStats(history: History, today: DayKey): Stats {
  const entries = Object.values(history).sort((a, b) => (a.day < b.day ? -1 : 1));
  const played = entries.length;
  const totals = entries.map((e) => e.total);

  // Longest run of consecutive days.
  let maxStreak = 0;
  let run = 0;
  let prev: DayKey | null = null;
  for (const e of entries) {
    run = prev !== null && daysBetween(prev, e.day) === 1 ? run + 1 : 1;
    maxStreak = Math.max(maxStreak, run);
    prev = e.day;
  }

  // Current streak: alive if today or yesterday was played.
  let currentStreak = 0;
  let cursor: DayKey = history[today] ? today : addDays(today, -1);
  while (history[cursor]) {
    currentStreak++;
    cursor = addDays(cursor, -1);
  }

  const last30 = Array.from({ length: 30 }, (_, i) => {
    const day = addDays(today, i - 29);
    return { day, total: history[day]?.total ?? null };
  });

  const rounds = ROUND_IDS.map((id, i) => {
    const scores = entries.map((e) => e.scores[i]);
    return {
      id,
      average: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
      best: scores.length ? Math.max(...scores) : null,
    };
  });

  return {
    played,
    best: played ? Math.max(...totals) : null,
    average: played ? totals.reduce((a, b) => a + b, 0) / played : null,
    currentStreak,
    maxStreak,
    last30,
    rounds,
  };
}
