import type { Car, LossZone } from '@/lib/contracts';
import { polarPosition } from '@/lib/trackmap';
import { classColor } from '@/lib/format';

// v0 track map: a topological loop (not geographically accurate) placing the whole field by
// lap-distance percentage. Class-coloured dots, player highlighted, pit-road cars marked, start/finish
// at the top. Gives the at-a-glance "where is everyone" view that a list can't.

const SIZE = 260;
const C = SIZE / 2;
const R = 100;

// SVG arc along the track ribbon between two lap-distance fractions (clockwise, matching car motion).
function arcPath(startPct: number, endPct: number): string {
  const a = polarPosition(startPct, C, C, R);
  const b = polarPosition(endPct, C, C, R);
  const largeArc = endPct - startPct > 0.5 ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${R} ${R} 0 ${largeArc} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

export function TrackMapWidget({ player, cars, lossZones }: { player: Car; cars: Car[]; lossZones?: LossZone[] }) {
  const field = [player, ...cars].filter((c) => c.lapDistPct != null);
  // Draw others first, player last so it's always on top.
  const ordered = [...field].sort((a) => (a.isPlayer ? 1 : -1));
  const classes = [...new Set(field.map((c) => c.className).filter(Boolean))] as string[];

  const sf = polarPosition(0, C, C, R);

  return (
    <section style={{ background: '#141925', borderRadius: 10, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.6 }}>Track map</span>
        <span style={{ display: 'flex', gap: 12 }}>
          {classes.map((cls) => (
            <span key={cls} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, opacity: 0.8 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: classColor(cls) }} />
              {cls}
            </span>
          ))}
        </span>
      </div>

      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" style={{ maxWidth: 320, display: 'block', margin: '0 auto' }}>
        {/* track ribbon */}
        <circle cx={C} cy={C} r={R} fill="none" stroke="#2a3142" strokeWidth={14} />
        {/* coaching: highlight where the latest lap lost the most time */}
        {(lossZones ?? []).map((z, i) => (
          <path
            key={i}
            d={arcPath(z.startPct, z.endPct)}
            fill="none"
            stroke="#ff9d5c"
            strokeWidth={14}
            strokeOpacity={0.55}
          />
        ))}
        {/* start/finish tick */}
        <line x1={sf.x} y1={sf.y - 12} x2={sf.x} y2={sf.y + 12} stroke="#e6e6e6" strokeWidth={2} />
        <text x={C} y={18} textAnchor="middle" fontSize={9} fill="#8a90a0">
          S/F
        </text>

        {ordered.map((c) => {
          const p = polarPosition(c.lapDistPct as number, C, C, R);
          const color = classColor(c.className);
          const r = c.isPlayer ? 11 : 8;
          return (
            <g key={c.carIdx}>
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                fill={c.onPitRoad ? '#0e121b' : color}
                stroke={c.isPlayer ? '#ffffff' : c.onPitRoad ? color : 'rgba(0,0,0,0.4)'}
                strokeWidth={c.isPlayer ? 2.5 : c.onPitRoad ? 2 : 1}
                strokeDasharray={c.onPitRoad ? '3 2' : undefined}
              />
              <text
                x={p.x}
                y={p.y + 3}
                textAnchor="middle"
                fontSize={c.isPlayer ? 10 : 8.5}
                fontWeight={c.isPlayer ? 700 : 500}
                fill={c.onPitRoad ? color : '#0b0e14'}
              >
                {c.carNumber ?? c.carIdx}
              </text>
            </g>
          );
        })}
      </svg>

      <div style={{ textAlign: 'center', fontSize: 11, opacity: 0.45, marginTop: 4 }}>
        Topological (v0) · dashed = on pit road
      </div>
    </section>
  );
}
