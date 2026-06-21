import type { SnapshotPayload } from './contracts';

// Inspects a live snapshot and reports which fields the widgets care about are actually populated.
// Pure so it's testable, and it's the heart of the /debug page: when real telemetry connects, this
// instantly shows what iRacing is (and isn't) giving us, grouped the way the dashboard consumes it.

export interface FieldStatus {
  name: string;
  present: boolean;
  value: unknown;
}

export interface CoverageGroup {
  group: string;
  fields: FieldStatus[];
}

const present = (v: unknown): boolean => v !== null && v !== undefined && !(typeof v === 'number' && Number.isNaN(v));

function field(name: string, value: unknown): FieldStatus {
  return { name, present: present(value), value };
}

export function fieldCoverage(snap: SnapshotPayload | null): CoverageGroup[] {
  if (!snap) return [];
  const p = snap.player ?? ({} as SnapshotPayload['player']);
  const s = snap.session ?? ({} as SnapshotPayload['session']);
  const fuel = snap.strategy?.fuel;
  const first = snap.cars?.[0];

  return [
    {
      group: 'Player car',
      fields: [
        field('speedKph', p.speedKph),
        field('gear', p.gear),
        field('rpm', p.rpm),
        field('fuelLevelLiters', p.fuelLevelLiters),
        field('lap', p.lap),
        field('lapDistPct', p.lapDistPct),
        field('position', p.position),
        field('classPosition', p.classPosition),
        field('onPitRoad', p.onPitRoad),
      ],
    },
    {
      group: 'Session',
      fields: [
        field('trackName', s.trackName),
        field('sessionType', s.sessionType),
        field('timeRemainingSec', s.timeRemainingSec),
        field('lapsRemaining', s.lapsRemaining),
        field('flagState', s.flagState),
      ],
    },
    {
      group: 'Strategy / fuel',
      fields: [
        field('strategy.fuel', fuel),
        field('fuelBurnPerLapLiters', fuel?.fuelBurnPerLapLiters),
        field('fuelToFinishLiters', fuel?.fuelToFinishLiters),
        field('status', fuel?.status),
      ],
    },
    {
      group: `Field (${snap.cars?.length ?? 0} cars)`,
      fields: [
        field('cars[0].position', first?.position),
        field('cars[0].lapDistPct', first?.lapDistPct),
        field('cars[0].className', first?.className),
        field('cars[0].lastLapTimeSec', first?.lastLapTimeSec),
        field('cars[0].estTimeToCurrentLocationSec', first?.estTimeToCurrentLocationSec),
      ],
    },
  ];
}
