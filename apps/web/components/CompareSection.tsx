import Link from 'next/link';
import type { CompareResult } from '@/lib/journal';
import { InputTraces } from '@/components/InputTraces';

// Cross-session "best ever here": this session's best lap vs the fastest other session at the same
// track+config+car. The agent computes it at view time (the PB moves as new sessions land). Shows the
// gap, where it's gained/lost across the lap, and the throttle/brake of both laps overlaid.

const card: React.CSSProperties = { background: '#141925', borderRadius: 10, padding: 18 };
const W = 300;
const H = 52;

export function CompareSection({ result }: { result: CompareResult }) {
  if (result.status === 'noDetail') return null; // older entry without a stored reference lap

  if (result.status === 'alone' || !result.comparison) {
    return (
      <div style={{ ...card, opacity: 0.7, fontSize: 14 }}>
        Only session here so far — run this track+car again and your best laps will line up side by side.
      </div>
    );
  }

  const c = result.comparison;
  // finalDeltaSec > 0 means this session is slower than the target.
  const slower = c.finalDeltaSec > 0.01;
  const faster = c.finalDeltaSec < -0.01;
  const color = faster ? '#3ddc84' : slower ? '#ff7a7a' : '#9aa4b2';
  const headline = c.thisIsBest
    ? `▼ ${fmtAbs(c.finalDeltaSec)} — your best ever here`
    : faster
      ? `▼ ${fmtAbs(c.finalDeltaSec)} faster than your best other lap`
      : slower
        ? `▲ ${fmtAbs(c.finalDeltaSec)} off your best here`
        : 'matched your best here';

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 18, fontWeight: 700, color }}>{headline}</span>
          <span style={{ fontSize: 13, opacity: 0.7 }}>
            this {fmtLap(c.thisBestLapSec)} · best {fmtLap(c.targetBestLapSec)}
          </span>
        </div>
        <div style={{ fontSize: 13, opacity: 0.65, marginTop: 4 }}>
          Compared against{' '}
          <Link href={`/log/${encodeURIComponent(c.targetId)}`} style={{ color: '#6aa3ff' }}>
            {c.targetTitle ?? 'another session'}
          </Link>
          {c.targetCapturedAt && ` · ${fmtDate(c.targetCapturedAt)}`} (lap {c.targetLap})
        </div>

        <DeltaTrace data={c.cumulativeDeltaSec} />
        <div style={{ fontSize: 10, opacity: 0.4, marginTop: 2 }}>
          cumulative gap across the lap · above the line = losing time to your best · 0% S/F → 100%
        </div>

        {c.lossZones.length > 0 && (
          <div style={{ marginTop: 12, display: 'grid', rowGap: 4 }}>
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.5 }}>
              Biggest difference vs your best
            </span>
            {c.lossZones.map((z, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ opacity: 0.8, fontVariantNumeric: 'tabular-nums' }}>
                  {Math.round(z.startPct * 100)}–{Math.round(z.endPct * 100)}% of lap
                </span>
                <span style={{ fontWeight: 600, color: '#ff9d5c' }}>+{z.secondsLost.toFixed(2)} s</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <InputTraces inputs={c.inputs} lossZones={c.lossZones} />
    </div>
  );
}

// Cumulative delta across the lap; zero baseline drawn. Rises above zero where this lap loses to the best.
function DeltaTrace({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const max = Math.max(0, ...data);
  const min = Math.min(0, ...data);
  const span = max - min || 1;
  const x = (i: number) => (i / (data.length - 1)) * W;
  const y = (v: number) => H - ((v - min) / span) * H;
  const path = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ marginTop: 12, display: 'block' }}>
      <line x1={0} y1={y(0)} x2={W} y2={y(0)} stroke="#2a3142" strokeWidth={1} />
      <path d={path} fill="none" stroke="#ff9d5c" strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}

function fmtAbs(sec: number): string {
  return `${Math.abs(sec).toFixed(2)}s`;
}
function fmtLap(sec: number | null): string {
  if (sec == null) return '—';
  const m = Math.floor(sec / 60);
  const s = (sec - m * 60).toFixed(2);
  return m > 0 ? `${m}:${s.padStart(5, '0')}` : `${s}s`;
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
