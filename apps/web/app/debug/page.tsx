'use client';

import Link from 'next/link';
import { useAgentConnection, type AgentStatus } from '@/lib/useAgentConnection';
import { fieldCoverage } from '@/lib/fieldCoverage';

// Diagnostics view. The tool you keep open when first wiring real telemetry: raw snapshot, what the
// agent reports it can provide, which expected fields are actually populated, and a live message log.

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL ?? 'ws://localhost:5174/live';

const STATUS_COLOR: Record<AgentStatus, string> = {
  connecting: '#b08900',
  live: '#1f9d55',
  stale: '#b08900',
  disconnected: '#c0392b',
};

export default function DebugPage() {
  const { snapshot, status, capabilities, hello, messageLog, dataAgeMs } = useAgentConnection(AGENT_URL, {
    trackMessages: true,
  });
  const coverage = fieldCoverage(snapshot);

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 14, height: 14, borderRadius: '50%', background: STATUS_COLOR[status] }} />
        <strong style={{ textTransform: 'uppercase', letterSpacing: 1 }}>{status}</strong>
        <span style={{ opacity: 0.5, fontSize: 13 }}>{AGENT_URL}</span>
        <Link href="/" style={{ marginLeft: 'auto', fontSize: 13, color: '#6fb1ff' }}>
          ← dashboard
        </Link>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <Panel title="Connection">
          <KV k="status" v={status} />
          <KV k="data age" v={dataAgeMs != null ? `${dataAgeMs} ms` : '—'} />
          <KV k="iracing connected" v={String(snapshot?.connection.iracingConnected ?? '—')} />
          <KV k="agent version" v={String((hello?.agentVersion as string) ?? '—')} />
        </Panel>

        <Panel title="Capabilities">
          {capabilities ? (
            <>
              <KV k="tick rate" v={capabilities.telemetryTickRate != null ? `${capabilities.telemetryTickRate} Hz` : '—'} />
              <KV k="sessionInfo" v={(capabilities.sessionInfoSections ?? []).join(', ') || '—'} />
              <div style={{ marginTop: 6 }}>
                {Object.entries(capabilities.variables ?? {}).map(([name, info]) => (
                  <Dot key={name} ok={!!info.available} label={name} />
                ))}
              </div>
            </>
          ) : (
            <span style={{ opacity: 0.5 }}>No capabilities message received.</span>
          )}
        </Panel>
      </div>

      <Panel title="Field coverage (present / missing)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {coverage.length === 0 && <span style={{ opacity: 0.5 }}>Waiting for a snapshot…</span>}
          {coverage.map((g) => (
            <div key={g.group}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.55, marginBottom: 6 }}>
                {g.group}
              </div>
              {g.fields.map((f) => (
                <Dot key={f.name} ok={f.present} label={f.name} />
              ))}
            </div>
          ))}
        </div>
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 16 }}>
        <Panel title="Last snapshot (raw)">
          <pre
            style={{
              margin: 0,
              maxHeight: 360,
              overflow: 'auto',
              fontSize: 12,
              lineHeight: 1.5,
              color: '#cfe0ff',
            }}
          >
            {snapshot ? JSON.stringify(snapshot, null, 2) : '—'}
          </pre>
        </Panel>

        <Panel title="Message log">
          <div style={{ maxHeight: 360, overflow: 'auto', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
            {messageLog.length === 0 && <span style={{ opacity: 0.5 }}>—</span>}
            {messageLog.map((m, i) => (
              <div key={`${m.seq}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.85 }}>
                <span style={{ color: typeColor(m.type) }}>{m.type}</span>
                <span style={{ opacity: 0.5 }}>#{m.seq}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: '#141925', borderRadius: 10, padding: 16 }}>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.6, marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </section>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 13 }}>
      <span style={{ opacity: 0.6 }}>{k}</span>
      <span style={{ fontWeight: 600 }}>{v}</span>
    </div>
  );
}

function Dot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '2px 0', fontSize: 13 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: ok ? '#1f9d55' : '#c0392b', flexShrink: 0 }} />
      <span style={{ opacity: ok ? 0.9 : 0.55 }}>{label}</span>
    </div>
  );
}

function typeColor(type: string): string {
  if (type === 'liveSnapshot') return '#6fb1ff';
  if (type === 'heartbeat') return '#8a90a0';
  if (type === 'capabilities' || type === 'hello') return '#9be564';
  if (type === 'raceEvent') return '#ffb454';
  if (type === 'error') return '#ff6b6b';
  return '#e6e6e6';
}
