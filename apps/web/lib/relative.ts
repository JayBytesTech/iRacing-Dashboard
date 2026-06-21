import type { Car } from './contracts';

// Pure relative-position math. Orders the field by track proximity to the player and estimates the
// relative gap in seconds — the core of a "relative" widget. Handles start/finish wrap-around so a
// car just across the line reads as right behind, not a lap away. Kept pure so it's easy to reason
// about and (later) port to the agent for OBS/server-authoritative relatives.

export interface RelativeEntry {
  car: Car;
  /** Signed gap in seconds: positive = ahead of the player on track, negative = behind. */
  gapSeconds: number;
  /** car.lap - player.lap: non-zero means lapped traffic. */
  lapsDiff: number;
}

/** Normalize a lap-fraction delta into (-0.5, 0.5] so the nearest direction around the loop wins. */
function wrapFraction(delta: number): number {
  let x = delta - Math.floor(delta); // -> [0,1)
  if (x > 0.5) x -= 1;
  return x;
}

export function computeRelative(
  player: Car,
  cars: Car[],
  opts?: { count?: number; refLapTimeSec?: number },
): { ahead: RelativeEntry[]; behind: RelativeEntry[] } {
  const count = opts?.count ?? 4;
  const refLap = opts?.refLapTimeSec ?? player.bestLapTimeSec ?? player.lastLapTimeSec ?? 100;
  if (player.lapDistPct == null) return { ahead: [], behind: [] };

  const entries: RelativeEntry[] = [];
  for (const c of cars) {
    if (c.isPlayer || c.lapDistPct == null) continue;
    const frac = wrapFraction(c.lapDistPct - player.lapDistPct);
    entries.push({
      car: c,
      gapSeconds: frac * refLap,
      lapsDiff: (c.lap ?? 0) - (player.lap ?? 0),
    });
  }

  const ahead = entries
    .filter((e) => e.gapSeconds > 0)
    .sort((a, b) => a.gapSeconds - b.gapSeconds) // nearest ahead first
    .slice(0, count);
  const behind = entries
    .filter((e) => e.gapSeconds <= 0)
    .sort((a, b) => b.gapSeconds - a.gapSeconds) // nearest behind first
    .slice(0, count);

  return { ahead, behind };
}
