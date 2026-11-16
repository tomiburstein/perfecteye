import { useEffect, useState } from 'react';
import { useI18n, type MessageKey } from '../../i18n';
import { fetchWorld, type WorldAnswers as World } from '../../platform/api';
import type { DayKey } from '../../platform/date';
import { RoundGlyph } from './RoundGlyph';
import type { RoundId } from '../../games/classic/types';

/** Deterministic jitter in [-1, 1] so dots don't overlap the same way each render. */
const jitter = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
};

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** A round "nice" range that contains most of the answers. */
function niceRange(abs: number[], min: number): number {
  const s = [...abs].sort((a, b) => a - b);
  const p90 = s.length ? s[Math.floor(s.length * 0.9)] : 0;
  const steps = [1, 2, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100];
  return steps.find((v) => v >= Math.max(min, p90 * 1.1)) ?? 100;
}

export function WorldAnswers({ day, playerId }: { day: DayKey; playerId: string }) {
  const { t } = useI18n();
  const [data, setData] = useState<World | null | 'error'>(null);
  useEffect(() => {
    let alive = true;
    void fetchWorld(day, playerId).then((d) => alive && setData(d ?? 'error'));
    return () => {
      alive = false;
    };
  }, [day, playerId]);

  if (data === null || data === 'error' || data.players === 0) return null;

  return (
    <section className="wa" aria-labelledby="wa-title">
      <h2 id="wa-title" className="section-title">
        {t('wa.title')}
      </h2>
      <p className="wa__lead">{t('wa.lead', { n: data.players })}</p>
      <div className="wa__grid">
        <CenterPlot data={data} />
        <Strip id="half" values={data.half} mine={data.mine?.half ?? null} unit="%" signed min={5} />
        <Strip id="angle" values={data.angle} mine={data.mine?.angle ?? null} unit="°" signed min={10} />
        <Strip id="distance" values={data.distance} mine={data.mine?.distance ?? null} unit="%" signed min={10} />
        <Strip id="shape" values={data.shape} mine={data.mine?.shape ?? null} unit="%" signed={false} min={5} />
      </div>
      <p className="wa__legend">
        <i className="wa__dot wa__dot--others" /> {t('wa.others')} <i className="wa__dot wa__dot--you" /> {t('wa.you')}{' '}
        <i className="wa__line" /> {t('wa.exact')}
      </p>
    </section>
  );
}

function Card({ id, summary, children }: { id: RoundId; summary: string; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <figure className="wa__card">
      <figcaption className="wa__name">
        <RoundGlyph id={id} size={18} /> {t(`round.${id}.name`)}
      </figcaption>
      {children}
      <p className="wa__summary">{summary}</p>
    </figure>
  );
}

function CenterPlot({ data }: { data: World }) {
  const { t, num } = useI18n();
  const S = 200;
  const c = S / 2;
  // Zoom: the plot edge is 50% of the radius away from the true centre.
  const zoom = 0.5;
  const k = (c - 12) / zoom;
  const clampPt = ([dx, dy]: [number, number]) => {
    const d = Math.hypot(dx, dy);
    const f = d > zoom ? zoom / d : 1;
    return [c + dx * f * k, c + dy * f * k] as const;
  };
  const errors = data.center.map(([x, y]) => Math.hypot(x, y) * 100);
  const mine = data.mine?.center ?? null;
  return (
    <Card id="center" summary={t('wa.medianCenter', { v: num(median(errors), 1) })}>
      <svg className="wa__plot" viewBox={`0 0 ${S} ${S}`} role="img" aria-label={t('wa.centerAria')}>
        <circle className="wa__ring" cx={c} cy={c} r={k * 0.25} />
        <circle className="wa__ring" cx={c} cy={c} r={k * 0.5 - 1} />
        <text className="wa__tick" x={c + k * 0.25 + 3} y={c - 3}>
          25%
        </text>
        {data.center.map((p, i) => {
          const [x, y] = clampPt(p);
          return <circle key={i} className="wa__other" cx={x} cy={y} r="2.6" />;
        })}
        <path className="wa__exact" d={`M ${c - 7} ${c} H ${c + 7} M ${c} ${c - 7} V ${c + 7}`} />
        {mine && (() => {
          const [x, y] = clampPt(mine);
          return (
            <g className="wa__you">
              <circle cx={x} cy={y} r="6" />
              <text x={x} y={y - 11} textAnchor="middle">
                {t('wa.you')}
              </text>
            </g>
          );
        })()}
      </svg>
    </Card>
  );
}

function Strip({
  id,
  values,
  mine,
  unit,
  signed,
  min,
}: {
  id: RoundId;
  values: number[];
  mine: number | null;
  unit: string;
  signed: boolean;
  min: number;
}) {
  const { t, num } = useI18n();
  if (!values.length) return null;
  const W = 300;
  const H = 96;
  const pad = 18;
  const R = niceRange(values.map(Math.abs), min);
  const lo = signed ? -R : 0;
  const x = (v: number) => pad + ((Math.max(lo, Math.min(R, v)) - lo) / (R - lo)) * (W - 2 * pad);
  const mid = 46;
  const fmt = (v: number) => `${v > 0 && signed ? '+' : ''}${num(v, 0)}${unit}`;
  const typical = median(values.map(Math.abs));
  const summaryKey: MessageKey = id === 'shape' ? 'wa.medianShape' : 'wa.median';
  return (
    <Card id={id} summary={t(summaryKey, { v: `${num(typical, 1)}${unit}` })}>
      <svg className="wa__plot wa__plot--strip" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t(`wa.aria.${id}` as MessageKey)}>
        <line className="wa__axis" x1={pad} x2={W - pad} y1={mid + 26} y2={mid + 26} />
        <line className="wa__exact" x1={x(0)} x2={x(0)} y1={mid - 30} y2={mid + 26} />
        {values.map((v, i) => (
          <circle key={i} className="wa__other" cx={x(v)} cy={mid + jitter(i) * 16} r="2.6" />
        ))}
        {mine !== null && (
          <g className="wa__you">
            <circle cx={x(mine)} cy={mid} r="6" />
            <text x={Math.min(W - 16, Math.max(16, x(mine)))} y={mid - 14} textAnchor="middle">
              {t('wa.you')}
            </text>
          </g>
        )}
        <text className="wa__tick" x={pad} y={H - 4} textAnchor="start">
          {fmt(lo)}
        </text>
        {signed && (
          <text className="wa__tick" x={x(0)} y={H - 4} textAnchor="middle">
            {t('wa.exactShort')}
          </text>
        )}
        <text className="wa__tick" x={W - pad} y={H - 4} textAnchor="end">
          {fmt(R)}
        </text>
      </svg>
    </Card>
  );
}
