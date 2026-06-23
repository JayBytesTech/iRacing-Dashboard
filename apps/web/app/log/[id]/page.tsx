'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getSession, getSessionDetail, type JournalSession, type SessionDetail, type FuelDetail } from '@/lib/journal';
import { CoachingWidget } from '@/components/CoachingWidget';
import { InputTraces } from '@/components/InputTraces';
import { TrackMapWidget } from '@/components/TrackMapWidget';
import { EventTimelineWidget } from '@/components/EventTimelineWidget';
import type { Car } from '@/lib/contracts';

// Full session analysis: the CLI `analyze` report, in the browser. Everything was computed once at
// capture time and stored with the journal entry, so this view is instant and works even if the source
// .ibt is long gone. Four sections — fuel/stint, driving coach, track map (loss zones), event timeline —
// with a sticky jump nav so the driver can land straight on the part they care about.

const SECTIONS = [
  { id: 'fuel', label: 'Fuel & stints' },
  { id: 'coach', label: 'Coach' },
  { id: 'map', label: 'Track map' },
  { id: 'timeline', label: 'Timeline' },
] as const;

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const [session, setSession] = useState<JournalSession | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getSession(id), getSessionDetail(id)])
      .then(([s, d]) => {
        setSession(s);
        setDetail(d);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoaded(true));
  }, [id]);

  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: 24, color: '#e6e6e6', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>{session?.displayTitle ?? 'Session'}</h1>
        <Link href="/log" style={{ color: '#6aa3ff', fontSize: 14 }}>← journal</Link>
      </header>
      {session && (
        <div style={{ fontSize: 13, opacity: 0.65, marginBottom: 16 }}>
          {[session.track, session.trackConfig, session.car, session.sessionType].filter(Boolean).join(' · ')}
          {' · '}{session.laps} laps
        </div>
      )}

      {error && <p style={{ color: '#ff9d5c' }}>Couldn&apos;t reach the agent ({error}).</p>}
      {!error && !loaded && <p style={{ opacity: 0.6 }}>Loading analysis…</p>}

      {loaded && !error && detail == null && (
        <p style={{ opacity: 0.7, lineHeight: 1.6 }}>
          No stored analysis for this session. Detail is computed at capture time — entries captured before
          this feature need a one-time re-capture. If the source <code>.ibt</code> still exists, re-run{' '}
          <code>dotnet run -- analyze &lt;file.ibt&gt; --save</code> (or <code>import</code> the folder).
        </p>
      )}

      {detail && (
        <>
          <nav
            style={{
              position: 'sticky',
              top: 0,
              display: 'flex',
              gap: 8,
              padding: '10px 0',
              marginBottom: 8,
              background: '#0b0e14',
              zIndex: 5,
              borderBottom: '1px solid #1c2433',
            }}
          >
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#cdd6e4',
                  textDecoration: 'none',
                  padding: '5px 12px',
                  borderRadius: 999,
                  background: '#1b2130',
                  border: '1px solid #2a3142',
                }}
              >
                {s.label}
              </a>
            ))}
          </nav>

          <Section id="fuel" title="Fuel & stints">
            <FuelPanel fuel={detail.fuel} />
          </Section>

          <Section id="coach" title="Driving coach">
            <CoachingWidget coaching={detail.coaching} />
            {detail.inputs && <InputTraces inputs={detail.inputs} lossZones={detail.coaching?.lastLap?.lossZones} />}
            <LapGapTable detail={detail} />
          </Section>

          <Section id="map" title="Track map — time-loss zones">
            <TrackMapWidget
              player={EMPTY_PLAYER}
              cars={[]}
              trackName={detail.trackName}
              lossZones={detail.coaching?.lastLap?.lossZones}
            />
          </Section>

          <Section id="timeline" title="Event timeline">
            <EventTimelineWidget events={detail.events} />
          </Section>
        </>
      )}
    </main>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ scrollMarginTop: 56, marginTop: 22 }}>
      <h2 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.55, margin: '0 0 10px' }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

