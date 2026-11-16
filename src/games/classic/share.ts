import type { I18n } from '../../i18n';
import { MAX_TOTAL_SCORE, ROUND_IDS, type RoundId } from './types';

export const ROUND_EMOJI: Record<RoundId, string> = {
  center: '🎯',
  half: '📏',
  angle: '📐',
  distance: '📍',
  shape: '🔺',
};

/**
 * Five squares for a 0–100 score: one per 20 points. 🟩 = full block,
 * 🟨 = at least half a block, ⬜ = less. Readable at a glance in any chat.
 */
export function scoreBlocks(score: number): string {
  let out = '';
  for (let i = 0; i < 5; i++) {
    if (score >= (i + 1) * 20) out += '🟩';
    else if (score >= i * 20 + 10) out += '🟨';
    else out += '⬜';
  }
  return out;
}

/**
 * Build the share message. It contains only the scores — never the
 * positions or answers — so it does not spoil the day's solutions.
 */
export function buildShareText(
  i18n: I18n,
  challengeNumber: number,
  scores: readonly number[],
  url: string,
  percentile: number | null = null,
): string {
  const total = scores.reduce((a, b) => a + b, 0);
  const lines = [`PERFECTEYE #${String(challengeNumber).padStart(3, '0')}`];
  ROUND_IDS.forEach((id, i) => {
    lines.push(`${ROUND_EMOJI[id]} ${scoreBlocks(scores[i])} ${scores[i]}`);
  });
  lines.push(`${i18n.t('share.total')}: ${total}/${MAX_TOTAL_SCORE}`);
  if (percentile !== null) lines.push(i18n.t('share.better', { p: percentile }));
  lines.push(i18n.t('share.cta'));
  if (url) lines.push(url);
  return lines.join('\n');
}

export function shareLinks(text: string, url: string) {
  const enc = encodeURIComponent;
  return {
    whatsapp: `https://wa.me/?text=${enc(text)}`,
    x: `https://twitter.com/intent/tweet?text=${enc(text)}`,
    telegram: `https://t.me/share/url?url=${enc(url)}&text=${enc(text.replace(url, '').trim())}`,
  };
}
