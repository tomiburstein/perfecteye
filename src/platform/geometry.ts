/** Small 2D geometry toolkit. All game geometry lives on a 1000×1000 board. */

export const BOARD_SIZE = 1000;

export interface Point {
  x: number;
  y: number;
}

export const pt = (x: number, y: number): Point => ({ x, y });
export const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Point, k: number): Point => ({ x: a.x * k, y: a.y * k });
export const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

export const toRad = (deg: number): number => (deg * Math.PI) / 180;
export const toDeg = (rad: number): number => (rad * 180) / Math.PI;

/** Normalize degrees into [0, 360). */
export function normDeg(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

/** Smallest absolute difference between two directions, in [0, 180]. */
export function angleDiff(a: number, b: number): number {
  const d = Math.abs(normDeg(a) - normDeg(b));
  return d > 180 ? 360 - d : d;
}

/**
 * Point at `length` from `origin` in a *visual* direction `deg`
 * (0° = right, 90° = up, counter-clockwise), compensating for SVG's y-down axis.
 */
export function polar(origin: Point, deg: number, length: number): Point {
  const r = toRad(deg);
  return { x: origin.x + Math.cos(r) * length, y: origin.y - Math.sin(r) * length };
}

/** Visual direction (degrees, counter-clockwise, [0,360)) from `origin` to `p`. */
export function directionDeg(origin: Point, p: Point): number {
  return normDeg(toDeg(Math.atan2(origin.y - p.y, p.x - origin.x)));
}

/** Parameter t of the orthogonal projection of p on segment a→b (unclamped). */
export function projectT(p: Point, a: Point, b: Point): number {
  const ab = sub(b, a);
  const len2 = ab.x * ab.x + ab.y * ab.y;
  if (len2 === 0) return 0;
  const ap = sub(p, a);
  return (ap.x * ab.x + ap.y * ab.y) / len2;
}

export function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Interior angle at vertex b of the path a-b-c, in degrees [0,180]. */
export function interiorAngle(a: Point, b: Point, c: Point): number {
  return angleDiff(directionDeg(b, a), directionDeg(b, c));
}

export function isFinitePoint(p: unknown): p is Point {
  if (typeof p !== 'object' || p === null) return false;
  const { x, y } = p as Record<string, unknown>;
  return typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y);
}

/**
 * Convert a pointer position in CSS pixels into board units.
 * The board is drawn in a square viewBox with `xMidYMid meet`, so the square
 * is centred inside the element's rectangle. Because the result is expressed
 * in board units, it is identical for every screen size and pixel density.
 */
export function clientToBoard(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): Point {
  const size = Math.min(rect.width, rect.height);
  if (size <= 0) return { x: BOARD_SIZE / 2, y: BOARD_SIZE / 2 };
  const offsetX = rect.left + (rect.width - size) / 2;
  const offsetY = rect.top + (rect.height - size) / 2;
  return {
    x: ((clientX - offsetX) / size) * BOARD_SIZE,
    y: ((clientY - offsetY) / size) * BOARD_SIZE,
  };
}
