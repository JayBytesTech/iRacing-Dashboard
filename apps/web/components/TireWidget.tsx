import type { TireSet, TireCorner } from '@/lib/contracts';

// Four-corner tire readout: live surface temps (inner/mid/outer), hot pressure, and tread wear.
// All channels are null-tolerant — iRacing exposes them per car/series, so a missing value renders
// as "—" rather than a zero. Temps/pressure are live (~60 Hz upstream, sampled at the snapshot rate);
// wear updates roughly per lap. Corners are laid out as seen from above, front of car at top.

// iRacing reports tread temps as left/middle/right in the car's frame, so within every cell we draw
// L→M→R left-to-right. That naturally puts each tire's inner edge toward the centerline.

const TEMP_MIN = 50; // °C — below this reads "cold" (blue)
const TEMP_HOT = 105; // °C — at/above this reads "overheating" (red)

function tempColor(c: number | null | undefined): string {
  if (c == null) return '#2a3140';
  // Blue (cold) → green (in window) → red (hot). Window centered ~85°C.
  const t = Math.max(0, Math.min(1, (c - TEMP_MIN) / (TEMP_HOT - TEMP_MIN)));
  const hue = 220 - t * 220; // 220 (blue) → 0 (red), passing ~120 (green) mid-range
  return `hsl(${hue}, 70%, 45%)`;
}

function wearColor(frac: number | null | undefined): string {
  if (frac == null) return '#6b7280';
  if (frac >= 0.5) return '#1f9d55';
  if (frac >= 0.25) return '#b08900';
  return '#c0392b';
}

const fmt = (v: number | null | undefined, d = 0) => (v == null ? '—' : v.toFixed(d));

function Corner({ label, t }: { label: string; t: TireCorner | undefined }) {
  const temps = [t?.tempLeftC, t?.tempMidC, t?.tempRightC];
  const wears = [t?.wearLeft, t?.wearMid, t?.wearRight].filter((w): w is number => w != null);
  const minWear = wears.length ? Math.min(...wears) : null; // worst edge drives the stint
  const psi = t?.pressureKpa != null ? t.pressureKpa * 0.1450377 : null;

  return (
    <div style={{ background: '#0f131c', borderRadius: 8, padding: 10 }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.55, marginBottom: 6 }}>
        {label}
      </div>

      {/* three tread-temp segments, L→M→R */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
        {temps.map((c, i) => (
          <div
            key={i}
            title={['outer/left', 'middle', 'inner/right'][i]}
            style={{
              flex: 1,
              background: tempColor(c),
              borderRadius: 4,
              padding: '6px 0',
              textAlign: 'center',
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            {fmt(c)}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ opacity: 0.7 }}>
          {fmt(t?.pressureKpa, 0)} kPa
          {psi != null && <span style={{ opacity: 0.5 }}> · {psi.toFixed(1)} psi</span>}
        </span>
        <span style={{ color: wearColor(minWear), fontWeight: 700 }}>
          {minWear != null ? `${(minWear * 100).toFixed(0)}%` : '—'}
        </span>
      </div>
    </div>
  );
}

export function TireWidget({ tires }: { tires?: TireSet | null }) {
  return (
    <section style={{ background: '#141925', borderRadius: 10, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.6 }}>Tires</span>
        <span style={{ fontSize: 10, opacity: 0.4 }}>°C · pressure · tread left</span>
      </div>

      {tires ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Corner label="LF" t={tires.lf} />
          <Corner label="RF" t={tires.rf} />
          <Corner label="LR" t={tires.lr} />
          <Corner label="RR" t={tires.rr} />
        </div>
      ) : (
        <p style={{ opacity: 0.5, fontSize: 13, margin: 0 }}>No tire data (not exposed for this car, or agent pre-tire build).</p>
      )}
    </section>
  );
}
