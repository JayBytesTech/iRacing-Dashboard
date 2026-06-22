import type { JournalSession } from './journal';

// Cross-session trends: the thing a logbook uniquely enables. Group the journal by what you can
// meaningfully compare — the same track layout in the same car — then chart best lap, consistency, and
// incidents over time so you can see whether you're actually improving. Pure + tested; the page only renders.

export interface TrendPoint {
  id: string;
  capturedAt: string;
  bestLapSec: number | null;
  stdDevSec: number | null;
  incidents: number | null;
  cleanLaps: number;
  laps: number;
}

export interface TrackTrend {
  key: string;
  track: string;
  trackConfig: string | null;
  car: string | null;
  /** Chronological, oldest first. */
  points: TrendPoint[];
  sessionCount: number;
  /** Personal best lap across all sessions in this group. */
  bestLapEver: number | null;
  /** Best lap of the most recent session that had one. */
  latestBestLap: number | null;
  /** firstBest - latestBest (positive = faster now). Null unless ≥2 sessions both have a best lap. */
  improvementSec: number | null;
  /** Lowest (best) consistency σ seen. */
  bestConsistencySec: number | null;
  totalIncidents: number;
}

function groupKey(s: JournalSession): string {
  return [s.track, s.trackConfig ?? '', s.car ?? ''].join(' · ');
}

/**
 * Build per-track-and-car trends from journal sessions. Sessions without a track are skipped (nothing to
 * group on). Groups are returned most-active first (most sessions, then most recent), and within a group
 * points are chronological so a series reads left-to-right as time.
 */
export function buildTrends(sessions: JournalSession[]): TrackTrend[] {
  const groups = new Map<string, JournalSession[]>();
  for (const s of sessions) {
    if (!s.track) continue;
    const key = groupKey(s);
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(s);
  }

  const trends: TrackTrend[] = [];
  for (const [key, group] of groups) {
    const ordered = [...group].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
    const points: TrendPoint[] = ordered.map((s) => ({
      id: s.id,
      capturedAt: s.capturedAt,
      bestLapSec: s.bestLapSec,
      stdDevSec: s.stdDevSec,
      incidents: s.incidents,
      cleanLaps: s.cleanLaps,
      laps: s.laps,
    }));

    const bests = points.map((p) => p.bestLapSec).filter((v): v is number => v != null);
    const sigmas = points.map((p) => p.stdDevSec).filter((v): v is number => v != null);
    const firstBest = points.find((p) => p.bestLapSec != null)?.bestLapSec ?? null;
    const latestBest = [...points].reverse().find((p) => p.bestLapSec != null)?.bestLapSec ?? null;
    const improvement =
      bests.length >= 2 && firstBest != null && latestBest != null ? firstBest - latestBest : null;

    const first = ordered[0];
    trends.push({
      key,
      track: first.track!,
      trackConfig: first.trackConfig,
      car: first.car,
      points,
      sessionCount: points.length,
      bestLapEver: bests.length ? Math.min(...bests) : null,
      latestBestLap: latestBest,
      improvementSec: improvement,
      bestConsistencySec: sigmas.length ? Math.min(...sigmas) : null,
      totalIncidents: points.reduce((sum, p) => sum + (p.incidents ?? 0), 0),
    });
  }

  // Most-active groups first; ties broken by most recent session.
  return trends.sort((a, b) => {
    if (b.sessionCount !== a.sessionCount) return b.sessionCount - a.sessionCount;
    const aLast = a.points[a.points.length - 1]?.capturedAt ?? '';
    const bLast = b.points[b.points.length - 1]?.capturedAt ?? '';
    return bLast.localeCompare(aLast);
  });
}
