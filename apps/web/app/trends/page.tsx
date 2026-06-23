'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listSessions } from '@/lib/journal';
import { buildTrends, RECENT_WINDOW, type RollingForm, type TrackTrend } from '@/lib/trends';
import { Sparkline } from '@/components/Sparkline';

// Trends: the cross-session view of the journal. "Am I actually getting faster at this track?" — best
// lap, consistency, and incidents over time, grouped by track layout + car. A track filter narrows the
// list; each card also shows recent form (last few sessions) alongside the all-time view.

export default function TrendsPage() {
  const [trends, setTrends] = useState<TrackTrend[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [track, setTrack] = useState<string | null>(null); // null = all tracks

  useEffect(() => {
    listSessions()
      .then((s) => setTrends(buildTrends(s)))
      .catch((e) => setError(String(e)));
  }, []);

  // Distinct tracks for the filter (in current activity order), and the filtered list.
  const tracks = trends ? [...new Set(trends.map((t) => t.track))] : [];
  const shown = trends?.filter((t) => track == null || t.track === track) ?? null;

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: 24, color: '#e6e6e6', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Trends</h1>
        <div style={{ display: 'flex', gap: 14 }}>
          <Link href="/log" style={{ color: '#6aa3ff', fontSize: 14 }}>journal →</Link>
          <Link href="/" style={{ color: '#6aa3ff', fontSize: 14 }}>← dashboard</Link>
        </div>
      </header>

      {error && (
        <p style={{ color: '#ff9d5c' }}>
          Couldn&apos;t reach the agent ({error}). Start it, then backfill with{' '}
          <code>dotnet run -- import &lt;folder-of-ibt&gt;</code>.
        </p>
      )}
      {!error && trends == null && <p style={{ opacity: 0.6 }}>Loading trends…</p>}
      {trends?.length === 0 && (
        <p style={{ opacity: 0.7 }}>
          No sessions yet. Backfill from existing telemetry with <code>dotnet run -- import &lt;folder-of-ibt&gt;</code>.
        </p>
      )}

      {tracks.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <FilterChip label="All tracks" active={track == null} onClick={() => setTrack(null)} />
          {tracks.map((t) => (
            <FilterChip key={t} label={t} active={track === t} onClick={() => setTrack(t)} />
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {shown?.map((t) => <TrendCard key={t.key} trend={t} />)}
      </div>
    </main>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 13,
        fontWeight: 600,
        padding: '5px 12px',
        borderRadius: 999,
        cursor: 'pointer',
        color: active ? '#0b0e14' : '#cdd6e4',
        background: active ? '#6aa3ff' : '#1b2130',
        border: '1px solid #2a3142',
      }}
    >
      {label}
    </button>
  );
}

function TrendCard({ trend }: { trend: TrackTrend }) {
  const single = trend.sessionCount < 2;
  return (
    <section style={{ background: '#141925', borderRadius: 10, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17 }}>
            {trend.track}
            {trend.trackConfig && <span style={{ opacity: 0.6 }}> · {trend.trackConfig}</span>}
          </h2>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
            {trend.car ?? 'Unknown car'} · {trend.sessionCount} session{trend.sessionCount === 1 ? '' : 's'}
          </div>
        </div>
        {trend.improvementSec != null && <ImprovementBadge sec={trend.improvementSec} />}
      </div>

      <div style={{ display: 'flex', gap: 24, marginTop: 14, flexWrap: 'wrap' }}>
        <TrendMetric
          label="Best lap"
          value={trend.bestLapEver != null ? fmtLap(trend.bestLapEver) : '—'}
          values={trend.points.map((p) => p.bestLapSec)}
          color="#6aa3ff"
          single={single}
        />
        <TrendMetric
          label="Consistency σ"
          value={trend.bestConsistencySec != null ? `${trend.bestConsistencySec.toFixed(2)}s` : '—'}
          values={trend.points.map((p) => p.stdDevSec)}
          color="#3ddc84"
          single={single}
        />
        <TrendMetric
          label="Incidents"
          value={`${trend.totalIncidents}x total`}
          values={trend.points.map((p) => p.incidents)}
          color="#ff9d5c"
          single={single}
        />
      </div>

      {!single && <RecentForm form={trend.recentForm} />}
    </section>
  );
}

// Rolling "recent form" strip: the same three measures, but over the last few sessions, so improving
// lately stands out from an all-time view that a long history can flatten.
function RecentForm({ form }: { form: RollingForm }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 18,
        flexWrap: 'wrap',
        marginTop: 14,
        paddingTop: 12,
        borderTop: '1px solid #232a38',
      }}
    >
      <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.5 }}>
        Last {form.windowSize} session{form.windowSize === 1 ? '' : 's'}
      </span>
      <FormStat label="best" value={form.bestLapSec != null ? fmtLap(form.bestLapSec) : '—'} />
      <FormStat label="avg σ" value={form.avgConsistencySec != null ? `${form.avgConsistencySec.toFixed(2)}s` : '—'} />
      <FormStat label="incidents" value={`${form.incidents}x`} />
      {form.improvementSec != null && (
        <span style={{ marginLeft: 'auto' }}>
          <ImprovementBadge sec={form.improvementSec} />
        </span>
      )}
    </div>
  );
}

function FormStat({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ fontSize: 13 }}>
      <span style={{ opacity: 0.55 }}>{label} </span>
      <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </span>
  );
}

function TrendMetric({
  label,
  value,
  values,
  color,
  single,
}: {
  label: string;
  value: string;
  values: (number | null)[];
  color: string;
  single: boolean;
}) {
  return (
    <div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.55 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums', margin: '2px 0 6px' }}>{value}</div>
      {single ? (
        <div style={{ fontSize: 11, opacity: 0.45 }}>one session — trend needs ≥2</div>
      ) : (
        <Sparkline values={values} color={color} />
      )}
    </div>
  );
}

function ImprovementBadge({ sec }: { sec: number }) {
  const faster = sec > 0.001;
  const slower = sec < -0.001;
  const color = faster ? '#3ddc84' : slower ? '#ff7a7a' : '#9aa4b2';
  const text = faster ? `▼ ${sec.toFixed(2)}s faster` : slower ? `▲ ${Math.abs(sec).toFixed(2)}s slower` : 'no change';
  return (
    <span style={{ fontSize: 13, fontWeight: 600, color, background: '#1b2130', borderRadius: 999, padding: '4px 12px' }}>
      {text}
    </span>
  );
}

function fmtLap(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = (sec - m * 60).toFixed(2);
  return m > 0 ? `${m}:${s.padStart(5, '0')}` : `${s}s`;
}
