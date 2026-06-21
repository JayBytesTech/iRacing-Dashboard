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

export interface SessionState {
  sessionId: string | null;
  trackName: string | null;
  sessionType: string | null;
  sessionNum: number | null;
  timeRemainingSec: number | null;
  lapsRemaining: number | null;
  flagState: string | null;
}

export interface PlayerCar {
  carIdx: number;
  carNumber: string | null;
  driverName: string | null;
  className: string | null;
  position: number | null;
  classPosition: number | null;
  lap: number | null;
  lapDistPct: number | null;
  speedKph: number | null;
  gear: number | null;
  rpm: number | null;
  fuelLevelLiters: number | null;
  onPitRoad: boolean | null;
}

export interface SnapshotPayload {
  connection: { iracingConnected: boolean; dataAgeMs: number };
  session: SessionState;
  player: PlayerCar;
  cars: unknown[];
  strategy: { fuel?: FuelEstimate } | null;
  events: unknown[];
}

export interface LiveSnapshot {
  type: 'liveSnapshot';
  sequence: number;
  timestamp: string;
  payload: SnapshotPayload;
}
