/**
 * PerfectEye API (Cloudflare Worker, D1 database).
 *
 *   GET  /api/results?day&playerId      ranking of the day + my standing
 *   POST /api/results                   { day, playerId, name, answers } (server recomputes scores)
 *   GET  /api/world?day&playerId        how everyone answered (only after you played that day)
 *   POST /api/visit                     { day, playerId } unique visitors per day
 *   POST /api/event                     { day, playerId, name: 'practice_finish' }
 *   POST /api/feedback                  { playerId, kind, message, contact?, lang }
 *   GET  /api/admin                     owner panel data   (Authorization: Bearer ADMIN_TOKEN)
 *   POST /api/admin/hide                { day, playerId, hidden }
 *   POST /api/admin/resolve             { id, resolved }
 */
import { isDayKey, toDayKey } from '../platform/date';
import { isRecord } from '../platform/storage';
import { PLAYER_ID_RE, acceptedDays, parseSubmission } from '../games/classic/submission';
import {
  COUNTERS,
  FEEDBACK_KINDS,
  FEEDBACK_MAX,
  addFeedback,
  adminOverview,
  bumpCounter,
  daySummary,
  ensureSchema,
  recordVisit,
  saveResult,
  setHidden,
  setResolved,
  worldAnswers,
  type CounterName,
  type D1Like,
  type FeedbackKind,
} from './ranking';

export interface ApiEnv {
  DB?: D1Like;
  /** Password for the owner's panel (Cloudflare secret). Panel is off without it. */
  ADMIN_TOKEN?: string;
  /** Only for automated tests: accept any day. Never set in production. */
  PE_TEST_ANY_DAY?: string;
}

/** Route any /api/* request. */
export async function handleApi(request: Request, env: ApiEnv): Promise<Response> {
  const { pathname } = new URL(request.url);
  const m = request.method;
  if (pathname === '/api/results') return handleResults(request, env);
  if (!env.DB) return fail('ranking-unavailable', 503);
  const db = env.DB;
  try {
    await ensureSchema(db);
    if (pathname === '/api/world' && m === 'GET') return world(request, db);
    if (pathname === '/api/visit' && m === 'POST') return visit(request, env, db);
    if (pathname === '/api/event' && m === 'POST') return event(request, env, db);
    if (pathname === '/api/feedback' && m === 'POST') return feedback(request, db);
    if (pathname.startsWith('/api/admin')) return admin(request, env, db, pathname);
  } catch {
    return fail('server', 500);
  }
  return fail('not-found', 404);
}

async function readJson(request: Request): Promise<unknown> {
  const length = Number(request.headers.get('content-length') ?? '0');
  if (length > MAX_BODY) return null;
  try {
    const text = await request.text();
    return text.length > MAX_BODY ? null : (JSON.parse(text) as unknown);
  } catch {
    return null;
  }
}

const okDay = (day: unknown, env: ApiEnv): day is string =>
  isDayKey(day) && (env.PE_TEST_ANY_DAY === '1' || acceptedDays(toDayKey(new Date())).includes(day));
const okPlayer = (id: unknown): id is string => typeof id === 'string' && PLAYER_ID_RE.test(id);

async function world(request: Request, db: D1Like): Promise<Response> {
  const url = new URL(request.url);
  const day = url.searchParams.get('day');
  const playerId = url.searchParams.get('playerId');
  if (!isDayKey(day) || !okPlayer(playerId)) return fail('params', 400);
  const data = await worldAnswers(db, day, playerId);
  return data ? json(data) : fail('play-first', 403);
}

async function visit(request: Request, env: ApiEnv, db: D1Like): Promise<Response> {
  const b = await readJson(request);
  if (!isRecord(b) || !okDay(b.day, env) || !okPlayer(b.playerId)) return fail('params', 400);
  await recordVisit(db, b.day, b.playerId);
  return json({ ok: true });
}

async function event(request: Request, env: ApiEnv, db: D1Like): Promise<Response> {
  const b = await readJson(request);
  if (!isRecord(b) || !okDay(b.day, env) || !okPlayer(b.playerId)) return fail('params', 400);
  if (!(COUNTERS as readonly unknown[]).includes(b.name)) return fail('params', 400);
  await bumpCounter(db, b.day, b.name as CounterName);
  return json({ ok: true });
}

