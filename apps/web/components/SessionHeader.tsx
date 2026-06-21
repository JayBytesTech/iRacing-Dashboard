import type { SessionState } from '@/lib/contracts';
import { clock, num } from '@/lib/format';

// Track, session type, and how much race is left. Laps-remaining wins when the race is lap-limited;
// otherwise we show the time clock. Both come straight off the agent snapshot.
export function SessionHeader({ session }: { session: SessionState }) {
  const remaining =
    session.lapsRemaining != null
      ? `${num(session.lapsRemaining)} laps`
      : clock(session.timeRemainingSec);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        background: '#141925',
        borderRadius: 10,
        padding: '14px 18px',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{session.trackName ?? 'Waiting for session…'}</div>
        <div style={{ fontSize: 13, opacity: 0.6 }}>{session.sessionType ?? 'Unknown session'}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.6 }}>Remaining</div>
        <div style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{remaining}</div>
      </div>
    </div>
  );
}
