import { useRef } from 'react';
import { useI18n } from '../../../i18n';
import { add, dist, sub, type Point } from '../../../platform/geometry';
import { Board, ErrorLine, Marker, TargetDot, arrowDelta, clampToBoard } from '../../../ui/board/Board';
import type { RoundBoardProps } from './types';

const GRAB_RADIUS = 90;

export function CenterBoard({ challenge, mode, answer, onChange, onSubmit }: RoundBoardProps<'center'>) {
  const { t } = useI18n();
  const { center, radius } = challenge.center;
  const offset = useRef<Point>({ x: 0, y: 0 });

  const set = (p: Point) => onChange({ point: clampToBoard(p) });

  return (
    <Board
      label={t('round.center.board')}
      interactive={mode === 'input'}
      onSubmit={onSubmit}
      onDown={(p) => {
        if (answer && dist(p, answer.point) < GRAB_RADIUS) {
          offset.current = sub(answer.point, p); // relative drag: finger never hides the marker
        } else {
          offset.current = { x: 0, y: 0 };
          set(p);
        }
      }}
      onMove={(p) => set(add(p, offset.current))}
      onKey={(e) => {
        const d = arrowDelta(e, 5, 1);
        if (!d) return;
        const base = answer?.point ?? { x: 500, y: 500 };
        set({ x: base.x + d.dx, y: base.y + d.dy });
      }}
    >
      <circle className="shape-stroke" cx={center.x} cy={center.y} r={radius} />
      {answer && <Marker p={answer.point} />}
      {mode === 'result' && (
        <>
          {answer && <ErrorLine from={answer.point} to={center} />}
          <TargetDot p={center} />
        </>
      )}
    </Board>
  );
}
