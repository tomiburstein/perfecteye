import { useI18n } from '../../../i18n';
import { directionDeg, dist, normDeg, polar, type Point } from '../../../platform/geometry';
import { Board } from '../../../ui/board/Board';
import type { RoundBoardProps } from './types';

/** SVG arc path, counter-clockwise on screen from direction `from` to `to`. */
function arcPath(v: Point, r: number, from: number, to: number): string {
  const sweep = normDeg(to - from);
  const a = polar(v, from, r);
  const b = polar(v, to, r);
  const large = sweep > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 0 ${b.x} ${b.y}`;
}

export function AngleBoard({ challenge, mode, answer, onChange, onSubmit }: RoundBoardProps<'angle'>) {
  const { t } = useI18n();
  const { vertex, rayLength, targetDeg, previewBaseDeg, inputBaseDeg } = challenge.angle;
  // Shortest visual rotation from the preview base to the input base, in (-180, 180].
  const turn = (() => {
    const d = normDeg(inputBaseDeg - previewBaseDeg);
    return d > 180 ? d - 360 : d;
  })();

  const setDeg = (deg: number) => onChange({ deg: Math.round(normDeg(deg) * 10) / 10 });
  const aim = (p: Point) => {
    if (dist(p, vertex) < 20) return;
    setDeg(directionDeg(vertex, p) - inputBaseDeg);
  };

  if (mode === 'ready') {
    return <Board label={t('round.angle.board')} interactive={false}>{null}</Board>;
  }

  const base = mode === 'preview' ? previewBaseDeg : inputBaseDeg;
  const ray = (deg: number, className: string, len = rayLength) => {
    const end = polar(vertex, deg, len);
    return <line className={className} x1={vertex.x} y1={vertex.y} x2={end.x} y2={end.y} />;
  };

  const userDir = answer ? base + answer.deg : null;
  const userEnd = userDir !== null ? polar(vertex, userDir, rayLength) : null;
  // Which side of the base the player opened the angle on (either is valid).
  const clockwise = answer ? normDeg(answer.deg) > 180 : false;
  const targetDir = clockwise ? base - targetDeg : base + targetDeg;
  /** Arc between the base and a direction, always drawn through the opening. */
  const openingArc = (r: number, dir: number) =>
    normDeg(dir - base) <= 180 ? arcPath(vertex, r, base, dir) : arcPath(vertex, r, dir, base);

  return (
    <Board
      label={t('round.angle.board')}
      interactive={mode === 'input'}
      onSubmit={onSubmit}
      onDown={aim}
      onMove={aim}
      onKey={(e) => {
        const step = e.shiftKey ? 0.2 : 1;
        const current = answer?.deg ?? 10;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setDeg(current + step);
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setDeg(current - step);
      }}
    >
      {mode === 'preview' && (
        <g className="fade-in">
          <path className="arc-fill" d={`${arcPath(vertex, 90, base, base + targetDeg)} L ${vertex.x} ${vertex.y} Z`} />
          {ray(base + targetDeg, 'shape-stroke')}
        </g>
      )}
      {mode === 'result' && (
        <g className="pop">
          <path className="target-arc" d={openingArc(130, targetDir)} />
          {ray(targetDir, 'target-stroke target-dash')}
        </g>
      )}
      {userEnd && userDir !== null && mode !== 'preview' && (
        <g className="mk-user">
          <path className="arc-user" d={openingArc(90, userDir)} />
          {ray(userDir, 'mk__ray')}
          <circle className="mk__halo" cx={userEnd.x} cy={userEnd.y} r="38" />
          <circle className="mk__ring" cx={userEnd.x} cy={userEnd.y} r="16" />
        </g>
      )}
      {mode === 'input' ? (
        <>
          {/* The base visibly turns from where it was to its new direction. */}
          <g
            className="base-rotate"
            style={{ ['--from' as string]: `${turn}deg`, transformOrigin: `${vertex.x}px ${vertex.y}px` }}
          >
            {ray(base, 'shape-stroke')}
          </g>
          <RotationHint vertex={vertex} from={previewBaseDeg} turn={turn} label={t('round.angle.rotated')} />
        </>
      ) : (
        ray(base, 'shape-stroke')
      )}
      <circle className="vertex-dot" cx={vertex.x} cy={vertex.y} r="10" />
    </Board>
  );
}

/** Hand-drawn curved arrow showing how the base line was rotated. */
function RotationHint({ vertex, from, turn, label }: { vertex: Point; from: number; turn: number; label: string }) {
  const r = 175;
  const to = from + turn;
  const path = turn >= 0 ? arcPath(vertex, r, from, to) : arcPath(vertex, r, to, from);
  const end = polar(vertex, to, r);
  const back = (turn >= 0 ? to + 90 : to - 90) + 180;
  const h1 = polar(end, back + 32, 26);
  const h2 = polar(end, back - 32, 26);
  const labelAt = polar(vertex, from + turn / 2, r + 58);
  return (
    <g className="rotate-hint" aria-hidden="true">
      <path d={path} />
      <path d={`M ${h1.x} ${h1.y} L ${end.x} ${end.y} L ${h2.x} ${h2.y}`} />
      <text x={labelAt.x} y={labelAt.y} textAnchor="middle" dominantBaseline="central">
        {label}
      </text>
    </g>
  );
}
