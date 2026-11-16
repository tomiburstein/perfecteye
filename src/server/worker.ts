/**
 * Cloudflare Worker entry point.
 *
 * The game itself is static files (dist/) served by Cloudflare's asset
 * handling, which does not run this code and does not count against limits.
 * Only /api/* requests reach this Worker (see wrangler.jsonc).
 */
import { handleApi, type ApiEnv } from './api';

interface Env extends ApiEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/api/')) return handleApi(request, env);
    return env.ASSETS.fetch(request);
  },
};
