import { describe, expect, it } from 'vitest';
import { buildPace, slope, type PaceLap } from './pace';

function lap(p: Partial<PaceLap> & Pick<PaceLap, 'lap' | 'lapTimeSec'>): PaceLap {
  return { usedPitRoad: false, clean: true, ...p };
}

describe('slope', () => {
  it('is null with fewer than two points', () => {
    expect(slope([1], [100])).toBeNull();
    expect(slope([], [])).toBeNull();
  });

  it('fits a positive slope for degrading lap times', () => {
    // +0.2s per lap
    expect(slope([1, 2, 3, 4], [100.0, 100.2, 100.4, 100.6])).toBeCloseTo(0.2, 6);
  });

  it('is null when x has no spread', () => {
    expect(slope([3, 3, 3], [1, 2, 3])).toBeNull();
  });
});

describe('buildPace', () => {
  it('returns no data when there are no timed laps', () => {
    expect(buildPace([]).hasData).toBe(false);
    expect(buildPace([lap({ lap: 1, lapTimeSec: 0 })]).hasData).toBe(false);
  });

  it('splits stints at pit-road laps (pit lap closes the stint)', () => {
    const laps = [
      lap({ lap: 1, lapTimeSec: 101 }),
      lap({ lap: 2, lapTimeSec: 100 }),
      lap({ lap: 3, lapTimeSec: 130, usedPitRoad: true, clean: false }), // in-lap
      lap({ lap: 4, lapTimeSec: 105, clean: false }), // out-lap
      lap({ lap: 5, lapTimeSec: 100 }),
    ];
    const p = buildPace(laps);
    expect(p.stints).toHaveLength(2);
    expect(p.stints[0].fromLap).toBe(1);
    expect(p.stints[0].toLap).toBe(3);
    expect(p.stints[1].fromLap).toBe(4);
    expect(p.stints[1].toLap).toBe(5);
  });

  it('computes per-stint degradation from clean laps only', () => {
    const laps = [
      lap({ lap: 1, lapTimeSec: 100.0 }),
      lap({ lap: 2, lapTimeSec: 100.3 }),
      lap({ lap: 3, lapTimeSec: 100.6 }),
      lap({ lap: 4, lapTimeSec: 140.0, clean: false }), // spin — must not drag the slope
    ];
    const p = buildPace(laps);
    expect(p.stints).toHaveLength(1);
    expect(p.stints[0].degradationSecPerLap).toBeCloseTo(0.3, 6);
    expect(p.stints[0].medianCleanSec).toBeCloseTo(100.3, 6);
  });

  it('leaves degradation null for a stint with fewer than two clean laps', () => {
    const p = buildPace([
      lap({ lap: 1, lapTimeSec: 100 }),
      lap({ lap: 2, lapTimeSec: 130, clean: false }),
    ]);
    expect(p.stints[0].degradationSecPerLap).toBeNull();
  });

  it('takes the charting range from clean laps, ignoring outliers', () => {
    const p = buildPace([
      lap({ lap: 1, lapTimeSec: 100 }),
      lap({ lap: 2, lapTimeSec: 102 }),
      lap({ lap: 3, lapTimeSec: 200, clean: false }), // huge outlier
    ]);
    expect(p.minLapSec).toBeCloseTo(100, 6);
    expect(p.maxLapSec).toBeCloseTo(102, 6); // not 200
  });
});
