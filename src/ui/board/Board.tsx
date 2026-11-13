import { useEffect, useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { BOARD_SIZE, clamp, clientToBoard, type Point } from '../../platform/geometry';

export interface BoardProps {
  label: string;
  interactive: boolean;
  onDown?: (p: Point) => void;
  onMove?: (p: Point) => void;
  onKey?: (e: BoardKey) => void;
  onSubmit?: () => void;
  children: ReactNode;
}

/** The parts of a key press the boards care about (DOM or React event). */
export interface BoardKey {
  key: string;
  shiftKey: boolean;
}

export const clampToBoard = (p: Point): Point => ({
  x: clamp(p.x, 0, BOARD_SIZE),
  y: clamp(p.y, 0, BOARD_SIZE),
});

/** Arrow-key delta: 1 board unit with Shift (fine), `coarse` otherwise. */
export function arrowDelta(
  e: BoardKey,
  coarse: number,
  fine: number,
): { dx: number; dy: number } | null {
  const step = e.shiftKey ? fine : coarse;
  switch (e.key) {
    case 'ArrowLeft':
      return { dx: -step, dy: 0 };
    case 'ArrowRight':
      return { dx: step, dy: 0 };
    case 'ArrowUp':
      return { dx: 0, dy: -step };
    case 'ArrowDown':
      return { dx: 0, dy: step };
    default:
      return null;
  }
}

/**
 * Square SVG board (1000×1000 units). Pointer Events cover mouse, touch and
 * pen; positions are converted to board units, so every screen size gives
 * identical answers. `touch-action: none` (CSS) prevents page scrolling while
 * dragging.
 */
export function Board({ label, interactive, onDown, onMove, onKey, onSubmit, children }: BoardProps) {
  const ref = useRef<SVGSVGElement>(null);
  const activePointer = useRef<number | null>(null);
  const handlers = useRef({ onKey, onSubmit });
  handlers.current = { onKey, onSubmit };

  // Arrow keys / 1-2-3 / Enter work from anywhere on the page (no need to
  // click the board first), except inside dialogs and form fields.
  useEffect(() => {
    if (!interactive) return;
    const listener = (e: globalThis.KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target && ref.current?.contains(target)) return; // handled by the board itself
      if (target?.closest('input, textarea, select, dialog[open]')) return;
      if (e.key.startsWith('Arrow') || e.key === '1' || e.key === '2' || e.key === '3') {
        e.preventDefault();
        handlers.current.onKey?.(e);
      } else if (e.key === 'Enter' && !target?.closest('button, a')) {
        e.preventDefault();
        handlers.current.onSubmit?.();
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [interactive]);

  const toBoard = (e: PointerEvent<SVGSVGElement>): Point => {
    const rect = ref.current?.getBoundingClientRect();
    return rect ? clientToBoard(e.clientX, e.clientY, rect) : { x: 500, y: 500 };
  };

  const handleDown = (e: PointerEvent<SVGSVGElement>) => {
    if (!interactive || !e.isPrimary || e.button > 0) return;
    e.preventDefault();
    ref.current?.focus({ preventScroll: true });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* not supported: dragging still works while inside the board */
    }
    activePointer.current = e.pointerId;
    onDown?.(toBoard(e));
  };

  const handleMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!interactive || activePointer.current !== e.pointerId) return;
    e.preventDefault();
    onMove?.(toBoard(e));
  };

  const handleUp = (e: PointerEvent<SVGSVGElement>) => {
    if (activePointer.current === e.pointerId) activePointer.current = null;
  };

  const handleKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (!interactive) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit?.();
      return;
    }
    if (e.key.startsWith('Arrow')) e.preventDefault();
    onKey?.(e);
  };

  return (
    <svg
      ref={ref}
      className={`board${interactive ? ' board--interactive' : ''}`}
      viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
      preserveAspectRatio="xMidYMid meet"
      role={interactive ? 'application' : 'img'}
      aria-label={label}
      tabIndex={interactive ? 0 : -1}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onKeyDown={handleKey}
      onContextMenu={(e) => e.preventDefault()}
    >
      <rect className="board__bg" x="0" y="0" width={BOARD_SIZE} height={BOARD_SIZE} rx="12" />
      {children}
    </svg>
  );
}

/** Player marker: crosshair inside a ring. */
export function Marker({ p, className = 'mk-user' }: { p: Point; className?: string }) {
  return (
    <g className={className} transform={`translate(${p.x} ${p.y})`}>
      <circle className="mk__halo" r="34" />
      <circle className="mk__ring" r="16" />
      <line className="mk__cross" x1="-26" y1="0" x2="26" y2="0" />
      <line className="mk__cross" x1="0" y1="-26" x2="0" y2="26" />
    </g>
  );
}

/** Correct-answer marker. */
export function TargetDot({ p }: { p: Point }) {
  return (
    <g className="mk-target pop" transform={`translate(${p.x} ${p.y})`}>
      <circle r="13" />
    </g>
  );
}

/** Animated "error" connector between the answer and the solution. */
export function ErrorLine({ from, to }: { from: Point; to: Point }) {
  return (
    <line
      className="err-line draw"
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      pathLength={1}
    />
  );
}
