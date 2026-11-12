import type { I18n } from '../../i18n';
import { MAX_ROUND_SCORE, MAX_TOTAL_SCORE, ROUND_IDS, type RoundId } from './types';

export const ROUND_EMOJI: Record<RoundId, string> = {
  center: '🎯',
  half: '📏',
  angle: '📐',
  distance: '📍',
  shape: '🔺',
};

/**
 * Build the share message. It contains only the scores — never the
 * positions or answers — so it does not spoil the day's solutions.
 */
export function buildShareText(
  i18n: I18n,
  challengeNumber: number,
  scores: readonly number[],
  url: string,
): string {
  const total = scores.reduce((a, b) => a + b, 0);
  const lines = [`PERFECTEYE #${String(challengeNumber).padStart(3, '0')}`];
  ROUND_IDS.forEach((id, i) => {
    lines.push(
      `${ROUND_EMOJI[id]} ${i18n.t(`round.${id}.short`)}: ${scores[i]}/${MAX_ROUND_SCORE}`,
    );
  });
  lines.push(`${i18n.t('share.total')}: ${total}/${MAX_TOTAL_SCORE}`);
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
