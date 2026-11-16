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

// ---- Fire-and-forget telemetry (anonymous, no personal data) ---------------

async function post(path: string, body: unknown, headers: Record<string, string> = {}): Promise<Response | null> {
  try {
    return await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    return null;
  }
}

export function sendVisit(day: DayKey, playerId: string): void {
  void post('/api/visit', { day, playerId });
}

export function sendPracticeFinished(day: DayKey, playerId: string): void {
  void post('/api/event', { day, playerId, name: 'practice_finish' });
}

export type FeedbackKind = 'bug' | 'idea' | 'name' | 'other';

export async function sendFeedback(f: {
  playerId: string;
  kind: FeedbackKind;
  message: string;
  contact: string;
  lang: string;
}): Promise<'ok' | 'too-many' | 'error'> {
  const res = await post('/api/feedback', f);
  if (res?.ok) return 'ok';
  return res?.status === 429 ? 'too-many' : 'error';
}

// ---- How the world answered -------------------------------------------------

export interface WorldAnswers {
  day: string;
  players: number;
  center: [number, number][];
  half: number[];
  angle: number[];
  distance: number[];
  shape: number[];
  mine: { center: [number, number] | null; half: number | null; angle: number | null; distance: number | null; shape: number | null } | null;
}

const nums = (v: unknown): v is number[] => Array.isArray(v) && v.length <= 5000 && v.every((x) => typeof x === 'number' && Number.isFinite(x));
const optNum = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v));
const pair = (v: unknown): v is [number, number] => Array.isArray(v) && v.length === 2 && nums(v);

export function parseWorld(v: unknown): WorldAnswers | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.day !== 'string' || typeof o.players !== 'number') return null;
  if (!Array.isArray(o.center) || !o.center.every(pair)) return null;
  if (!nums(o.half) || !nums(o.angle) || !nums(o.distance) || !nums(o.shape)) return null;
  let mine: WorldAnswers['mine'] = null;
  if (o.mine && typeof o.mine === 'object') {
    const m = o.mine as Record<string, unknown>;
    if (!(m.center === null || pair(m.center)) || ![m.half, m.angle, m.distance, m.shape].every(optNum)) return null;
    mine = m as WorldAnswers['mine'];
  }
  return { ...(o as unknown as WorldAnswers), mine };
}

export async function fetchWorld(day: DayKey, playerId: string): Promise<WorldAnswers | null> {
  try {
    const res = await fetch(`/api/world?${new URLSearchParams({ day, playerId })}`);
    if (!res.ok) return null;
    return parseWorld(await res.json());
  } catch {
    return null;
  }
}

// ---- Owner panel ---------------------------------------------------------------

export interface AdminOverview {
  days: { day: string; visitors: number; daily: number; practice: number }[];
  feedback: { id: number; createdAt: number; kind: string; message: string; contact: string; lang: string; resolved: boolean }[];
  ranking: { day: string; playerId: string; name: string; total: number; hidden: boolean }[];
}

export async function fetchAdmin(token: string): Promise<AdminOverview | 'unauthorized' | 'disabled' | 'error'> {
  try {
    const res = await fetch('/api/admin', { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) return 'unauthorized';
    if (res.status === 503) return 'disabled';
    if (!res.ok) return 'error';
    return (await res.json()) as AdminOverview;
  } catch {
    return 'error';
  }
}

export async function adminAction(token: string, path: 'hide' | 'resolve', body: unknown): Promise<boolean> {
  const res = await post(`/api/admin/${path}`, body, { Authorization: `Bearer ${token}` });
  return Boolean(res?.ok);
}
