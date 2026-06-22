'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listSessions, saveEntry, type JournalSession } from '@/lib/journal';

// Driver's journal: a persistent log of every session, each pre-filled with the auto-captured stats
// (laps, best, consistency, fuel, stops) so the driver only adds the human layer — notes, a rating,
// and tags. Sessions are captured by the agent (`analyze <file> --save`, or live on session end).

export default function LogPage() {
  const [sessions, setSessions] = useState<JournalSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    listSessions()
      .then((s) => {
        setSessions(s);
        setSelectedId((cur) => cur ?? s[0]?.id ?? null);
      })
      .catch((e) => setError(String(e)));
  }, []);

  const selected = useMemo(() => sessions?.find((s) => s.id === selectedId) ?? null, [sessions, selectedId]);

  function onSaved(updated: JournalSession) {
    setSessions((prev) => prev?.map((s) => (s.id === updated.id ? updated : s)) ?? null);
  }

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: 24, color: '#e6e6e6', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Driver&apos;s Journal</h1>
        <div style={{ display: 'flex', gap: 14 }}>
          <Link href="/trends" style={{ color: '#6aa3ff', fontSize: 14 }}>
            trends →
          </Link>
          <Link href="/" style={{ color: '#6aa3ff', fontSize: 14 }}>
            ← dashboard
          </Link>
        </div>
      </header>

      {error && (
        <p style={{ color: '#ff9d5c' }}>
          Couldn&apos;t reach the agent ({error}). Start it, then capture a session with{' '}
          <code>dotnet run -- analyze &lt;file.ibt&gt; --save</code>.
        </p>
      )}
      {!error && sessions == null && <p style={{ opacity: 0.6 }}>Loading journal…</p>}
      {sessions?.length === 0 && (
        <p style={{ opacity: 0.7 }}>
          No sessions yet. Capture one with <code>dotnet run -- analyze &lt;file.ibt&gt; --save</code>.
        </p>
      )}

      {sessions && sessions.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 360px) 1fr', gap: 18, alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: 10 }}>
            {sessions.map((s) => (
              <SessionCard key={s.id} session={s} active={s.id === selectedId} onClick={() => setSelectedId(s.id)} />
            ))}
          </div>
          {selected && <EntryEditor key={selected.id} session={selected} onSaved={onSaved} />}
        </div>
      )}
    </main>
  );
}

function SessionCard({ session, active, onClick }: { session: JournalSession; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left',
        background: active ? '#1d2738' : '#141925',
        border: active ? '1px solid #3a4a6a' : '1px solid transparent',
        borderRadius: 10,
        padding: 14,
        cursor: 'pointer',
        color: 'inherit',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontWeight: 700 }}>{session.displayTitle}</span>
        <Stars rating={session.rating} small />
      </div>
      <div style={{ fontSize: 12, opacity: 0.6, marginTop: 3 }}>
        {fmtDate(session.capturedAt)} · {[session.car, session.sessionType].filter(Boolean).join(' · ')}
      </div>
      <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <span>{session.cleanLaps}/{session.laps} clean</span>
        {session.bestLapSec != null && <span>best {fmtLap(session.bestLapSec)}</span>}
        {session.stdDevSec != null && <span>σ {session.stdDevSec.toFixed(2)}s</span>}
        {session.stops != null && <span>{session.stops} stop{session.stops === 1 ? '' : 's'}</span>}
        {session.incidents != null && <span style={{ color: session.incidents > 0 ? '#ff9d5c' : undefined }}>{session.incidents}x</span>}
      </div>
      {session.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {session.tags.map((t) => (
            <Tag key={t} label={t} />
          ))}
        </div>
      )}
    </button>
  );
}

function EntryEditor({ session, onSaved }: { session: JournalSession; onSaved: (s: JournalSession) => void }) {
  const [title, setTitle] = useState(session.title ?? '');
  const [notes, setNotes] = useState(session.notes ?? '');
  const [rating, setRating] = useState<number | null>(session.rating);
  const [tagsText, setTagsText] = useState(session.tags.join(', '));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function save() {
    setSaving(true);
    try {
      const updated = await saveEntry(session.id, {
        title,
        notes,
        rating,
        tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean),
      });
      onSaved(updated);
      setTagsText(updated.tags.join(', '));
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={{ background: '#141925', borderRadius: 10, padding: 18 }}>
      {/* Auto-captured summary (read-only) */}
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.5 }}>Captured</div>
      <h2 style={{ margin: '4px 0 2px', fontSize: 18 }}>
        {[session.track, session.trackConfig].filter(Boolean).join(' · ')}
      </h2>
      <div style={{ fontSize: 13, opacity: 0.7 }}>
        {fmtDate(session.capturedAt)} · {[session.car, session.sessionType].filter(Boolean).join(' · ')}
      </div>
      <div style={{ display: 'flex', gap: 18, marginTop: 12, flexWrap: 'wrap' }}>
        <Metric label="Laps" value={`${session.cleanLaps}/${session.laps}`} />
        {session.bestLapSec != null && <Metric label="Best" value={fmtLap(session.bestLapSec)} />}
        {session.stdDevSec != null && <Metric label="σ" value={`${session.stdDevSec.toFixed(2)}s`} />}
        {session.fuelBurnPerLapLiters != null && <Metric label="Burn/lap" value={`${session.fuelBurnPerLapLiters.toFixed(2)} L`} />}
        {session.stops != null && <Metric label="Stops" value={String(session.stops)} />}
        {session.pitStops != null && <Metric label="Pit stops" value={String(session.pitStops)} />}
        {session.incidents != null && <Metric label="Incidents" value={`${session.incidents}x`} />}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #232a38', margin: '16px 0' }} />

      {/* Journal (editable) */}
      <Field label="Title">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={session.displayTitle}
          style={inputStyle}
        />
      </Field>

      <Field label="Rating">
        <Stars rating={rating} onChange={setRating} />
      </Field>

      <Field label="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          placeholder="How did it go? Setup changes, where you lost time, what to try next…"
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      </Field>

      <Field label="Tags (comma-separated)">
        <input
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          placeholder="enduro, wet, driver-swap"
          style={inputStyle}
        />
      </Field>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
        <button onClick={save} disabled={saving} style={saveStyle}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {savedAt && <span style={{ fontSize: 12, color: '#3ddc84' }}>Saved</span>}
      </div>
    </section>
  );
}

// ---- small presentational bits ---------------------------------------------------------------

function Stars({ rating, onChange, small }: { rating: number | null; onChange?: (r: number) => void; small?: boolean }) {
  const size = small ? 14 : 22;
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onClick={onChange ? () => onChange(n) : undefined}
          style={{
            fontSize: size,
            lineHeight: 1,
            cursor: onChange ? 'pointer' : 'default',
            color: rating != null && n <= rating ? '#e8b339' : '#3a4250',
          }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: '#232a38', opacity: 0.9 }}>{label}</span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, opacity: 0.55 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ fontSize: 12, opacity: 0.6, display: 'block', marginBottom: 5 }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0e121b',
  border: '1px solid #232a38',
  borderRadius: 8,
  padding: '8px 10px',
  color: '#e6e6e6',
  fontSize: 14,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const saveStyle: React.CSSProperties = {
  background: '#2a5bd7',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '8px 18px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

function fmtLap(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = (sec - m * 60).toFixed(1);
  return `${m}:${s.padStart(4, '0')}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
