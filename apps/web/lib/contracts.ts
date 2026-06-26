// TypeScript view of the agent <-> dashboard contract (packages/telemetry-contracts).
// Hand-written for now; these will eventually be generated from the JSON Schemas so the agent (C#)
// and web (TS) can't drift. Every field is nullable where the agent may not have the data yet.

export type FuelConfidence = 'Low' | 'Medium' | 'High';
export type FuelStatus = 'Unknown' | 'Safe' | 'Marginal' | 'PitRequired' | 'Critical';

export interface FuelEstimate {
  fuelBurnPerLapLiters: number | null;
  sampleLapCount: number;
  estimatedLapsRemaining: number | null;
  raceLapsToGo: number | null;
  fuelToFinishLiters: number | null;
  fuelDeltaToFinishLiters: number | null;
  fuelToAddAtNextStopLiters: number | null;
  pitWindowOpen: boolean;
  confidence: FuelConfidence;
  status: FuelStatus;
}

/** Tank-aware plan for a race that may span several tanks (StintPlanner). */
export interface StintPlan {
  /** Laps a brimmed tank covers (minus reserve) — the length of a flat-out green stint. */
  maxLapsPerStint: number;
  /** Minimum further fuel stops needed to reach the finish. */
  stopsRemaining: number;
  /** True when the finish is reachable on the fuel currently aboard. */
  canFinishOnCurrentFuel: boolean;
  /** Total litres still to be taken on across all remaining stops (+reserve). */
  fuelToAddTotalLiters: number;
  /** Total litres the rest of the race consumes (+reserve), regardless of stops. */
  totalFuelToFinishLiters: number;
  /** Laps the current fuel load alone will cover. */
  lapsOnCurrentFuel: number;
}

/** One stretch of track where a lap loses time to the reference lap. */
export interface LossZone {
  startPct: number;
  endPct: number;
  secondsLost: number;
}

/** A lap's delta to the reference: final gap, cumulative curve by bin, and worst loss zones. */
export interface LapDelta {
  lap: number;
  finalDeltaSec: number;
  cumulativeDeltaSec: number[];
  lossZones: LossZone[];
}

/** Driving-coach summary: consistency over representative laps + the latest lap's delta. */
export interface CoachingSnapshot {
  referenceLap: number | null;
  lapCount: number;
  bestLapSec: number | null;
  meanLapSec: number | null;
  stdDevSec: number | null;
  spreadSec: number | null;
  lastLap: LapDelta | null;
}

export interface SessionState {
  sessionId: string | null;
  trackName: string | null;
  sessionType: string | null;
  sessionNum: number | null;
  timeRemainingSec: number | null;
  lapsRemaining: number | null;
  flagState: string | null;
}

export interface Car {
  carIdx: number;
  carNumber: string | null;
  driverName: string | null;
  teamName: string | null;
  className: string | null;
  classId: number | null;
  position: number | null;
  classPosition: number | null;
  lap: number | null;
  lapCompleted: number | null;
  lapDistPct: number | null;
  lastLapTimeSec: number | null;
  bestLapTimeSec: number | null;
  /** CarIdxEstTime — estimated time from S/F to the car's current track position. */
  estTimeToCurrentLocationSec: number | null;
  onPitRoad: boolean | null;
  isPlayer: boolean | null;
  // Player-only live inputs (null on other cars).
  speedKph?: number | null;
  gear?: number | null;
  rpm?: number | null;
  fuelLevelLiters?: number | null;
  tires?: TireSet | null;
}

/**
 * Player-car tires. Temps are live surface temps in °C, pressure is hot pressure in kPa, wear is
 * fraction of tread remaining (0..1, 1 = new). left/mid/right are the tread positions as iRacing
 * reports them; the widget maps those to inner/outer based on the car side.
 */
export interface TireCorner {
  tempLeftC?: number | null;
  tempMidC?: number | null;
  tempRightC?: number | null;
  pressureKpa?: number | null;
  wearLeft?: number | null;
  wearMid?: number | null;
  wearRight?: number | null;
}

export interface TireSet {
  lf: TireCorner;
  rf: TireCorner;
  lr: TireCorner;
  rr: TireCorner;
}

/** Back-compat alias: the player is just a Car. */
export type PlayerCar = Car;

export interface SnapshotPayload {
  connection: { iracingConnected: boolean; dataAgeMs: number };
  session: SessionState;
  player: Car;
  cars: Car[];
  strategy: { fuel?: FuelEstimate; stintPlan?: StintPlan | null } | null;
  coaching?: CoachingSnapshot | null;
  events: RaceEvent[];
}

export type RaceEventKind = 'PitEntry' | 'PitExit' | 'Incident';

/** A discrete thing that happened in the session, for the event timeline. */
export interface RaceEvent {
  sessionTimeMs: number;
  lap: number | null;
  kind: RaceEventKind;
  detail: string | null;
}

export interface LiveSnapshot {
  type: 'liveSnapshot';
  sequence: number;
  timestamp: string;
  payload: SnapshotPayload;
}