// A minimal player so TrackMapWidget renders the track shape + loss zones with no live field on it
// (lapDistPct === null is filtered out, so no car dots are drawn).
const EMPTY_PLAYER: Car = {
  carIdx: -1,
  carNumber: null,
  driverName: null,
  teamName: null,
  className: null,
  classId: null,
  position: null,
  classPosition: null,
  lap: null,
  lapCompleted: null,
  lapDistPct: null,
  lastLapTimeSec: null,
  bestLapTimeSec: null,
  estTimeToCurrentLocationSec: null,
  onPitRoad: null,
  isPlayer: true,
};

function FuelPanel({ fuel }: { fuel: FuelDetail | null }) {
  if (!fuel) {
    return <div style={{ ...cardStyle, opacity: 0.6, fontSize: 14 }}>No fuel data for this session.</div>;
  }
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginBottom: fuel.stints.length ? 16 : 0 }}>
        <Metric
          label="Burn / lap"
          value={fuel.burnPerLapMeanLiters != null ? `${fuel.burnPerLapMeanLiters.toFixed(2)} L` : '—'}
          sub={fuel.burnPerLapStdevLiters != null ? `± ${fuel.burnPerLapStdevLiters.toFixed(2)}` : undefined}
        />
        <Metric label="Fastest" value={fuel.fastestLapSec != null ? fmtLap(fuel.fastestLapSec) : '—'} />
        <Metric label="Median lap" value={fuel.medianLapSec != null ? fmtLap(fuel.medianLapSec) : '—'} />
        <Metric label="Clean laps" value={`${fuel.cleanLaps}/${fuel.totalLaps}`} />
      </div>

      {fuel.stints.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', opacity: 0.5 }}>
              <Th>Stint</Th>
              <Th>Laps</Th>
              <Th>Clean</Th>
              <Th right>Avg burn</Th>
            </tr>
          </thead>
          <tbody>
            {fuel.stints.map((s) => (
              <tr key={s.stintNo} style={{ borderTop: '1px solid #232a38' }}>
                <Td>#{s.stintNo}</Td>
                <Td>
                  {s.fromLap}–{s.toLap} <span style={{ opacity: 0.5 }}>({s.laps})</span>
                </Td>
                <Td>{s.cleanLaps}</Td>
                <Td right>{s.avgBurnLiters != null ? `${s.avgBurnLiters.toFixed(2)} L` : '—'}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function LapGapTable({ detail }: { detail: SessionDetail }) {
  if (detail.lapGaps.length === 0) return null;
  const max = Math.max(...detail.lapGaps.map((g) => g.gapToBestSec), 0.001);
  return (
    <div style={{ ...cardStyle, marginTop: 14 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.5, marginBottom: 10 }}>
        Lap consistency · gap to best
      </div>
      <div style={{ display: 'grid', rowGap: 4 }}>
        {detail.lapGaps.map((g) => (
          <div key={g.lap} style={{ display: 'grid', gridTemplateColumns: '46px 64px 1fr 56px', alignItems: 'center', gap: 8 }}>
            <span style={{ opacity: 0.6, fontSize: 12 }}>Lap {g.lap}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmtLap(g.lapTimeSec)}</span>
            <span style={{ height: 6, background: '#1b2130', borderRadius: 3, overflow: 'hidden' }}>
              <span
                style={{
                  display: 'block',
                  height: '100%',
                  width: `${(g.gapToBestSec / max) * 100}%`,
                  background: g.gapToBestSec < 0.01 ? '#3ddc84' : '#ff9d5c',
                }}
              />
            </span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, opacity: 0.75, textAlign: 'right' }}>
              {g.gapToBestSec < 0.01 ? 'best' : `+${g.gapToBestSec.toFixed(2)}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: '#141925', borderRadius: 10, padding: 18 };

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, opacity: 0.55 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {value}
        {sub && <span style={{ fontSize: 12, opacity: 0.5, marginLeft: 5, fontWeight: 500 }}>{sub}</span>}
      </div>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th style={{ padding: '4px 6px', fontWeight: 500, textAlign: right ? 'right' : 'left' }}>{children}</th>;
}
function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <td style={{ padding: '6px', textAlign: right ? 'right' : 'left', fontVariantNumeric: 'tabular-nums' }}>{children}</td>
  );
}

function fmtLap(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = (sec - m * 60).toFixed(2);
  return m > 0 ? `${m}:${s.padStart(5, '0')}` : `${s}s`;
}
