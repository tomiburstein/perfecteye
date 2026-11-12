import type { I18n, MessageKey } from '../../i18n';
import type { RoundId, RoundResult } from './types';

export function gradeKey(score: number): MessageKey {
  if (score >= 98) return 'grade.perfect';
  if (score >= 90) return 'grade.excellent';
  if (score >= 75) return 'grade.great';
  if (score >= 55) return 'grade.good';
  if (score >= 30) return 'grade.ok';
  return 'grade.miss';
}

/** Human-readable explanation of the error of a round. */
export function describeError(i18n: I18n, id: RoundId, r: RoundResult): string {
  const { t, num } = i18n;
  const d = r.details;
  switch (id) {
    case 'center':
    case 'half':
    case 'shape':
      return t(`round.${id}.error`, { pct: num(d.pct, 1) });
    case 'angle':
      return t('round.angle.error', {
        target: num(d.target, 1),
        yours: num(d.yours, 1),
        err: num(r.error, 1),
      });
    case 'distance':
      return t('round.distance.error', {
        pct: num(Math.abs(d.diffPct), 1),
        dir: t(d.diffPct >= 0 ? 'round.distance.longer' : 'round.distance.shorter'),
      });
  }
}
