import { describe, it, expect } from 'vitest';
import { geoPosition, segmentPath, trackPath } from './geotrack';

// A unit square as a 4-point closed centerline: index i corresponds to lap-distance i/4.
const square: [number, number][] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
];

describe('geoPosition', () => {
  it('returns the exact point at a bin boundary', () => {
    expect(geoPosition(0, square)).toEqual({ x: 0, y: 0 });
    expect(geoPosition(0.25, square)).toEqual({ x: 10, y: 0 });
    expect(geoPosition(0.5, square)).toEqual({ x: 10, y: 10 });
  });

  it('interpolates between bins', () => {
    expect(geoPosition(0.125, square)).toEqual({ x: 5, y: 0 }); // halfway along the first edge
  });

  it('wraps pct >= 1 and < 0 back onto the loop', () => {
    expect(geoPosition(1, square)).toEqual({ x: 0, y: 0 });
    expect(geoPosition(-0.25, square)).toEqual({ x: 0, y: 10 });
  });

  it('interpolates across the closing edge (last point back to first)', () => {
    expect(geoPosition(0.9375, square)).toEqual({ x: 0, y: 2.5 }); // 3/4 from [0,10] toward [0,0]
  });
});

describe('trackPath', () => {
  it('builds a closed path', () => {
    expect(trackPath(square)).toBe('M0 0 L10 0 L10 10 L0 10 Z');
  });
});

describe('segmentPath', () => {
  it('traces the centerline between two fractions, anchored at the exact endpoints', () => {
    // 0.10 -> 0.40 starts mid-first-edge, passes the [10,0] corner, ends mid-second-edge.
    const d = segmentPath(0.1, 0.4, square);
    expect(d.startsWith('M4.0 0.0')).toBe(true);
    expect(d).toContain('L10.0 0.0'); // the corner bin is included
    expect(d.endsWith('L10.0 6.0')).toBe(true);
  });

  it('returns empty for a non-positive span', () => {
    expect(segmentPath(0.5, 0.5, square)).toBe('');
  });
});
