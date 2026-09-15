import { Point } from "../types/leaf";

export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const smoothstep = (t: number) => {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
};

export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);

export function bounds(points: Point[]) {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

/** Larger side of the bounding box. */
export function size(points: Point[]): number {
  const b = bounds(points);
  return Math.max(b.width, b.height);
}

/** Length of the closed ring through `points`. */
export function perimeter(points: Point[]): number {
  return points.reduce((sum, p, i) => sum + dist(p, points[(i + 1) % points.length]), 0);
}
