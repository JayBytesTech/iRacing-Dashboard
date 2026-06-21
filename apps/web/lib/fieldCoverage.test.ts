import { describe, expect, it } from 'vitest';
import type { SnapshotPayload } from './contracts';
import { fieldCoverage } from './fieldCoverage';

function snapshot(overrides: Partial<SnapshotPayload> = {}): SnapshotPayload {
  return {
    connection: { iracingConnected: true, dataAgeMs: 20 },
    session: {
      sessionId: null,
      trackName: 'Test',
      sessionType: 'Race',
      sessionNum: 0,
      timeRemainingSec: null,
      lapsRemaining: 10,
      flagState: 'green',
    },
    player: {
      carIdx: 1,
      carNumber: '1',
      driverName: null,
      teamName: null,
      className: 'GT3',
      classId: null,
      position: 1,
      classPosition: 1,
      lap: 5,
      lapCompleted: 4,
      lapDistPct: 0.5,
      lastLapTimeSec: null,
      bestLapTimeSec: null,
      estTimeToCurrentLocationSec: null,
      onPitRoad: false,
      isPlayer: true,
      speedKph: 200,
      gear: 4,
      rpm: 7000,
      fuelLevelLiters: 40,
    },
    cars: [],
    strategy: null,
    events: [],
    ...overrides,
  };
}

describe('fieldCoverage', () => {
  it('returns nothing for a null snapshot', () => {
    expect(fieldCoverage(null)).toEqual([]);
  });

  it('marks populated player fields present and nullable ones absent', () => {
    const groups = fieldCoverage(snapshot());
    const player = groups.find((g) => g.group === 'Player car')!;
    expect(player.fields.find((f) => f.name === 'speedKph')!.present).toBe(true);
    expect(player.fields.find((f) => f.name === 'lapDistPct')!.present).toBe(true);
  });

  it('treats a missing strategy block as absent fuel fields', () => {
    const groups = fieldCoverage(snapshot({ strategy: null }));
    const fuel = groups.find((g) => g.group === 'Strategy / fuel')!;
    expect(fuel.fields.every((f) => !f.present)).toBe(true);
  });

  it('counts the field and reports first-car coverage', () => {
    const base = snapshot();
    const withCar = snapshot({
      cars: [{ ...base.player, carIdx: 2, isPlayer: false, position: 2, lastLapTimeSec: 95.1 }],
    });
    const groups = fieldCoverage(withCar);
    const fieldGroup = groups.find((g) => g.group.startsWith('Field'))!;
    expect(fieldGroup.group).toContain('1 cars');
    expect(fieldGroup.fields.find((f) => f.name === 'cars[0].lastLapTimeSec')!.present).toBe(true);
  });

  it('does not count NaN as present', () => {
    const groups = fieldCoverage(snapshot({ player: { ...snapshot().player, speedKph: NaN } }));
    const player = groups.find((g) => g.group === 'Player car')!;
    expect(player.fields.find((f) => f.name === 'speedKph')!.present).toBe(false);
  });
});
