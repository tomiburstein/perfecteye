import { useMemo } from 'react';
import { useI18n } from '../../i18n';
import type { History, PracticeEntry } from '../../games/classic/persistence';
import { ROUND_IDS } from '../../games/classic/types';
import { RoundGlyph } from './RoundGlyph';

const LAST = 20;
const WINDOW = 5;

/** Per-test trend over the latest games (daily + free play). */
export function Evolution({ history, practice }: { history: History; practice: PracticeEntry[] }) {
  const { t, num } = useI18n();
  const games = useMemo(
    () =>
      [...Object.values(history), ...practice]
        .sort((a, b) => a.finishedAt - b.finishedAt)
        .map((g) => g.scores),
    [history, practice],
  );
  if (games.length < 2) return <p className="empty">{t('evo.empty')}</p>;
  const recent = games.slice(-LAST);
  return (
    <ul className="evo">
      {ROUND_IDS.map((id, r) => {
        const series = recent.map((g) => g[r]);
        const enough = games.length >= WINDOW * 2;
        const last = games.slice(-WINDOW).map((g) => g[r]);
        const prev = games.slice(-WINDOW * 2, -WINDOW).map((g) => g[r]);
        const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
        const delta = enough ? avg(last) - avg(prev) : null;
        return (
          <li key={id} className="evo__row">
            <span className="evo__name">
              <RoundGlyph id={id} size={18} /> {t(`round.${id}.name`)}
            </span>
            <Spark values={series} label={t('evo.aria', { name: t(`round.${id}.name`), n: series.length })} />
            <span className={`evo__delta${delta !== null && delta >= 1 ? ' is-up' : delta !== null && delta <= -1 ? ' is-down' : ''}`}>
              {delta === null ? '–' : `${delta >= 0 ? '+' : '−'}${num(Math.abs(delta), 0)}`}
            </span>
          </li>
        );
      })}
      <li className="evo__note fineprint">
        {games.length >= WINDOW * 2 ? t('evo.note', { n: WINDOW }) : t('evo.more', { n: WINDOW * 2 })}
      </li>
    </ul>
  );
}

function Spark({ values, label }: { values: number[]; label: string }) {
  const W = 140;
  const H = 36;
  const p = 4;
  const x = (i: number) => p + (values.length === 1 ? 0 : (i / (values.length - 1)) * (W - 2 * p));
  const y = (v: number) => p + (1 - v / 100) * (H - 2 * p);
  const d = values.map((v, i) => `${i ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const lastI = values.length - 1;
  return (
    <svg className="evo__spark" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <line className="evo__grid" x1={p} x2={W - p} y1={y(100)} y2={y(100)} />
      <line className="evo__grid" x1={p} x2={W - p} y1={y(0)} y2={y(0)} />
      <path className="evo__line" d={d} />
      <circle className="evo__end" cx={x(lastI)} cy={y(values[lastI])} r="3.5">
        <title>{values[lastI]}</title>
      </circle>
    </svg>
  );
}
