import type { SessionPace, StintPace, PaceLap } from '@/lib/pace';

// Lap time across the session, split by stint, with a dashed least-squares trend per stint so tyre
// degradation (a rising line) reads at a glance. Faster laps sit lower (matching our sparkline
// convention); non-clean laps are hollow/dim and clamped into range so a spin doesn't blow up the scale.

const W = 620;
const H = 190;
const PAD = { top: 12, right: 12, bottom: 22, left: 46 };
const STINT_COLORS = ['#6aa3ff', '#3ddc84', '#ff9d5c', '#c98bff', '#ffd166', '#5bd6d6'];

export function PaceChart({ pace }: { pace: SessionPace }) {
  if (!pace.hasData) {
    return <div style={{ background: '#141925', borderRadius: 10, padding: 18, opacity: 0.6, fontSize: 14 }}>No timed laps.</div>;
  }

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const span = Math.max(pace.maxLapSec - pace.minLapSec, 0.3);
  const yPad = span * 0.12;
  const lo = pace.minLapSec - yPad;
  const hi = pace.maxLapSec + yPad;

  const xOf = (lap: number) =>
    PAD.left + (pace.lastLap === pace.firstLap ? innerW / 2 : ((lap - pace.firstLap) / (pace.lastLap - pace.firstLap)) * innerW);
  const yOf = (t: number) => PAD.top + (innerH - ((clamp(t, lo, hi) - lo) / (hi - lo)) * innerH);

  // A few y gridlines (fastest, mid, slowest of the clean range).
  const yTicks = [pace.minLapSec, (pace.minLapSec + pace.maxLapSec) / 2, pace.maxLapSec];

  return (
    <div style={{ background: '#141925', borderRadius: 10, padding: 18 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={yOf(t)} x2={W - PAD.right} y2={yOf(t)} stroke="#232a38" strokeWidth={1} />
            <text x={PAD.left - 6} y={yOf(t) + 3} textAnchor="end" fontSize={10} fill="#8a90a0">
              {fmtLap(t)}
            </text>
          </g>
        ))}

        {pace.stints.map((s, i) => (
          <StintLayer key={s.stintNo} stint={s} color={STINT_COLORS[i % STINT_COLORS.length]} xOf={xOf} yOf={yOf} bottom={H - PAD.bottom} />
        ))}
      </svg>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10 }}>
        {/* Only legend the substantive (multi-lap) stints; single-lap formation/pit laps still plot as dots. */}
        {pace.stints
          .filter((s) => s.laps.length >= 2)
          .map((s) => (
            <StintLegend key={s.stintNo} stint={s} color={STINT_COLORS[(s.stintNo - 1) % STINT_COLORS.length]} />
          ))}
      </div>
    </div>
  );
}

function StintLayer({
  stint,
  color,
  xOf,
  yOf,
  bottom,
}: {
  stint: StintPace;
  color: string;
  xOf: (l: number) => number;
  yOf: (t: number) => number;
  bottom: number;
}) {
  const clean = stint.laps.filter((l) => l.clean);
  const line = clean.map((l) => `${xOf(l.lap).toFixed(1)},${yOf(l.lapTimeSec).toFixed(1)}`).join(' ');

  // Least-squares trend across the clean laps (recover the line from slope + clean-lap means).
  let trend: { x1: number; y1: number; x2: number; y2: number } | null = null;
  if (stint.degradationSecPerLap != null && clean.length >= 2) {
    const mx = clean.reduce((a, l) => a + l.lap, 0) / clean.length;
    const my = clean.reduce((a, l) => a + l.lapTimeSec, 0) / clean.length;
    const at = (lap: number) => my + stint.degradationSecPerLap! * (lap - mx);
    const a = clean[0].lap;
    const b = clean[clean.length - 1].lap;
    trend = { x1: xOf(a), y1: yOf(at(a)), x2: xOf(b), y2: yOf(at(b)) };
  }

  return (
    <g>
      {clean.length >= 2 && <polyline points={line} fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.85} strokeLinejoin="round" />}
      {trend && <line x1={trend.x1} y1={trend.y1} x2={trend.x2} y2={trend.y2} stroke={color} strokeWidth={1.5} strokeDasharray="4 3" strokeOpacity={0.9} />}
      {stint.laps.map((l) => (
        <Dot key={l.lap} lap={l} x={xOf(l.lap)} y={yOf(l.lapTimeSec)} color={color} />
      ))}
      {/* pit marker on the axis at the in-lap */}
      {stint.laps
        .filter((l) => l.usedPitRoad)
        .map((l) => (
          <text key={`pit-${l.lap}`} x={xOf(l.lap)} y={bottom + 14} textAnchor="middle" fontSize={9} fill="#8a90a0">
            ◆ L{l.lap}
          </text>
        ))}
    </g>
  );
}

function Dot({ lap, x, y, color }: { lap: PaceLap; x: number; y: number; color: string }) {
  if (lap.clean) return <circle cx={x} cy={y} r={2.6} fill={color} />;
  // outlier: hollow, dimmed
  return <circle cx={x} cy={y} r={2.6} fill="#0e121b" stroke={color} strokeWidth={1} strokeOpacity={0.5} />;
}

function StintLegend({ stint, color }: { stint: StintPace; color: string }) {
  const deg = stint.degradationSecPerLap;
  const degText =
    deg == null ? '—' : Math.abs(deg) < 0.005 ? 'flat' : `${deg > 0 ? '+' : '−'}${Math.abs(deg).toFixed(2)}s/lap`;
  const degColor = deg == null || Math.abs(deg) < 0.03 ? '#cdd6e4' : deg > 0 ? '#ff9d5c' : '#3ddc84';
  return (
    <span style={{ fontSize: 12, display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, alignSelf: 'center' }} />
      <span style={{ opacity: 0.8 }}>
        Stint {stint.stintNo} (L{stint.fromLap}–{stint.toLap})
      </span>
      <span style={{ fontWeight: 700, color: degColor }}>{degText}</span>
    </span>
  );
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function fmtLap(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = (sec - m * 60).toFixed(1);
  return m > 0 ? `${m}:${s.padStart(4, '0')}` : `${s}s`;
}
