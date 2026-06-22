import type { CoachingSnapshot } from '@/lib/contracts';
import { num } from '@/lib/format';

// Driving-coach widget: how consistent you are, and where the latest lap lost time vs your reference
// lap. The delta trace reads left-to-right across the lap (S/F -> S/F); an upward slope = losing time.
// Loss zones are also highlighted on the track map so "where" is spatial, not just a percentage.

const W = 300;
const H = 56;

export function CoachingWidget({ coaching }: { coaching?: CoachingSnapshot | null }) {
  if (!coaching || coaching.lapCount === 0) {
    return (
      <section style={{ background: '#141925', borderRadius: 10, padding: 18 }}>
        <Header />
        <div style={{ marginTop: 14, fontSize: 14, opacity: 0.6 }}>Gathering laps…</div>
      </section>
    );
  }

  const last = coaching.lastLap;
  const slower = (last?.finalDeltaSec ?? 0) > 0;

  return (
    <section style={{ background: '#141925', borderRadius: 10, padding: 18 }}>
      <Header refLap={coaching.referenceLap} />

      <div style={{ display: 'flex', gap: 18, marginTop: 12, flexWrap: 'wrap' }}>
        <Stat label="Best" value={coaching.bestLapSec != null ? lap(coaching.bestLapSec) : '—'} />
        <Stat label="σ consistency" value={`${num(coaching.stdDevSec, 2)} s`} />
        <Stat label="Spread" value={`${num(coaching.spreadSec, 2)} s`} />
      </div>

      {last && (
        <>
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 13, opacity: 0.7 }}>Lap {last.lap} vs reference</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: slower ? '#ff9d5c' : '#3ddc84' }}>
              {last.finalDeltaSec >= 0 ? '+' : ''}
              {num(last.finalDeltaSec, 2)} s
            </span>
          </div>

          <DeltaTrace data={last.cumulativeDeltaSec} />

          {last.lossZones.length > 0 && (
            <div style={{ marginTop: 10, display: 'grid', rowGap: 4 }}>
              <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.5 }}>
                Biggest time loss
              </span>
              {last.lossZones.map((z, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ opacity: 0.8, fontVariantNumeric: 'tabular-nums' }}>
                    {Math.round(z.startPct * 100)}–{Math.round(z.endPct * 100)}% of lap
                  </span>
                  <span style={{ fontWeight: 600, color: '#ff9d5c' }}>+{num(z.secondsLost, 2)} s</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Header({ refLap }: { refLap?: number | null }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.6 }}>Coach</span>
      {refLap != null && <span style={{ fontSize: 11, opacity: 0.5 }}>reference: lap {refLap}</span>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, opacity: 0.55 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

// Cumulative delta-vs-reference across the lap. Zero baseline drawn; the curve rises where time is lost.
function DeltaTrace({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const max = Math.max(0, ...data);
  const min = Math.min(0, ...data);
  const span = max - min || 1;
  const x = (i: number) => (i / (data.length - 1)) * W;
  const y = (v: number) => H - ((v - min) / span) * H;
  const path = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const zeroY = y(0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ marginTop: 10, display: 'block' }}>
      <line x1={0} y1={zeroY} x2={W} y2={zeroY} stroke="#2a3142" strokeWidth={1} />
      <path d={path} fill="none" stroke="#ff9d5c" strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}

function lap(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = (sec - m * 60).toFixed(1);
  return `${m}:${s.padStart(4, '0')}`;
}
