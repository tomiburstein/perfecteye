import { useRef, useState } from 'react';
import { useI18n } from '../../../i18n';
import { add, dist, sub, type Point } from '../../../platform/geometry';
import { Board, ErrorLine, arrowDelta, clampToBoard } from '../../../ui/board/Board';
import { matchTriangles } from '../evaluate';
import type { Triangle } from '../types';
import type { RoundBoardProps } from './types';

const GRAB_RADIUS = 110;
const poly = (tri: Triangle) => tri.map((p) => `${p.x},${p.y}`).join(' ');

export function ShapeBoard({ challenge, mode, answer, onChange, onSubmit }: RoundBoardProps<'shape'>) {
  const { t } = useI18n();
  const { target, start } = challenge.shape;
  const points: Triangle = answer?.points ?? start;
  const [selected, setSelected] = useState(0);
  const drag = useRef<{ index: number; offset: Point } | null>(null);

  const movePoint = (index: number, p: Point) => {
    const next = points.slice() as Triangle;
    next[index] = clampToBoard({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 });
    onChange({ points: next });
  };

  if (mode === 'ready') {
    return <Board label={t('round.shape.board')} interactive={false}>{null}</Board>;
  }

  if (mode === 'preview') {
    return (
      <Board label={t('round.shape.board')} interactive={false}>
        <polygon className="shape-fill fade-in" points={poly(target)} />
      </Board>
    );
  }

  const match = mode === 'result' ? matchTriangles(target, points) : null;

  return (
    <Board
      label={t('round.shape.board')}
      interactive={mode === 'input'}
      onSubmit={onSubmit}
      onDown={(p) => {
        let best = -1;
        let bestD = GRAB_RADIUS;
        points.forEach((q, i) => {
          const d = dist(p, q);
          if (d < bestD) {
            best = i;
            bestD = d;
          }
        });
        if (best === -1) {
          drag.current = null;
          return;
        }
        setSelected(best);
        drag.current = { index: best, offset: sub(points[best], p) };
      }}
      onMove={(p) => {
        if (drag.current) movePoint(drag.current.index, add(p, drag.current.offset));
      }}
      onKey={(e) => {
        if (e.key === '1' || e.key === '2' || e.key === '3') {
          setSelected(Number(e.key) - 1);
          return;
        }
        if (e.key === 'Tab') return;
        const d = arrowDelta(e, 5, 1);
        if (d) movePoint(selected, { x: points[selected].x + d.dx, y: points[selected].y + d.dy });
      }}
    >
      {match && (
        <g className="pop">
          <polygon className="target-poly" points={poly(target)} />
          {target.map((v, i) => (
            <ErrorLine key={i} from={points[match.order[i]]} to={v} />
          ))}
        </g>
      )}
      <polygon className="user-poly" points={poly(points)} />
      {points.map((p, i) => (
        <g key={i} className={`mk-user${mode === 'input' && i === selected ? ' is-selected' : ''}`}>
          <circle className="mk__halo" cx={p.x} cy={p.y} r="42" />
          <circle className="mk__ring mk__ring--solid" cx={p.x} cy={p.y} r="17" />
          <text className="handle-num" x={p.x} y={p.y} dominantBaseline="central" textAnchor="middle">
            {i + 1}
          </text>
        </g>
      ))}
    </Board>
  );
}
