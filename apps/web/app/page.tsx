'use client';

import { useAgentConnection, type AgentStatus } from '@/lib/useAgentConnection';
import { SessionHeader } from '@/components/SessionHeader';
import { FuelWidget } from '@/components/FuelWidget';
import { RelativeWidget } from '@/components/RelativeWidget';
import { LeaderboardWidget } from '@/components/LeaderboardWidget';
import { TrackMapWidget } from '@/components/TrackMapWidget';
import { CoachingWidget } from '@/components/CoachingWidget';
import { num } from '@/lib/format';
import Link from 'next/link';

// Live dashboard. Connection banner + session header + fuel strategy + a glanceable car card.
// Everything hangs off the single useAgentConnection hook.

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL ?? 'ws://localhost:5174/live';

const STATUS_COLOR: Record<AgentStatus, string> = {
  connecting: '#b08900',
  live: '#1f9d55',
  stale: '#b08900',
  disconnected: '#c0392b',
};

export default function LivePage() {
  const { snapshot, status } = useAgentConnection(AGENT_URL);
  const p = snapshot?.player;

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 14, height: 14, borderRadius: '50%', background: STATUS_COLOR[status] }} />
        <strong style={{ textTransform: 'uppercase', letterSpacing: 1 }}>{status}</strong>
        <span style={{ opacity: 0.5, fontSize: 13 }}>{AGENT_URL}</span>
        <Link href="/log" style={{ marginLeft: 'auto', fontSize: 13, color: '#6fb1ff' }}>
          journal →
        </Link>
        <Link href="/debug" style={{ fontSize: 13, color: '#6fb1ff' }}>
          debug →
        </Link>
      </header>

      {snapshot ? (
        <>
          <SessionHeader session={snapshot.session} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <FuelWidget
              player={snapshot.player}
              fuel={snapshot.strategy?.fuel}
              stintPlan={snapshot.strategy?.stintPlan}
            />

            {/* Glanceable car card */}
            <section
              style={{
                background: '#141925',
                borderRadius: 10,
                padding: 18,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 14,
              }}
            >
              <Stat label="Speed" value={num(p?.speedKph, 0)} unit="kph" />
              <Stat label="Gear" value={p?.gear != null ? String(p.gear) : '—'} />
              <Stat label="Lap" value={p?.lap != null ? String(p.lap) : '—'} />
              <Stat label="Lap %" value={p?.lapDistPct != null ? (p.lapDistPct * 100).toFixed(0) : '—'} unit="%" />
            </section>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <TrackMapWidget
              player={snapshot.player}
              cars={snapshot.cars}
              trackName={snapshot.session.trackName}
              lossZones={snapshot.coaching?.lastLap?.lossZones}
            />
            <CoachingWidget coaching={snapshot.coaching} />
            <RelativeWidget player={snapshot.player} cars={snapshot.cars} />
          </div>

          <LeaderboardWidget player={snapshot.player} cars={snapshot.cars} />
        </>
      ) : (
        <p style={{ opacity: 0.6 }}>Waiting for the agent… start it with <code>node tools/mock-agent/mock-agent.mjs</code>.</p>
      )}
    </main>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.6 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.1 }}>
        {value}
        {unit && <span style={{ fontSize: 15, opacity: 0.6, marginLeft: 5 }}>{unit}</span>}
      </div>
    </div>
  );
}
