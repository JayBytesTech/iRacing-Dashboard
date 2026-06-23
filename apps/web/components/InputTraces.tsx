import type { LapInputs } from '@/lib/journal';
import type { LossZone } from '@/lib/contracts';

// Throttle & brake overlay for the coach: the worst representative lap vs the reference lap, drawn
// across the lap (S/F -> S/F, left to right). Both channels are bin-averaged 0..1. Time-loss zones are
// shaded so the driver can read *why* a zone cost time — braked earlier/harder, or lifted off throttle.

const W = 300;
const H = 48;

export function InputTraces({ inputs, lossZones }: { inputs: LapInputs; lossZones?: LossZone[] }) {
  return (
    <div style={{ background: '#141925', borderRadius: 10, padding: 18, marginTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.55 }}>
          Inputs · lap {inputs.lap} vs reference {inputs.referenceLap}
        </span>
        <span style={{ display: 'inline-flex', gap: 12, fontSize: 11 }}>
          <Legend color="#5b6577" label={`ref (lap ${inputs.referenceLap})`} />
          <Legend color="#ff9d5c" label={`lap ${inputs.lap}`} />
        </span>
      </div>

      <Channel title="Throttle" ref={inputs.refThrottle} lap={inputs.lapThrottle} lossZones={lossZones} />
      <Channel title="Brake" ref={inputs.refBrake} lap={inputs.lapBrake} lossZones={lossZones} />
      <div style={{ fontSize: 10, opacity: 0.4, marginTop: 4 }}>shaded = biggest time-loss zones · 0% S/F → 100%</div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, opacity: 0.8 }}>
      <span style={{ width: 14, height: 2, background: color, display: 'inline-block' }} />
      {label}
    </span>
  );
}

function Channel({
  title,
  ref,
  lap,
  lossZones,
}: {
  title: string;
  ref: number[];
  lap: number[];
  lossZones?: LossZone[];
}) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 2 }}>{title}</div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block' }}>
        {(lossZones ?? []).map((z, i) => (
          <rect
            key={i}
            x={z.startPct * W}
            y={0}
            width={Math.max(0, (z.endPct - z.startPct) * W)}
            height={H}
            fill="#ff9d5c"
            fillOpacity={0.1}
          />
        ))}
        <line x1={0} y1={H - 0.5} x2={W} y2={H - 0.5} stroke="#2a3142" strokeWidth={1} />
        <polyline points={poly(ref)} fill="none" stroke="#5b6577" strokeWidth={1.5} strokeLinejoin="round" />
        <polyline points={poly(lap)} fill="none" stroke="#ff9d5c" strokeWidth={1.5} strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// Map a 0..1 series onto the chart: full = top, zero = bottom.
function poly(values: number[]): string {
  const n = values.length;
  if (n === 0) return '';
  return values
    .map((v, i) => {
      const x = n === 1 ? W / 2 : (i / (n - 1)) * W;
      const y = H - Math.max(0, Math.min(1, v)) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
