import { describe, expect, it } from 'vitest';
import type { JournalSession, SessionDetail } from './journal';
import { buildSessionMarkdown } from './sessionReport';

function session(p: Partial<JournalSession> = {}): JournalSession {
  return {
    id: 'ibt:x',
    capturedAt: '2026-06-19T21:00:00Z',
    track: 'Watkins Glen',
    trackConfig: 'Boot',
    car: 'Ferrari 296 GT3',
    sessionType: 'Race',
    laps: 49,
    cleanLaps: 44,
    bestLapSec: 106.18,
    stdDevSec: 0.61,
    fuelBurnPerLapLiters: 3.21,
    stops: 2,
    pitStops: 2,
    incidents: 11,
    source: 'ibt:x',
    title: null,
    notes: null,
    rating: null,
    tags: [],
    displayTitle: 'Watkins Glen · Race',
    ...p,
  };
}

describe('buildSessionMarkdown', () => {
  it('builds a header + summary from the session alone (no detail)', () => {
    const md = buildSessionMarkdown(session(), null);
    expect(md).toContain('# Watkins Glen · Race');
    expect(md).toContain('**Watkins Glen · Boot · Ferrari 296 GT3 · Race**');
    expect(md).toContain('## Summary');
    expect(md).toContain('Best lap: 1:46.18');
    expect(md).toContain('Consistency σ: 0.61s');
    expect(md).toContain('2 pit stops · 11x incidents');
    // No detail sections.
    expect(md).not.toContain('## Stints');
    expect(md).not.toContain('## Coach');
  });

  it('includes the human layer — rating, tags, notes', () => {
    const md = buildSessionMarkdown(
      session({ rating: 4, tags: ['enduro', 'driver-swap'], notes: 'Loose in T1.\nNeed more wing.' }),
      null,
    );
    expect(md).toContain('★★★★ (4/5)');
    expect(md).toContain('#enduro #driver-swap');
    expect(md).toContain('> Loose in T1.');
    expect(md).toContain('> Need more wing.'); // multi-line notes are blockquoted
  });

  it('adds stint, coach, and timeline sections when detail is present', () => {
    const detail: SessionDetail = {
      trackName: 'Watkins Glen',
      trackConfig: 'Boot',
      car: 'Ferrari 296 GT3',
      sessionType: 'Race',
      laps: 49,
      cleanLaps: 44,
      fuel: {
        burnPerLapMeanLiters: 3.21,
        burnPerLapStdevLiters: 0.04,
        fastestLapSec: 106.18,
        medianLapSec: 107.0,
        cleanLaps: 44,
        totalLaps: 49,
        stints: [{ stintNo: 1, fromLap: 1, toLap: 20, laps: 20, cleanLaps: 19, avgBurnLiters: 3.2 }],
      },
      coaching: {
        referenceLap: 12,
        lapCount: 44,
        bestLapSec: 106.18,
        meanLapSec: 107.0,
        stdDevSec: 0.61,
        spreadSec: 2.4,
        lastLap: { lap: 7, finalDeltaSec: 1.8, cumulativeDeltaSec: [], lossZones: [{ startPct: 0.1, endPct: 0.3, secondsLost: 0.9 }] },
      },
      inputs: null,
      paceLaps: [
        { lap: 1, lapTimeSec: 107.0, usedPitRoad: false, clean: true },
        { lap: 2, lapTimeSec: 107.2, usedPitRoad: false, clean: true },
      ],
      lapGaps: [],
      events: [
        { sessionTimeMs: 1000, lap: 21, kind: 'PitEntry', detail: null },
        { sessionTimeMs: 2000, lap: 7, kind: 'Incident', detail: '+2x' },
      ],
    };
    const md = buildSessionMarkdown(session(), detail);
    expect(md).toContain('## Stints');
    expect(md).toContain('L1–20 (20 laps): 3.20 L/lap');
    expect(md).toContain('## Coach');
    expect(md).toContain('Reference: lap 12 @ 1:46.18');
    expect(md).toContain('Worst lap 7: +1.80s');
    expect(md).toContain('10–30% of lap: +0.90s');
    expect(md).toContain('## Timeline');
    expect(md).toContain('1 pit stop · 2x incidents');
    expect(md).toContain('L7: incident +2x');
  });
});
