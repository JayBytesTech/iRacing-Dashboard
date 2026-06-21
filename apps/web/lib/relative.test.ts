import { describe, expect, it } from 'vitest';
import type { Car } from './contracts';
import { computeRelative } from './relative';

// Minimal Car factory — only the fields computeRelative reads matter; the rest default sensibly.
function car(carIdx: number, lapDistPct: number, extra: Partial<Car> = {}): Car {
  return {
    carIdx,
    carNumber: String(carIdx),
    driverName: null,
    teamName: null,
    className: 'GT3',
    classId: null,
    position: null,
    classPosition: null,
    lap: 10,
    lapCompleted: 9,
    lapDistPct,
    lastLapTimeSec: null,
    bestLapTimeSec: null,
    estTimeToCurrentLocationSec: null,
    onPitRoad: null,
    isPlayer: false,
    ...extra,
  };
}

// Player at the start/finish line (lapDistPct 0) with a 100 s reference lap keeps the gap math: a
// car at +0.10 of a lap ahead is +10 s.
const player = car(1, 0.0, { isPlayer: true, lap: 10, bestLapTimeSec: 100 });

describe('computeRelative', () => {
  it('splits cars into ahead and behind by track position', () => {
    const cars = [car(2, 0.1), car(3, 0.9)];
    const { ahead, behind } = computeRelative(player, cars);
    expect(ahead.map((e) => e.car.carIdx)).toEqual([2]);
    expect(behind.map((e) => e.car.carIdx)).toEqual([3]);
  });

  it('converts a track-position fraction into a gap in seconds via the reference lap time', () => {
    const { ahead } = computeRelative(player, [car(2, 0.1)]);
    expect(ahead[0].gapSeconds).toBeCloseTo(10, 5); // 0.1 lap * 100 s
  });

  it('handles start/finish wrap-around: a car just across the line is right behind, not a lap ahead', () => {
    // 0.98 of a lap "ahead" is really 0.02 of a lap behind.
    const { ahead, behind } = computeRelative(player, [car(2, 0.98)]);
    expect(ahead).toHaveLength(0);
    expect(behind).toHaveLength(1);
    expect(behind[0].gapSeconds).toBeCloseTo(-2, 5);
  });

  it('orders nearest-first on each side', () => {
    const cars = [car(2, 0.3), car(3, 0.1), car(4, 0.7), car(5, 0.9)];
    const { ahead, behind } = computeRelative(player, cars);
    expect(ahead.map((e) => e.car.carIdx)).toEqual([3, 2]); // +0.1 before +0.3
    expect(behind.map((e) => e.car.carIdx)).toEqual([5, 4]); // -0.1 before -0.3
  });

  it('limits each side to the requested count', () => {
    const cars = [car(2, 0.1), car(3, 0.2), car(4, 0.3), car(5, 0.4)];
    const { ahead } = computeRelative(player, cars, { count: 2 });
    expect(ahead).toHaveLength(2);
    expect(ahead.map((e) => e.car.carIdx)).toEqual([2, 3]);
  });

  it('reports lap difference for lapped traffic', () => {
    const lapped = car(2, 0.1, { lap: 9 }); // one lap down from the player on lap 10
    const { ahead } = computeRelative(player, [lapped]);
    expect(ahead[0].lapsDiff).toBe(-1);
  });

  it('excludes the player and skips cars without a track position', () => {
    const cars = [car(1, 0.0, { isPlayer: true }), car(2, null as unknown as number), car(3, 0.2)];
    const { ahead } = computeRelative(player, cars);
    expect(ahead.map((e) => e.car.carIdx)).toEqual([3]);
  });

  it('returns empty when the player has no track position', () => {
    const noPos = car(1, null as unknown as number, { isPlayer: true });
    expect(computeRelative(noPos, [car(2, 0.2)])).toEqual({ ahead: [], behind: [] });
  });

  it('falls back from best to last lap time, then to a default, for the reference', () => {
    const noBest = car(1, 0.0, { isPlayer: true, bestLapTimeSec: null, lastLapTimeSec: 120 });
    const { ahead } = computeRelative(noBest, [car(2, 0.1)]);
    expect(ahead[0].gapSeconds).toBeCloseTo(12, 5); // 0.1 * 120
  });

  it('lets an explicit refLapTimeSec override', () => {
    const { ahead } = computeRelative(player, [car(2, 0.25)], { refLapTimeSec: 80 });
    expect(ahead[0].gapSeconds).toBeCloseTo(20, 5); // 0.25 * 80
  });
});
