// Client for the agent's driver's-journal HTTP API. The agent serves it over plain HTTP on the same
// host as the live WebSocket; we derive the base URL from the same env var.

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
