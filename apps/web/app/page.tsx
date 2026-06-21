'use client';

import { useAgentConnection, type AgentStatus } from '@/lib/useAgentConnection';

// Milestone 0 dashboard: the thinnest possible end-to-end proof of the agent pipe.
// A connection banner + a few live-updating numbers. Everything else (widgets, layouts) builds
// on top of this same useAgentConnection hook.

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
    <main style={{ maxWidth: 820, margin: '0 auto', padding: 24 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <span
          style={{
            display: 'inline-block',
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: STATUS_COLOR[status],
          }}
        />
        <strong style={{ textTransform: 'uppercase', letterSpacing: 1 }}>{status}</strong>
        <span style={{ opacity: 0.6, fontSize: 14 }}>{AGENT_URL}</span>
      </header>

      <h1 style={{ fontSize: 18, fontWeight: 600, opacity: 0.8 }}>
        {snapshot?.session.trackName ?? 'Waiting for agent…'}
      </h1>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
          marginTop: 16,
        }}
      >
        <Stat label="Fuel" value={fmt(p?.fuelLevelLiters, 2)} unit="L" />
        <Stat label="Speed" value={fmt(p?.speedKph, 0)} unit="kph" />
        <Stat label="Lap" value={p?.lap != null ? String(p.lap) : '—'} />
        <Stat label="Lap %" value={p?.lapDistPct != null ? (p.lapDistPct * 100).toFixed(1) : '—'} unit="%" />
      </section>

      <p style={{ opacity: 0.5, fontSize: 13, marginTop: 32 }}>
        Milestone 0 — proving the agent → WebSocket → dashboard pipe. Start the mock agent with{' '}
        <code>node tools/mock-agent/mock-agent.mjs</code>.
      </p>
    </main>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div style={{ background: '#141925', borderRadius: 10, padding: '16px 18px' }}>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.6 }}>{label}</div>
      <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.1 }}>
        {value}
        {unit && <span style={{ fontSize: 18, opacity: 0.6, marginLeft: 6 }}>{unit}</span>}
      </div>
    </div>
  );
}

const fmt = (n: number | null | undefined, digits = 0) => (n == null ? '—' : n.toFixed(digits));
