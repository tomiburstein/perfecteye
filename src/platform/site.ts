/**
 * Site-wide configuration.
 *
 * VITE_SITE_URL can be set at build time (e.g. in Cloudflare Pages) to the
 * public address used in share messages. Without it, the current origin is
 * used, which is correct once the site is published.
 */
const configured = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();

export function siteUrl(): string {
  if (configured) return configured.replace(/\/+$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

/** Feature flags for future monetisation. Nothing paid is enabled. */
export const FEATURES = {
  /** Show reserved ad slots on the home and results screens (never in-game). */
  ads: false,
} as const;
