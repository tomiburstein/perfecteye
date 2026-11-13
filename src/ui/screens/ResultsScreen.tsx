import { useMemo } from 'react';
import { useI18n } from '../../i18n';
import type { DayKey } from '../../platform/date';
import type { History } from '../../games/classic/persistence';
import { gradeKey } from '../../games/classic/describe';
import { computeStats } from '../../games/classic/stats';
import { MAX_TOTAL_SCORE, ROUND_IDS } from '../../games/classic/types';
import { AdSlot } from '../components/AdSlot';
import { Countdown } from '../components/Countdown';
import { RoundGlyph } from '../components/RoundGlyph';
import { ShareBox } from '../components/ShareBox';
import { useCountUp } from '../hooks';

export function ResultsScreen({
  day,
  today,
  history,
  onHome,
}: {
  day: DayKey;
  today: DayKey;
  history: History;
  onHome: () => void;
}) {
  const i18n = useI18n();
  const { t, num } = i18n;
  const entry = history[day];
  const stats = useMemo(() => computeStats(history, today), [history, today]);
  const previous = useMemo(() => {
    const others = Object.values(history).filter((e) => e.day !== day);
    if (!others.length) return null;
    return {
      average: others.reduce((a, e) => a + e.total, 0) / others.length,
      best: Math.max(...others.map((e) => e.total)),
    };
  }, [history, day]);
  const shownTotal = useCountUp(entry?.total ?? 0, 900);

  if (!entry) return null;

  const diff = previous ? entry.total - previous.average : 0;
  const streak = stats.currentStreak;

  return (
    <main className="screen results" aria-labelledby="results-title">
      <p className="kicker">{t('results.title', { n: entry.number })}</p>
      <h1 id="results-title" className="sr-only">
        {t('results.total')}: {entry.total}/{MAX_TOTAL_SCORE}
      </h1>
      <div className="total" aria-hidden="true">
        <span className="total__num">{shownTotal}</span>
        <span className="total__max">/{MAX_TOTAL_SCORE}</span>
      </div>
      <p className="total__label">
        {t('results.total')} · <span className="hand total__remark">{t(gradeKey(Math.round(entry.total / 5)))}</span>
      </p>

      <ul className="rows">
        {ROUND_IDS.map((id, i) => (
          <li key={id} className="row" style={{ animationDelay: `${i * 60}ms` }}>
            <span className="row__name">
              <RoundGlyph id={id} size={22} /> <span>{t(`round.${id}.name`)}</span>
            </span>
            <span className="row__bar" aria-hidden="true">
              <span style={{ width: `${entry.scores[i]}%` }} />
            </span>
            <span className="row__score">{entry.scores[i]}</span>
          </li>
        ))}
      </ul>

      <div className="compare">
        <div className="compare__item">
          <span className="compare__value">{streak}</span>
          <span className="compare__label">{t('results.streak')}</span>
        </div>
        <div className="compare__text">
          {!previous && <p>{t('results.firstGame')}</p>}
          {previous && entry.total > previous.best && <p className="accent">{t('results.newBest')}</p>}
          {previous && entry.total <= previous.best && (
            <p>{t('results.best', { best: previous.best })}</p>
          )}
          {previous && (
            <p>
              {t('results.vsAverage', {
                diff: `${diff >= 0 ? '+' : '−'}${num(Math.abs(diff), 0)}`,
                avg: num(previous.average, 0),
              })}
            </p>
          )}
        </div>
      </div>

      <ShareBox number={entry.number} scores={entry.scores} />

      <Countdown />
      <AdSlot placement="results" />
      <button className="btn btn--ghost btn--block" onClick={onHome}>
        {t('results.home')}
      </button>
    </main>
  );
}
