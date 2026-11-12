import { useRef } from 'react';
import { useI18n } from '../../../i18n';
import { clamp, dist, lerp, projectT, type Point } from '../../../platform/geometry';
import { Board, ErrorLine, TargetDot } from '../../../ui/board/Board';
import type { RoundBoardProps } from './types';

const GRAB_RADIUS = 90;

export function HalfBoard({ challenge, mode, answer, onChange, onSubmit }: RoundBoardProps<'half'>) {
  const { t } = useI18n();
  const { start, end, orientation } = challenge.half;
  const offsetT = useRef(0);
  const horizontal = orientation === 'horizontal';
  const length = dist(start, end);

  const setT = (value: number) => onChange({ t: clamp(value, 0, 1) });
  const tick = (p: Point, size: number, className: string) =>
    horizontal ? (
      <line className={className} x1={p.x} y1={p.y - size} x2={p.x} y2={p.y + size} />
    ) : (
      <line className={className} x1={p.x - size} y1={p.y} x2={p.x + size} y2={p.y} />
    );

  const marker = answer ? lerp(start, end, answer.t) : null;
  const mid = lerp(start, end, 0.5);

  return (
    <Board
      label={t('round.half.board')}
      interactive={mode === 'input'}
      onSubmit={onSubmit}
      onDown={(p) => {
        const tp = projectT(p, start, end);
        if (marker && dist(p, marker) < GRAB_RADIUS) {
          offsetT.current = (answer?.t ?? 0) - tp;
        } else {
          offsetT.current = 0;
          setT(tp);
        }
      }}
      onMove={(p) => setT(projectT(p, start, end) + offsetT.current)}
      onKey={(e) => {
        const step = (e.shiftKey ? 1 : 5) / length;
        const base = answer?.t ?? 0.3;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setT(base + step);
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setT(base - step);
      }}
    >
      <line className="shape-stroke" x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
      {tick(start, 26, 'shape-stroke')}
      {tick(end, 26, 'shape-stroke')}
      {marker && (
        <g className="mk-user">
          <circle className="mk__halo" cx={marker.x} cy={marker.y} r="34" />
          {tick(marker, 40, 'mk__tick')}
          <circle className="mk__ring" cx={marker.x} cy={marker.y} r="12" />
        </g>
      )}
      {mode === 'result' && marker && (
        <>
          <ErrorLine from={marker} to={mid} />
          <g className="pop">{tick(mid, 46, 'target-stroke')}</g>
          <TargetDot p={mid} />
        </>
      )}
    </Board>
  );
}
