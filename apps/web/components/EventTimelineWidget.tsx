import type { RaceEvent, RaceEventKind } from '@/lib/contracts';
import { clock } from '@/lib/format';

// A spotter's log of what happened this session: pit stops and incidents, newest first. The agent
// already sends the most recent events first (capped), derived from the player's own telemetry — so it
// works from an .ibt replay too, not just live.

const KIND_META: Record<RaceEventKind, { label: string; dot: string }> = {
  PitEntry: { label: 'Pit entry', dot: '#6fb1ff' },
  PitExit: { label: 'Pit exit', dot: '#1f9d55' },
  Incident: { label: 'Incident', dot: '#ff7043' },
};

export function EventTimelineWidget({ events }: { events: RaceEvent[] }) {
  const pitStops = events.filter((e) => e.kind === 'PitEntry').length;
  const incidents = events
    .filter((e) => e.kind === 'Incident')
    .reduce((sum, e) => sum + (parseInt(e.detail ?? '1', 10) || 1), 0);

  return (
    <section style={{ background: '#141925', borderRadius: 10, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.6 }}>Timeline</div>
        <div style={{ fontSize: 12, opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>
          {pitStops} stop{pitStops === 1 ? '' : 's'} · {incidents}x
        </div>
      </div>

      {events.length === 0 ? (
        <div style={{ opacity: 0.5, fontSize: 13 }}>No events yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
          {events.map((e, i) => {
            const meta = KIND_META[e.kind];
            return (
              <div
                key={`${e.sessionTimeMs}-${e.kind}-${i}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '6px 56px 38px 1fr auto',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 6px',
                  borderRadius: 6,
                  background: '#1b2130',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.dot }} />
                <span style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.7, fontSize: 12 }}>
                  {clock(e.sessionTimeMs / 1000)}
                </span>
                <span style={{ fontSize: 12, opacity: 0.6 }}>{e.lap != null ? `L${e.lap}` : '—'}</span>
                <span style={{ fontWeight: 600 }}>{meta.label}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', color: e.kind === 'Incident' ? '#ff7043' : 'inherit' }}>
                  {e.detail ?? ''}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
