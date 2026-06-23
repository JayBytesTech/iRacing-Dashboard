// Stint pace & tyre degradation: lap time over a session, split into stints at pit-road laps. Within a
// stint, a least-squares fit over the *clean* laps gives a degradation rate (sec/lap) — positive means
// the car slowed as the stint wore on. Non-clean laps (incidents, traffic, in/out laps) are kept for the
// plot but excluded from the fit so one spin doesn't read as tyre fall-off. Pure + tested.

export interface PaceLap {
  lap: number;
  lapTimeSec: number;
  usedPitRoad: boolean;
  clean: boolean;
}

export interface StintPace {
  stintNo: number;
  fromLap: number;
  toLap: number;
  laps: PaceLap[];
  /** Least-squares slope of clean-lap time vs lap number, sec/lap. Positive = slowing. Null if <2 clean. */
  degradationSecPerLap: number | null;
  /** Median clean lap time in the stint, or null if none. */
  medianCleanSec: number | null;
}

export interface SessionPace {
  stints: StintPace[];
  /** Lap-time range over clean laps (falls back to all timed laps), for charting. */
  minLapSec: number;
  maxLapSec: number;
  firstLap: number;
  lastLap: number;
  hasData: boolean;
}

export function buildPace(laps: PaceLap[]): SessionPace {
  const valid = laps.filter((l) => l.lapTimeSec > 0).sort((a, b) => a.lap - b.lap);
  if (valid.length === 0) {
    return { stints: [], minLapSec: 0, maxLapSec: 0, firstLap: 0, lastLap: 0, hasData: false };
  }

  // Split into stints: a pit-road lap is the last lap of its stint (the in-lap of a stop).
  const stints: StintPace[] = [];
  let cur: PaceLap[] = [];
  for (const l of valid) {
    cur.push(l);
    if (l.usedPitRoad) {
      stints.push(makeStint(stints.length + 1, cur));
      cur = [];
    }
  }
  if (cur.length) stints.push(makeStint(stints.length + 1, cur));

  const cleanTimes = valid.filter((l) => l.clean).map((l) => l.lapTimeSec);
  const rangeTimes = cleanTimes.length ? cleanTimes : valid.map((l) => l.lapTimeSec);

  return {
    stints,
    minLapSec: Math.min(...rangeTimes),
    maxLapSec: Math.max(...rangeTimes),
    firstLap: valid[0].lap,
    lastLap: valid[valid.length - 1].lap,
    hasData: true,
  };
}

function makeStint(stintNo: number, laps: PaceLap[]): StintPace {
  const clean = laps.filter((l) => l.clean);
  return {
    stintNo,
    fromLap: laps[0].lap,
    toLap: laps[laps.length - 1].lap,
    laps,
    degradationSecPerLap: slope(clean.map((l) => l.lap), clean.map((l) => l.lapTimeSec)),
    medianCleanSec: clean.length ? median(clean.map((l) => l.lapTimeSec)) : null,
  };
}

/** Least-squares slope of y over x. Null if fewer than 2 points or x has no spread. */
export function slope(x: number[], y: number[]): number | null {
  const n = x.length;
  if (n < 2) return null;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - mx) * (y[i] - my);
    den += (x[i] - mx) * (x[i] - mx);
  }
  return den === 0 ? null : num / den;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
