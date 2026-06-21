import type { Car } from '@/lib/contracts';
import { computeRelative, type RelativeEntry } from '@/lib/relative';
import { classColor, gap } from '@/lib/format';

// Cars immediately around the player by track position, the way a spotter reads them: a few ahead,
// the player, a few behind. Same-class cars pop; other classes are tinted by class. Lapped traffic
// and cars on pit road are flagged so you don't misread a gap.
export function RelativeWidget({ player, cars }: { player: Car; cars: Car[] }) {
  const { ahead, behind } = computeRelative(player, cars, { count: 3 });

  return (
    <section style={{ background: '#141925', borderRadius: 10, padding: 18 }}>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.6, marginBottom: 10 }}>
        Relative
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* ahead: furthest at top, nearest just above the player */}
        {[...ahead].reverse().map((e) => (
          <Row key={e.car.carIdx} entry={e} playerClass={player.className} />
        ))}
        <PlayerRow player={player} />
        {behind.map((e) => (
          <Row key={e.car.carIdx} entry={e} playerClass={player.className} />
        ))}
        {ahead.length === 0 && behind.length === 0 && (
          <div style={{ opacity: 0.5, fontSize: 13 }}>No nearby cars.</div>
        )}
      </div>
    </section>
  );
}

function Row({ entry, playerClass }: { entry: RelativeEntry; playerClass: string | null }) {
  const { car, gapSeconds, lapsDiff } = entry;
  const sameClass = car.className === playerClass;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '4px 34px 1fr auto',
        alignItems: 'center',
        gap: 8,
        padding: '5px 6px',
        borderRadius: 6,
        background: '#1b2130',
        opacity: sameClass ? 1 : 0.72,
      }}
    >
      <span style={{ width: 4, height: 22, borderRadius: 2, background: classColor(car.className) }} />
      <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>#{car.carNumber ?? car.carIdx}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {car.driverName ?? car.teamName ?? `Car ${car.carIdx}`}
        {lapsDiff !== 0 && (
          <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: lapsDiff > 0 ? '#ff9d5c' : '#6fb1ff' }}>
            {lapsDiff > 0 ? `+${lapsDiff}L` : `${lapsDiff}L`}
          </span>
        )}
        {car.onPitRoad && <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.7 }}>PIT</span>}
      </span>
      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{gap(gapSeconds)}</span>
    </div>
  );
}

function PlayerRow({ player }: { player: Car }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '4px 34px 1fr auto',
        alignItems: 'center',
        gap: 8,
        padding: '5px 6px',
        borderRadius: 6,
        background: '#2a3550',
        border: '1px solid #3c4a6b',
      }}
    >
      <span style={{ width: 4, height: 22, borderRadius: 2, background: classColor(player.className) }} />
      <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>#{player.carNumber ?? player.carIdx}</span>
      <span style={{ fontWeight: 700 }}>{player.driverName ?? 'You'}</span>
      <span style={{ opacity: 0.7 }}>—</span>
    </div>
  );
}
