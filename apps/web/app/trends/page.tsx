'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listSessions } from '@/lib/journal';
import { buildTrends, type TrackTrend } from '@/lib/trends';
import { Sparkline } from '@/components/Sparkline';

// Trends: the cross-session view of the journal. "Am I actually getting faster at this track?" — best
// lap, consistency, and incidents over time, grouped by track layout + car.

export default function TrendsPage() {
  const [trends, setTrends] = useState<TrackTrend[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSessions()
      .then((s) => setTrends(buildTrends(s)))
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: 24, color: '#e6e6e6', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
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

      <div style={{ display: 'grid', gap: 16 }}>
        {trends?.map((t) => <TrendCard key={t.key} trend={t} />)}
      </div>
    </main>
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
    </section>
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
