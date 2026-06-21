# 03 - Telemetry Data Catalog and Discovery Plan

## Key premise

iRacing telemetry availability is dynamic. The agent should not hard-code one universal list and assume every field exists. It should inspect available variables at runtime, publish a capability map, and gracefully degrade widgets when a field is unavailable.

## Data source layers

### 1. High-frequency telemetry stream

Used for driver inputs, vehicle state, per-car arrays, fuel, lap state, flags, and real-time values.

### 2. SessionInfo YAML

Used for slower-changing structured session metadata such as WeekendInfo, DriverInfo, SessionInfo, QualifyResultsInfo, SplitTimeInfo, CameraInfo, and RadioInfo.

### 3. Derived dashboard state

Produced by this application from raw telemetry/session data.

Examples:

- Fuel burn per clean lap
- Fuel-to-finish
- Gap ahead/behind
- Pit-entry and pit-exit events
- Stint pace
- Traffic forecast
- Race event timeline

## Minimum MVP telemetry variables

The MVP should attempt to read these live variables first. Widgets must tolerate null/missing values.

| Category | Variables | Use |
| --- | --- | --- |
| Connection/state | `IsOnTrack`, `IsOnTrackCar`, `IsInGarage`, `IsReplayPlaying`, `SessionTime`, `SessionTimeRemain`, `SessionNum`, `SessionState` | App state, session clock, stale state detection. |
| Player inputs | `Throttle`, `Brake`, `Clutch`, `SteeringWheelAngle`, `Gear`, `RPM`, `Speed` | Driver input and car card. |
| Lap state | `Lap`, `LapCompleted`, `LapDist`, `LapDistPct`, `LapCurrentLapTime`, `LapLastLapTime`, `LapBestLapTime` | Timing, progress, lap events. |
| Delta | `LapDeltaToBestLap`, `LapDeltaToOptimalLap`, `LapDeltaToSessionBestLap`, related `_OK` fields | Driver/second-monitor delta widgets. |
| Fuel | `FuelLevel`, `FuelLevelPct`, `FuelUsePerHour` | Fuel widget and strategy calculations. |
| Environment | `AirTemp`, `TrackTemp`, `AirPressure`, `AirDensity`, `RelativeHumidity`, `WindVel`, `WindDir`, `FogLevel`, rain-related fields when available | Weather and trend widgets. |
| Flags/incidents | `SessionFlags`, `PlayerCarTeamIncidentCount`, `PlayerCarDriverIncidentCount`, `PlayerCarMyIncidentCount` | Race control and incident timeline. |
| Player car health | `WaterTemp`, `OilTemp`, `OilPress`, `FuelPress`, `EngineWarnings`, voltage-related fields where available | Car health widget. |
| Pit state | `OnPitRoad`, `PlayerCarInPitStall`, `PitRepairLeft`, `PitOptRepairLeft`, `FastRepairAvailable`, `FastRepairUsed` | Pit status and timeline. |
| Per-car arrays | `CarIdxPosition`, `CarIdxClassPosition`, `CarIdxLap`, `CarIdxLapCompleted`, `CarIdxLapDistPct`, `CarIdxLastLapTime`, `CarIdxBestLapTime`, `CarIdxOnPitRoad`, `CarIdxTrackSurface`, `CarIdxClass`, `CarIdxEstTime`, `CarIdxF2Time`, `CarIdxSessionFlags` | Relative, leaderboard, track map, traffic. |
| Radar/nearby | `CarLeftRight`, `CarDistAhead`, `CarDistBehind` | Spotter/radar widgets. |
| Driver change/team | `DCDriversSoFar`, `DCLapStatus`, relevant DriverInfo YAML fields | Endurance stint manager. |
| Pit service controls/readback | `dpFuelAddKg`, `dpFuelFill`, `dpFuelAutoFillActive`, `dpFuelAutoFillEnabled`, `dpLFTireChange`, `dpRFTireChange`, `dpLRTireChange`, `dpRRTireChange`, tire pressure fields | Future pit-service panel; keep read-only in MVP. |

## SessionInfo YAML targets

Parse and normalize these sections first:

| YAML section | Use |
| --- | --- |
| `WeekendInfo` | Track name, track ID/config, track length, category, weather type. |
| `DriverInfo` | Driver list, car index mapping, car number, team, class, user IDs, driver names. |
| `SessionInfo` | Session list, current session number/type, session laps/time, results. |
| `SplitTimeInfo` | Sector/split names if available. |
| `QualifyResultsInfo` | Qualifying order when useful. |
| `CameraInfo` | Future broadcast/streaming tools. |
| `RadioInfo` | Future radio/team features. |

## Dynamic discovery requirements

The agent should publish this object on connection and whenever variables change:

```json
{
  "type": "capabilities",
  "schemaVersion": "0.1.0",
  "timestamp": "2026-06-20T21:00:00Z",
  "telemetryTickRate": 60,
  "variables": {
    "Speed": { "available": true, "type": "float", "unit": "m/s" },
    "FuelLevel": { "available": true, "type": "float", "unit": "l" },
    "LFtempCM": { "available": false }
  },
  "sessionInfoSections": ["WeekendInfo", "DriverInfo", "SessionInfo"]
}
```

## Variable handling rules

1. Use nullable values in the normalized model.
2. Include units in docs and conversions.
3. Preserve raw variable names in debug tooling.
4. Do not silently convert without recording source units.
5. Widgets should show unavailable/unsupported states cleanly.
6. Derived calculations must carry confidence/quality metadata.

## Track map limitation and approach

For other cars, begin with lap-distance-based mapping using `CarIdxLapDistPct`, `CarIdxLap`, `CarIdxPosition`, `CarIdxClassPosition`, and pit/track-surface arrays. This enables a useful live order/ribbon map without pretending to know exact car coordinates for every competitor.

Future options:

- Generate approximate track shape from collected player GPS/position data if available in IBT/post-session data.
- Allow community-contributed SVG track maps keyed by track ID/config.
- Map `LapDistPct` to an SVG path for visually accurate dots.

## Telemetry inventory task

Before serious widget work, create a `dump-variables` command:

```text
agent.exe dump-variables --out ./data/variables/watkins-glen-gt3-race.json
```

Output:

- Available variable names
- Type
- Unit
- Description
- Count/array length
- Current sample value
- Session info YAML snapshot
- Car, track, session type, sim version if available

This will become your internal truth source.
