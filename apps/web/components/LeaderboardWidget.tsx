'use client';

import { useState } from 'react';
import type { Car } from '@/lib/contracts';
import { classColor, lapTime } from '@/lib/format';

// Standings table. Overall or class-only (filtered to the player's class). The player is merged into
// the field and highlighted. Cars are colour-tagged by class so multi-class order reads at a glance.
export function LeaderboardWidget({ player, cars }: { player: Car; cars: Car[] }) {
  const [mode, setMode] = useState<'overall' | 'class'>('overall');
  const field = [player, ...cars];

  const rows =
    mode === 'class'
      ? field
          .filter((c) => c.className === player.className)
          .sort((a, b) => (a.classPosition ?? 99) - (b.classPosition ?? 99))
      : field.slice().sort((a, b) => (a.position ?? 99) - (b.position ?? 99));

  return (
    <section style={{ background: '#141925', borderRadius: 10, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.6 }}>Leaderboard</span>
        <Toggle mode={mode} onChange={setMode} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '24px 34px 1fr auto auto', rowGap: 2, columnGap: 8, fontSize: 14 }}>
        <Head>P</Head>
        <Head>#</Head>
        <Head>Driver</Head>
        <Head right>Last</Head>
        <Head right>Best</Head>

        {rows.map((c) => {
          const pos = mode === 'class' ? c.classPosition : c.position;
          return (
            <div key={c.carIdx} style={{ display: 'contents' }}>
              <Cell player={c.isPlayer}>{pos ?? '—'}</Cell>
              <Cell player={c.isPlayer}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 3, height: 14, borderRadius: 2, background: classColor(c.className) }} />
                  {c.carNumber ?? c.carIdx}
                </span>
              </Cell>
              <Cell player={c.isPlayer} ellipsis>
                {c.driverName ?? c.teamName ?? `Car ${c.carIdx}`}
                {c.onPitRoad && <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.6 }}>PIT</span>}
              </Cell>
              <Cell player={c.isPlayer} right mono>{lapTime(c.lastLapTimeSec)}</Cell>
              <Cell player={c.isPlayer} right mono>{lapTime(c.bestLapTimeSec)}</Cell>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Toggle({ mode, onChange }: { mode: 'overall' | 'class'; onChange: (m: 'overall' | 'class') => void }) {
  return (
    <div style={{ display: 'flex', gap: 2, background: '#0e121b', borderRadius: 6, padding: 2 }}>
      {(['overall', 'class'] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          style={{
            border: 'none',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'capitalize',
            padding: '3px 10px',
            borderRadius: 4,
            background: mode === m ? '#2a3550' : 'transparent',
            color: mode === m ? '#fff' : '#8a90a0',
          }}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

function Head({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <div style={{ fontSize: 11, textTransform: 'uppercase', opacity: 0.45, textAlign: right ? 'right' : 'left', paddingBottom: 4 }}>
      {children}
    </div>
  );
}

function Cell({
  children,
  player,
  right,
  mono,
  ellipsis,
}: {
  children: React.ReactNode;
  player?: boolean | null;
  right?: boolean;
  mono?: boolean;
  ellipsis?: boolean;
}) {
  return (
    <div
      style={{
        padding: '5px 4px',
        textAlign: right ? 'right' : 'left',
        fontWeight: player ? 700 : 400,
        color: player ? '#cfe0ff' : '#e6e6e6',
        background: player ? '#222c44' : 'transparent',
        fontVariantNumeric: mono ? 'tabular-nums' : undefined,
        overflow: ellipsis ? 'hidden' : undefined,
        textOverflow: ellipsis ? 'ellipsis' : undefined,
        whiteSpace: ellipsis ? 'nowrap' : undefined,
      }}
    >
      {children}
    </div>
  );
}
