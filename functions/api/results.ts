/**
 * Cloudflare Pages Function: /api/results
 *
 *   GET  /api/results?day=YYYY-MM-DD&playerId=…   → day summary (ranking + my standing)
 *   POST /api/results  { day, playerId, name, answers } → stores result, returns summary
 *
 * Needs a D1 database bound as "DB" (see docs/DEPLOY.md).
 */
import { isDayKey, toDayKey } from '../../src/platform/date';
import { PLAYER_ID_RE, parseSubmission } from '../../src/games/classic/submission';
import { daySummary, ensureSchema, saveResult, type D1Like } from '../../src/server/ranking';

interface Env {
  DB?: D1Like;
  /** Only for automated tests: accept any day. Never set in production. */
  PE_TEST_ANY_DAY?: string;
}
interface Ctx {
  request: Request;
  env: Env;
}

const MAX_BODY = 8 * 1024;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

const fail = (error: string, status: number) => json({ error }, status);

export async function onRequestGet({ request, env }: Ctx): Promise<Response> {
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

export async function onRequestPost({ request, env }: Ctx): Promise<Response> {
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
