import { useMemo } from 'react';
import { useI18n } from '../../i18n';
import { dayKeyToMs, type DayKey } from '../../platform/date';
import type { History } from '../../games/classic/persistence';
import { computeStats } from '../../games/classic/stats';
import { MAX_TOTAL_SCORE } from '../../games/classic/types';
import { Modal } from './Modal';
import { RoundGlyph } from './RoundGlyph';

export function StatsDialog({
  open,
  onClose,
  history,
  today,
}: {
  open: boolean;
  onClose: () => void;
  history: History;
  today: DayKey;
}) {
  const { t, num, lang } = useI18n();
  const stats = useMemo(() => computeStats(history, today), [history, today]);
  const dayFmt = useMemo(
    () => new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', timeZone: 'UTC' }),
    [lang],
  );
  const dash = '–';

  const tiles: [string, string][] = [
    [t('stats.played'), String(stats.played)],
    [t('stats.best'), stats.best === null ? dash : String(stats.best)],
    [t('stats.average'), stats.average === null ? dash : num(stats.average, 0)],
    [t('stats.streak'), String(stats.currentStreak)],
    [t('stats.maxStreak'), String(stats.maxStreak)],
  ];

  return (
    <Modal title={t('stats.title')} open={open} onClose={onClose}>
      <div className="stat-tiles">
        {tiles.map(([label, value]) => (
          <div key={label} className="stat-tile">
            <span className="stat-tile__value">{value}</span>
            <span className="stat-tile__label">{label}</span>
          </div>
        ))}
      </div>

      {stats.played === 0 ? (
        <p className="empty">{t('stats.empty')}</p>
      ) : (
        <>
          <h3 className="section-title">{t('stats.last30')}</h3>
          <ol className="chart" aria-label={t('stats.last30')}>
            {stats.last30.map(({ day, total }) => {
              const label = dayFmt.format(new Date(dayKeyToMs(day)));
              return (
                <li
                  key={day}
                  className={`chart__bar${total === null ? ' is-empty' : ''}${day === today ? ' is-today' : ''}`}
                  title={total === null ? t('stats.dayNone', { day: label }) : t('stats.dayScore', { day: label, score: total })}
                >
                  <span style={{ height: `${total === null ? 4 : Math.max(6, (total / MAX_TOTAL_SCORE) * 100)}%` }} />
                  <span className="sr-only">
                    {total === null ? t('stats.dayNone', { day: label }) : t('stats.dayScore', { day: label, score: total })}
                  </span>
                </li>
              );
            })}
          </ol>

          <h3 className="section-title">{t('stats.byTest')}</h3>
          <ul className="by-test">
            {stats.rounds.map((r) => (
              <li key={r.id}>
                <span className="by-test__name">
                  <RoundGlyph id={r.id} size={20} /> {t(`round.${r.id}.name`)}
                </span>
                <span className="by-test__bar" aria-hidden="true">
                  <span style={{ width: `${r.average ?? 0}%` }} />
                </span>
                <span className="by-test__nums">
                  {t('stats.avg', { v: r.average === null ? dash : num(r.average, 0) })} ·{' '}
                  {t('stats.bestOf', { v: r.best === null ? dash : r.best })}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="fineprint">{t('stats.local')}</p>
    </Modal>
  );
}