const clean = (v: unknown, max: number) =>
  typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max) : '';

async function feedback(request: Request, db: D1Like): Promise<Response> {
  const b = await readJson(request);
  if (!isRecord(b) || !okPlayer(b.playerId)) return fail('params', 400);
  if (!(FEEDBACK_KINDS as readonly unknown[]).includes(b.kind)) return fail('params', 400);
  const message = clean(b.message, FEEDBACK_MAX);
  if (message.length < 3) return fail('message', 400);
  const saved = await addFeedback(
    db,
    {
      day: toDayKey(new Date()),
      playerId: b.playerId,
      kind: b.kind as FeedbackKind,
      message,
      contact: clean(b.contact, 120),
      lang: clean(b.lang, 5),
    },
    Date.now(),
  );
  return saved ? json({ ok: true }) : fail('too-many', 429);
}

/** Constant-time comparison, so the password can't be guessed by timing. */
function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

async function admin(request: Request, env: ApiEnv, db: D1Like, pathname: string): Promise<Response> {
  const token = env.ADMIN_TOKEN ?? '';
  if (token.length < 12) return fail('admin-disabled', 503);
  const given = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!sameSecret(given, token)) return fail('unauthorized', 401);
  const today = toDayKey(new Date());
  if (pathname === '/api/admin' && request.method === 'GET') return json(await adminOverview(db, today));
  if (request.method !== 'POST') return fail('not-found', 404);
  const b = await readJson(request);
  if (!isRecord(b)) return fail('params', 400);
  if (pathname === '/api/admin/hide') {
    if (!isDayKey(b.day) || !okPlayer(b.playerId) || typeof b.hidden !== 'boolean') return fail('params', 400);
    await setHidden(db, b.day, b.playerId, b.hidden);
    return json({ ok: true });
  }
  if (pathname === '/api/admin/resolve') {
    if (typeof b.id !== 'number' || !Number.isInteger(b.id) || typeof b.resolved !== 'boolean') return fail('params', 400);
    await setResolved(db, b.id, b.resolved);
    return json({ ok: true });
  }
  return fail('not-found', 404);
}

const MAX_BODY = 8 * 1024;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });

const fail = (error: string, status: number) => json({ error }, status);

export async function handleResults(request: Request, env: ApiEnv): Promise<Response> {
  if (request.method === 'GET') return getResults(request, env);
  if (request.method === 'POST') return postResults(request, env);
  return new Response(null, { status: 405, headers: { Allow: 'GET, POST' } });
}

async function getResults(request: Request, env: ApiEnv): Promise<Response> {
  if (!env.DB) return fail('ranking-unavailable', 503);
  const url = new URL(request.url);
  const day = url.searchParams.get('day') ?? toDayKey(new Date());
  if (!isDayKey(day)) return fail('day', 400);
  const pid = url.searchParams.get('playerId');
  const playerId = pid && PLAYER_ID_RE.test(pid) ? pid : null;
  try {
    await ensureSchema(env.DB);
    return json(await daySummary(env.DB, day, playerId));
  } catch {
    return fail('server', 500);
  }
}

async function postResults(request: Request, env: ApiEnv): Promise<Response> {
  if (!env.DB) return fail('ranking-unavailable', 503);
  const length = Number(request.headers.get('content-length') ?? '0');
  if (length > MAX_BODY) return fail('body', 413);
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return fail('body', 413);
    body = JSON.parse(text);
  } catch {
    return fail('body', 400);
  }
  const parsed = parseSubmission(body, toDayKey(new Date()), env.PE_TEST_ANY_DAY === '1');
  if (!parsed.ok) return fail(parsed.error, 400);
  try {
    await ensureSchema(env.DB);
    await saveResult(env.DB, parsed.value, Date.now());
    return json(await daySummary(env.DB, parsed.value.day, parsed.value.playerId));
  } catch {
    return fail('server', 500);
  }
}
