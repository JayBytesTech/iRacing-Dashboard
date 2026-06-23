import type { JournalSession, SessionDetail } from './journal';
import { buildPace } from './pace';

// Build a clean, shareable markdown summary of a session — the kind of thing you'd paste to a co-driver.
// Pure (no DOM, no fetch) so it's unit-testable and reusable for both clipboard copy and file download.
// Degrades gracefully when there's no stored analysis (older entries): header + the summary stats only.

export function buildSessionMarkdown(session: JournalSession, detail: SessionDetail | null): string {
  const out: string[] = [];
  const subtitle = [session.track, session.trackConfig, session.car, session.sessionType]
    .filter(Boolean)
    .join(' · ');

  out.push(`# ${session.displayTitle}`);
  if (subtitle) out.push(`**${subtitle}** · ${fmtDate(session.capturedAt)}`);
  const meta = [session.rating != null ? `${'★'.repeat(session.rating)} (${session.rating}/5)` : null,
    session.tags.length ? session.tags.map((t) => `#${t}`).join(' ') : null]
    .filter(Boolean)
    .join('  ');
  if (meta) out.push(meta);
  if (session.notes) out.push('', `> ${session.notes.replace(/\n/g, '\n> ')}`);

  // --- Summary ---
  out.push('', '## Summary');
  out.push(`- Laps: ${session.cleanLaps}/${session.laps} clean`);
  if (session.bestLapSec != null) out.push(`- Best lap: ${fmtLap(session.bestLapSec)}`);
  if (session.stdDevSec != null) out.push(`- Consistency σ: ${session.stdDevSec.toFixed(2)}s`);
  if (session.fuelBurnPerLapLiters != null) out.push(`- Fuel burn: ${session.fuelBurnPerLapLiters.toFixed(2)} L/lap`);
  const pitInc = [
    session.pitStops != null ? `${session.pitStops} pit stop${session.pitStops === 1 ? '' : 's'}` : null,
    session.incidents != null ? `${session.incidents}x incidents` : null,
  ].filter(Boolean);
  if (pitInc.length) out.push(`- ${pitInc.join(' · ')}`);

  if (detail) appendDetail(out, detail);

  out.push('', '_— iRacing Engineer Dashboard_');
  return out.join('\n');
}

function appendDetail(out: string[], detail: SessionDetail): void {
  // --- Stints (fuel) + pace degradation ---
  const pace = buildPace(detail.paceLaps ?? []);
  const degByStint = new Map(pace.stints.map((s) => [s.fromLap, s.degradationSecPerLap]));

  if (detail.fuel && detail.fuel.stints.length > 0) {
    out.push('', '## Stints');
    for (const s of detail.fuel.stints) {
      const burn = s.avgBurnLiters != null ? `${s.avgBurnLiters.toFixed(2)} L/lap` : '—';
      const deg = degByStint.get(s.fromLap);
      const degText = s.laps < 2 || deg == null ? null : Math.abs(deg) < 0.005 ? 'flat' : `${deg > 0 ? '+' : '−'}${Math.abs(deg).toFixed(2)}s/lap`;
      out.push(`- L${s.fromLap}–${s.toLap} (${s.laps} lap${s.laps === 1 ? '' : 's'}): ${burn}${degText ? ` · pace ${degText}` : ''}`);
    }
  }

  // --- Coach ---
  const c = detail.coaching;
  if (c) {
    out.push('', '## Coach');
    if (c.referenceLap != null && c.bestLapSec != null) out.push(`- Reference: lap ${c.referenceLap} @ ${fmtLap(c.bestLapSec)}`);
    if (c.spreadSec != null) out.push(`- Spread (best→worst): ${c.spreadSec.toFixed(2)}s`);
    if (c.lastLap && c.lastLap.lossZones.length > 0) {
      out.push(`- Worst lap ${c.lastLap.lap}: +${c.lastLap.finalDeltaSec.toFixed(2)}s. Biggest losses:`);
      for (const z of c.lastLap.lossZones) {
        out.push(`  - ${Math.round(z.startPct * 100)}–${Math.round(z.endPct * 100)}% of lap: +${z.secondsLost.toFixed(2)}s`);
      }
    }
  }

  // --- Timeline (counts + key incidents) ---
  if (detail.events.length > 0) {
    const pits = detail.events.filter((e) => e.kind === 'PitEntry').length;
    const incs = detail.events
      .filter((e) => e.kind === 'Incident')
      .reduce((sum, e) => sum + (parseInt(e.detail ?? '1', 10) || 1), 0);
    out.push('', '## Timeline', `- ${pits} pit stop${pits === 1 ? '' : 's'} · ${incs}x incidents`);
    for (const e of detail.events.filter((e) => e.kind === 'Incident')) {
      out.push(`  - L${e.lap ?? '?'}: incident ${e.detail ?? ''}`.trimEnd());
    }
  }
}

function fmtLap(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = (sec - m * 60).toFixed(2);
  return m > 0 ? `${m}:${s.padStart(5, '0')}` : `${s}s`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
