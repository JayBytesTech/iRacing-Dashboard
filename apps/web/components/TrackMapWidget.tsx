'use client';

import { useState } from 'react';
import type { Car, LossZone } from '@/lib/contracts';
import { polarPosition } from '@/lib/trackmap';
import { geoPosition, segmentPath, trackPath, type TrackMap } from '@/lib/geotrack';
import { findTrackMap } from '@/lib/tracks';
import { classColor } from '@/lib/format';

// Track map: places the whole field by lap-distance. Two views — a topological circle (always
// available) and a geographic map of the real track shape (when we have one for this track, derived
// from .ibt GPS). Class-coloured dots, player highlighted, pit-road cars marked, S/F tick. Time-loss
// zones from the coach are highlighted on the track.

const CIRCLE_SIZE = 260;
const CC = CIRCLE_SIZE / 2;
const CR = 100;

export function TrackMapWidget({
  player,
  cars,
  trackName,
  lossZones,
}: {
  player: Car;
  cars: Car[];
  trackName?: string | null;
  lossZones?: LossZone[];
}) {
  const geo = findTrackMap(trackName);
  const [mode, setMode] = useState<'circle' | 'track'>('track');
  const useGeo = geo != null && mode === 'track';

  const field = [player, ...cars].filter((c) => c.lapDistPct != null);
  // Draw others first, player last so it's always on top.
  const ordered = [...field].sort((a) => (a.isPlayer ? 1 : -1));
  const classes = [...new Set(field.map((c) => c.className).filter(Boolean))] as string[];

  return (
    <section style={{ background: '#141925', borderRadius: 10, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.6 }}>Track map</span>
        <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {classes.map((cls) => (
            <span key={cls} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, opacity: 0.8 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: classColor(cls) }} />
              {cls}
            </span>
          ))}
          {geo && <ModeToggle mode={mode} onChange={setMode} />}
        </span>
      </div>

      {useGeo ? (
        <GeoMap map={geo!} cars={ordered} lossZones={lossZones} />
      ) : (
        <CircleMap cars={ordered} lossZones={lossZones} />
      )}

      <div style={{ textAlign: 'center', fontSize: 11, opacity: 0.45, marginTop: 4 }}>
        {useGeo ? `${geo!.name}${geo!.configName ? ` · ${geo!.configName}` : ''} · from your telemetry` : 'Topological (v0)'} ·
        dashed = on pit road
      </div>
    </section>
  );
}

function ModeToggle({ mode, onChange }: { mode: 'circle' | 'track'; onChange: (m: 'circle' | 'track') => void }) {
  return (
    <span style={{ display: 'inline-flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #2a3142' }}>
      {(['track', 'circle'] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          style={{
            fontSize: 11,
            padding: '2px 8px',
            border: 'none',
            cursor: 'pointer',
            background: mode === m ? '#2a3142' : 'transparent',
            color: mode === m ? '#e6e6e6' : '#8a90a0',
          }}
        >
          {m === 'track' ? 'Track' : 'Circle'}
        </button>
      ))}
    </span>
  );
}

function CircleMap({ cars, lossZones }: { cars: Car[]; lossZones?: LossZone[] }) {
  const sf = polarPosition(0, CC, CC, CR);
  const arc = (z: LossZone) => {
    const a = polarPosition(z.startPct, CC, CC, CR);
    const b = polarPosition(z.endPct, CC, CC, CR);
    const largeArc = z.endPct - z.startPct > 0.5 ? 1 : 0;
    return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${CR} ${CR} 0 ${largeArc} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
  };
  return (
    <svg viewBox={`0 0 ${CIRCLE_SIZE} ${CIRCLE_SIZE}`} width="100%" style={{ maxWidth: 320, display: 'block', margin: '0 auto' }}>
      <circle cx={CC} cy={CC} r={CR} fill="none" stroke="#2a3142" strokeWidth={14} />
      {(lossZones ?? []).map((z, i) => (
        <path key={i} d={arc(z)} fill="none" stroke="#ff9d5c" strokeWidth={14} strokeOpacity={0.55} />
      ))}
      <line x1={sf.x} y1={sf.y - 12} x2={sf.x} y2={sf.y + 12} stroke="#e6e6e6" strokeWidth={2} />
      <text x={CC} y={18} textAnchor="middle" fontSize={9} fill="#8a90a0">
        S/F
      </text>
      {cars.map((c) => {
        const p = polarPosition(c.lapDistPct as number, CC, CC, CR);
        return <CarDot key={c.carIdx} car={c} x={p.x} y={p.y} r={c.isPlayer ? 11 : 8} font={c.isPlayer ? 10 : 8.5} />;
      })}
    </svg>
  );
}

function GeoMap({ map, cars, lossZones }: { map: TrackMap; cars: Car[]; lossZones?: LossZone[] }) {
  const [, , w, h] = map.viewBox;
  const sf = geoPosition(0, map.points);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ maxWidth: 340, display: 'block', margin: '0 auto' }}>
      <path d={trackPath(map.points)} fill="none" stroke="#2a3142" strokeWidth={34} strokeLinejoin="round" />
      {(lossZones ?? []).map((z, i) => (
        <path
          key={i}
          d={segmentPath(z.startPct, z.endPct, map.points)}
          fill="none"
          stroke="#ff9d5c"
          strokeWidth={34}
          strokeOpacity={0.55}
          strokeLinecap="round"
        />
      ))}
      <circle cx={sf.x} cy={sf.y} r={10} fill="none" stroke="#e6e6e6" strokeWidth={3} />
      {cars.map((c) => {
        const p = geoPosition(c.lapDistPct as number, map.points);
        return <CarDot key={c.carIdx} car={c} x={p.x} y={p.y} r={c.isPlayer ? 30 : 24} font={c.isPlayer ? 28 : 23} />;
      })}
    </svg>
  );
}

function CarDot({ car, x, y, r, font }: { car: Car; x: number; y: number; r: number; font: number }) {
  const color = classColor(car.className);
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={r}
        fill={car.onPitRoad ? '#0e121b' : color}
        stroke={car.isPlayer ? '#ffffff' : car.onPitRoad ? color : 'rgba(0,0,0,0.4)'}
        strokeWidth={car.isPlayer ? r * 0.22 : car.onPitRoad ? r * 0.18 : r * 0.1}
        strokeDasharray={car.onPitRoad ? `${r * 0.3} ${r * 0.2}` : undefined}
      />
      <text
        x={x}
        y={y + font * 0.34}
        textAnchor="middle"
        fontSize={font}
        fontWeight={car.isPlayer ? 700 : 500}
        fill={car.onPitRoad ? color : '#0b0e14'}
      >
        {car.carNumber ?? car.carIdx}
      </text>
    </g>
  );
}
