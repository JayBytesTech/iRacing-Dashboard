// Client for the agent's driver's-journal HTTP API. The agent serves it over plain HTTP on the same
// host as the live WebSocket; we derive the base URL from the same env var.

import type { CoachingSnapshot, RaceEvent } from '@/lib/contracts';

export interface JournalSession {
  id: string;
  capturedAt: string;
  track: string | null;
  trackConfig: string | null;
  car: string | null;
  sessionType: string | null;
  laps: number;
  cleanLaps: number;
  bestLapSec: number | null;
  stdDevSec: number | null;
  fuelBurnPerLapLiters: number | null;
  stops: number | null;
  pitStops: number | null;
  incidents: number | null;
  source: string | null;
  title: string | null;
  notes: string | null;
  rating: number | null;
  tags: string[];
  displayTitle: string;
}

export interface JournalEdit {
  title?: string | null;
  notes?: string | null;
  rating?: number | null;
  tags?: string[];
}

export const AGENT_HTTP = (process.env.NEXT_PUBLIC_AGENT_URL ?? 'ws://localhost:5174/live')
  .replace(/^ws/, 'http')
  .replace(/\/live$/, '');

export async function listSessions(): Promise<JournalSession[]> {
  const r = await fetch(`${AGENT_HTTP}/journal`);
  if (!r.ok) throw new Error(`journal list failed: ${r.status}`);
  return r.json();
}

export async function saveEntry(id: string, edit: JournalEdit): Promise<JournalSession> {
  const r = await fetch(`${AGENT_HTTP}/journal/${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(edit),
  });
  if (!r.ok) throw new Error(`journal save failed: ${r.status}`);
  return r.json();
}

export async function getSession(id: string): Promise<JournalSession> {
  const r = await fetch(`${AGENT_HTTP}/journal/${encodeURIComponent(id)}`);
  if (!r.ok) throw new Error(`journal get failed: ${r.status}`);
  return r.json();
}

// ---- full session analysis (the detail view) ------------------------------------------------
// Computed once at capture time and stored by the agent; mirrors the C# SessionDetail. Null fields
// are omitted on the wire (agent uses WhenWritingNull), so guard with `!= null` / optional access.

export interface StintSummary {
  stintNo: number;
  fromLap: number;
  toLap: number;
  laps: number;
  cleanLaps: number;
  avgBurnLiters: number | null;
}

export interface FuelDetail {
  burnPerLapMeanLiters: number | null;
  burnPerLapStdevLiters: number | null;
  fastestLapSec: number | null;
  medianLapSec: number | null;
  cleanLaps: number;
  totalLaps: number;
  stints: StintSummary[];
}

export interface LapGapEntry {
  lap: number;
  lapTimeSec: number;
  gapToBestSec: number;
}

/** Bin-aligned throttle & brake (0..1) for the worst lap and the reference lap, to overlay. */
export interface LapInputs {
  referenceLap: number;
  lap: number;
  refThrottle: number[];
  refBrake: number[];
  lapThrottle: number[];
  lapBrake: number[];
}

export interface SessionDetail {
  trackName: string | null;
  trackConfig: string | null;
  car: string | null;
  sessionType: string | null;
  laps: number;
  cleanLaps: number;
  fuel: FuelDetail | null;
  coaching: CoachingSnapshot | null;
  inputs: LapInputs | null;
  lapGaps: LapGapEntry[];
  events: RaceEvent[];
}

/** The stored analysis for a session, or null if none was captured (e.g. an older entry). */
export async function getSessionDetail(id: string): Promise<SessionDetail | null> {
  const r = await fetch(`${AGENT_HTTP}/journal/${encodeURIComponent(id)}/detail`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`journal detail failed: ${r.status}`);
  return r.json();
}
