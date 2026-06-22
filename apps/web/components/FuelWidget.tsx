import type { FuelEstimate, FuelStatus, FuelConfidence, PlayerCar, StintPlan } from '@/lib/contracts';
import { num, signedLiters } from '@/lib/format';

// The headline strategy widget. Shows current fuel big, the crew-chief "add X litres" number, and the
// supporting estimates — always labelled with confidence and a status so an estimate never reads as
// fact (dashboard spec). Degrades to a "gathering data" state until the engine has clean laps.

const STATUS_STYLE: Record<FuelStatus, { label: string; bg: string; fg: string }> = {
  Safe: { label: 'Safe', bg: '#13412a', fg: '#3ddc84' },
  Marginal: { label: 'Marginal', bg: '#4a3a12', fg: '#e8b339' },
  PitRequired: { label: 'Pit required', bg: '#4a2412', fg: '#ff9d5c' },
  Critical: { label: 'Critical', bg: '#4a1212', fg: '#ff6b6b' },
  Unknown: { label: 'No estimate', bg: '#23262e', fg: '#9aa0aa' },
};

const CONFIDENCE_OPACITY: Record<FuelConfidence, number> = { Low: 0.45, Medium: 0.7, High: 1 };

export function FuelWidget({
  player,
  fuel,
  stintPlan,
}: {
  player: PlayerCar;
  fuel?: FuelEstimate;
  stintPlan?: StintPlan | null;
}) {
  const status = fuel?.status ?? 'Unknown';
  const s = STATUS_STYLE[status];
  const hasEstimate = fuel != null && fuel.fuelBurnPerLapLiters != null;
  // A race longer than one tank: show stops + stint length, not a single (impossible) "add X L".
  const multiStop = stintPlan != null && stintPlan.stopsRemaining >= 1;

  return (
    <section style={{ background: '#141925', borderRadius: 10, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.6 }}>Fuel</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: 999,
            background: s.bg,
            color: s.fg,
          }}
        >
          {s.label}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 44, fontWeight: 700, lineHeight: 1 }}>{num(player.fuelLevelLiters, 1)}</span>
        <span style={{ fontSize: 18, opacity: 0.6 }}>L aboard</span>
      </div>

      {hasEstimate ? (
        <>
          {multiStop ? (
            /* Enduro: a single "add X L" would exceed the tank. Show the plan a crew actually calls. */
            <div style={{ marginTop: 14, padding: '12px', borderRadius: 8, background: '#1d2330' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
                    {stintPlan!.stopsRemaining}
                    <span style={{ fontSize: 14, opacity: 0.6, fontWeight: 600 }}>
                      {' '}stop{stintPlan!.stopsRemaining === 1 ? '' : 's'} to go
                    </span>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, opacity: 0.7 }}>
                    {stintPlan!.maxLapsPerStint}-lap stints · {stintPlan!.lapsOnCurrentFuel.toFixed(0)} laps on current fuel
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>
                    {num(stintPlan!.fuelToAddTotalLiters, 0)} <span style={{ fontSize: 13, opacity: 0.6 }}>L</span>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>to add total</div>
                </div>
              </div>
            </div>
          ) : (
            /* Sprint / final tank: the crew-chief single number. */
            fuel!.fuelToAddAtNextStopLiters != null && fuel!.fuelToAddAtNextStopLiters > 0 && (
              <div
                style={{
                  marginTop: 14,
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: '#1d2330',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <span style={{ opacity: 0.7 }}>Add at next stop</span>
                <span style={{ fontSize: 24, fontWeight: 700 }}>
                  {num(fuel!.fuelToAddAtNextStopLiters, 1)} <span style={{ fontSize: 14, opacity: 0.6 }}>L</span>
                </span>
              </div>
            )
          )}

          <dl style={{ margin: '14px 0 0', display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 8, columnGap: 12 }}>
            <Row label="Burn / lap" value={`${num(fuel!.fuelBurnPerLapLiters, 2)} L`} />
            <Row label="Laps of fuel left" value={num(fuel!.estimatedLapsRemaining, 1)} />
            <Row label="Fuel to finish" value={fuel!.fuelToFinishLiters != null ? `${num(fuel!.fuelToFinishLiters, 1)} L` : '—'} />
            <Row label="Delta to finish" value={`${signedLiters(fuel!.fuelDeltaToFinishLiters)} L`} />
          </dl>

          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.55 }}>
            Confidence:{' '}
            <span style={{ opacity: CONFIDENCE_OPACITY[fuel!.confidence], fontWeight: 600 }}>{fuel!.confidence}</span>{' '}
            · {fuel!.sampleLapCount} clean lap{fuel!.sampleLapCount === 1 ? '' : 's'} sampled
          </div>
        </>
      ) : (
        <div style={{ marginTop: 14, fontSize: 14, opacity: 0.6 }}>
          Gathering clean laps… {fuel ? `(${fuel.sampleLapCount} so far)` : ''}
        </div>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt style={{ opacity: 0.6 }}>{label}</dt>
      <dd style={{ margin: 0, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{value}</dd>
    </>
  );
}
