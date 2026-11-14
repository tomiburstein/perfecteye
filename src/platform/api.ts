import type { DayKey } from './date';
import { parseSummary, type DaySummary } from '../games/classic/submission';
import type { AnyAnswer } from '../games/classic/types';

/**
 * Client for the ranking API (Cloudflare Pages Functions on the same site).
 * Every call fails softly: the game always works without the server.
 */
export type ApiResult = { ok: true; summary: DaySummary } | { ok: false; reason: 'offline' | 'unavailable' | 'rejected' };

async function call(input: string, init?: RequestInit): Promise<ApiResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal, headers: { 'Content-Type': 'application/json' } });
    if (res.status === 400 || res.status === 413) return { ok: false, reason: 'rejected' };
    if (!res.ok) return { ok: false, reason: 'unavailable' };
    const type = res.headers.get('content-type') ?? '';
    if (!type.includes('application/json')) return { ok: false, reason: 'unavailable' };
    const summary = parseSummary(await res.json());
    return summary ? { ok: true, summary } : { ok: false, reason: 'unavailable' };
  } catch {
    return { ok: false, reason: typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}

export function fetchDay(day: DayKey, playerId: string | null): Promise<ApiResult> {
  const q = new URLSearchParams({ day });
  if (playerId) q.set('playerId', playerId);
  return call(`/api/results?${q.toString()}`);
}

export function submitDay(
  day: DayKey,
  playerId: string,
  name: string,
  answers: (AnyAnswer | null)[],
): Promise<ApiResult> {
  return call('/api/results', { method: 'POST', body: JSON.stringify({ day, playerId, name, answers }) });
}
