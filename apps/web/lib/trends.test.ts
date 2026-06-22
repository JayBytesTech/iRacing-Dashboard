import { describe, expect, it } from 'vitest';
import type { JournalSession } from './journal';
import { buildTrends } from './trends';

// Minimal session factory — only the fields buildTrends reads matter.
function session(p: Partial<JournalSession> & Pick<JournalSession, 'id' | 'capturedAt'>): JournalSession {
  return {
    track: 'Watkins Glen',
    trackConfig: 'Boot',
    car: 'Ferrari 296 GT3',
    sessionType: 'Race',
    laps: 20,
    cleanLaps: 18,
    bestLapSec: null,
    stdDevSec: null,
    fuelBurnPerLapLiters: null,
    stops: null,
    pitStops: null,
    incidents: null,
    source: null,
    title: null,
    notes: null,
    rating: null,
    tags: [],
    displayTitle: 'x',
    ...p,
  };
}

describe('buildTrends', () => {
  it('groups by track + config + car and orders points chronologically', () => {
    const sessions = [
      session({ id: 'b', capturedAt: '2026-02-01T00:00:00Z', bestLapSec: 106.0 }),
      session({ id: 'a', capturedAt: '2026-01-01T00:00:00Z', bestLapSec: 108.0 }),
    ];
    const trends = buildTrends(sessions);
    expect(trends).toHaveLength(1);
    expect(trends[0].points.map((p) => p.id)).toEqual(['a', 'b']); // oldest first
    expect(trends[0].sessionCount).toBe(2);
  });

  it('separates the same track in a different car', () => {
    const trends = buildTrends([
      session({ id: '1', capturedAt: '2026-01-01T00:00:00Z', car: 'Ferrari 296 GT3' }),
      session({ id: '2', capturedAt: '2026-01-02T00:00:00Z', car: 'Porsche 992 GT3' }),
    ]);
    expect(trends).toHaveLength(2);
  });

  it('computes personal best, latest best, and improvement (first - latest)', () => {
    const trends = buildTrends([
      session({ id: 'a', capturedAt: '2026-01-01T00:00:00Z', bestLapSec: 108.0 }),
      session({ id: 'b', capturedAt: '2026-02-01T00:00:00Z', bestLapSec: 105.5 }),
      session({ id: 'c', capturedAt: '2026-03-01T00:00:00Z', bestLapSec: 106.2 }),
    ]);
    const t = trends[0];
    expect(t.bestLapEver).toBeCloseTo(105.5, 5);
    expect(t.latestBestLap).toBeCloseTo(106.2, 5);
    expect(t.improvementSec).toBeCloseTo(1.8, 5); // 108.0 - 106.2, got faster
  });

  it('leaves improvement null with only one timed session', () => {
    const trends = buildTrends([
      session({ id: 'a', capturedAt: '2026-01-01T00:00:00Z', bestLapSec: 108.0 }),
    ]);
    expect(trends[0].improvementSec).toBeNull();
  });

  it('handles missing best laps without crashing and sums incidents', () => {
    const trends = buildTrends([
      session({ id: 'a', capturedAt: '2026-01-01T00:00:00Z', bestLapSec: null, incidents: 4 }),
      session({ id: 'b', capturedAt: '2026-02-01T00:00:00Z', bestLapSec: 107.0, incidents: 2 }),
    ]);
    const t = trends[0];
    expect(t.bestLapEver).toBeCloseTo(107.0, 5);
    expect(t.improvementSec).toBeNull(); // only one session has a time
    expect(t.totalIncidents).toBe(6);
  });

  it('tracks best consistency (lowest sigma)', () => {
    const trends = buildTrends([
      session({ id: 'a', capturedAt: '2026-01-01T00:00:00Z', stdDevSec: 0.8 }),
      session({ id: 'b', capturedAt: '2026-02-01T00:00:00Z', stdDevSec: 0.4 }),
    ]);
    expect(trends[0].bestConsistencySec).toBeCloseTo(0.4, 5);
  });

  it('skips sessions with no track and orders groups by activity', () => {
    const trends = buildTrends([
      session({ id: 'x', capturedAt: '2026-01-01T00:00:00Z', track: null }),
      session({ id: 'v', capturedAt: '2026-01-05T00:00:00Z', track: 'VIR', trackConfig: 'Full', car: 'Porsche' }),
      session({ id: 'g1', capturedAt: '2026-01-02T00:00:00Z' }),
      session({ id: 'g2', capturedAt: '2026-01-03T00:00:00Z' }),
    ]);
    expect(trends.map((t) => t.track)).toEqual(['Watkins Glen', 'VIR']); // 2-session group first
  });
});
