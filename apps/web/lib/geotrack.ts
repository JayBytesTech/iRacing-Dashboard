// Pure geometry for the geographic track map. Unlike the topological circle (lib/trackmap.ts), this
// places cars on the track's REAL shape, derived from a clean lap's GPS in the agent's `maptrack`
// exporter. Points are a closed centerline in a normalized SVG viewBox; index i ≈ lap-distance i/N.

import type { Point } from './trackmap';

export interface TrackMap {
  trackId: string;
  name: string;
  configName: string | null;
  bins: number;
  viewBox: number[];
  points: [number, number][];
}

/** Centerline point at a lap-distance fraction (0..1), linearly interpolating around the loop. */
export function geoPosition(pct: number, points: ReadonlyArray<readonly [number, number]>): Point {
  const n = points.length;
  if (n === 0) return { x: 0, y: 0 };
  const wrapped = ((pct % 1) + 1) % 1; // handle pct >= 1 or < 0
  const f = wrapped * n;
  const i = Math.floor(f) % n;
  const t = f - Math.floor(f);
  const a = points[i];
  const b = points[(i + 1) % n];
  return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t };
}

/** Closed SVG path for the whole centerline. */
export function trackPath(points: ReadonlyArray<readonly [number, number]>): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ') + ' Z';
}

/** Open SVG path tracing the centerline between two lap-distance fractions (for a loss-zone overlay). */
export function segmentPath(
  startPct: number,
  endPct: number,
  points: ReadonlyArray<readonly [number, number]>,
): string {
  const n = points.length;
  if (n === 0 || endPct <= startPct) return '';
  const pts: Point[] = [geoPosition(startPct, points)];
  for (let i = Math.ceil(startPct * n); i < endPct * n; i++) pts.push({ x: points[i % n][0], y: points[i % n][1] });
  pts.push(geoPosition(endPct, points));
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}
