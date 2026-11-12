import { useRef } from 'react';
import { useI18n } from '../../../i18n';
import { clamp, dist, polar, projectT, type Point } from '../../../platform/geometry';
import { Board, ErrorLine, TargetDot } from '../../../ui/board/Board';
import { distancePointC } from '../evaluate';
import type { RoundBoardProps } from './types';

const GRAB_RADIUS = 90;
const MIN_DISTANCE = 20;

function Label({ p, away, text }: { p: Point; away: Point; text: string }) {
  // Place the label on the opposite side of `away`.
  const dx = p.x - away.x;
  const dy = p.y - away.y;
  const len = Math.hypot(dx, dy) || 1;
  return (
    <text className="pt-label" x={p.x + (dx / len) * 52} y={p.y + (dy / len) * 52} dominantBaseline="central" textAnchor="middle">
      {text}
    </text>
  );
}

export function DistanceBoard({ challenge, mode, answer, onChange, onSubmit }: RoundBoardProps<'distance'>) {
  const { t } = useI18n();
  const ch = challenge.distance;
  const { a, b, trackDeg, trackLength } = ch;
  const offset = useRef(0);
  const trackEnd = polar(b, trackDeg, trackLength);
  const d = answer?.distance ?? ch.startDistance;
  const c = distancePointC(ch, d);
  const ab = dist(a, b);
  // A point inside the A-B-C opening; B's label goes on the opposite side.
  const bisector = {
    x: b.x + (a.x - b.x) / ab + (trackEnd.x - b.x) / trackLength,
    y: b.y + (a.y - b.y) / ab + (trackEnd.y - b.y) / trackLength,
  };

  const setD = (value: number) =>
    onChange({ distance: Math.round(clamp(value, MIN_DISTANCE, trackLength) * 10) / 10 });
  const along = (p: Point) => projectT(p, b, trackEnd) * trackLength;

  return (
    <Board
      label={t('round.distance.board')}
      interactive={mode === 'input'}
      onSubmit={onSubmit}
      onDown={(p) => {
        if (dist(p, c) < GRAB_RADIUS) offset.current = d - along(p);
        else {
          offset.current = 0;
          setD(along(p));
        }
      }}
      onMove={(p) => setD(along(p) + offset.current)}
      onKey={(e) => {
        const step = e.shiftKey ? 1 : 5;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setD(d + step);
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setD(d - step);
      }}
    >
      <line className="track" x1={b.x} y1={b.y} x2={trackEnd.x} y2={trackEnd.y} />
      <line className="shape-stroke" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
      <line className="mk__ray user-seg" x1={b.x} y1={b.y} x2={c.x} y2={c.y} />
      <circle className="fixed-dot" cx={a.x} cy={a.y} r="14" />
      <circle className="fixed-dot" cx={b.x} cy={b.y} r="14" />
      <Label p={a} away={b} text="A" />
      <Label p={b} away={bisector} text="B" />
      <g className="mk-user">
        <circle className="mk__halo" cx={c.x} cy={c.y} r="40" />
        <circle className="mk__ring mk__ring--solid" cx={c.x} cy={c.y} r="16" />
      </g>
      <Label p={c} away={b} text="C" />
      {mode === 'result' && (
        <>
          <ErrorLine from={c} to={distancePointC(ch, ab)} />
          <TargetDot p={distancePointC(ch, ab)} />
        </>
      )}
    </Board>
  );
}
