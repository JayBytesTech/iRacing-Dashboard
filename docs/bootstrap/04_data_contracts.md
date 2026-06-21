# 04 - Data Contracts

## Contract goals

- Keep the frontend independent of SDK implementation details.
- Make agent messages versioned and explicit.
- Allow missing values without breaking widgets.
- Separate raw telemetry, normalized state, and derived strategy.

## Transport

MVP transport: WebSocket.

Default endpoints:

```text
ws://localhost:5174/live
http://localhost:5174/status
http://localhost:5174/capabilities
```

LAN usage:

```text
ws://<race-pc-ip>:5174/live
```

## Message envelope

Every WebSocket message should use this envelope:

```json
{
  "type": "liveSnapshot",
  "schemaVersion": "0.1.0",
  "sequence": 12041,
  "timestamp": "2026-06-20T21:00:00.000Z",
  "source": "agent",
  "payload": {}
}
```

## Message types

| Type | Frequency | Purpose |
| --- | ---: | --- |
| `hello` | On connect | Agent version, server info, session state. |
| `capabilities` | On connect/update | Variable availability and session-info sections. |
| `liveSnapshot` | 4-10 Hz UI rate | Main dashboard state. |
| `highRateTelemetry` | Optional 30-60 Hz | Input traces, charts, advanced widgets. |
| `raceEvent` | On event | Pit entry, lap complete, incident change, notes. |
| `sessionInfo` | On update | Normalized YAML session metadata. |
| `error` | On error | Recoverable and fatal agent errors. |
| `heartbeat` | 1 Hz | Keepalive and data age. |

## Live snapshot payload

```json
{
  "connection": {
    "iracingConnected": true,
    "isOnTrack": true,
    "isReplayPlaying": false,
    "dataAgeMs": 25
  },
  "session": {
    "sessionId": "local-20260620-210000",
    "trackName": "Watkins Glen International",
    "sessionType": "Race",
    "sessionNum": 2,
    "timeRemainingSec": 7200,
    "lapsRemaining": null,
    "flagState": "green"
  },
  "player": {
    "carIdx": 12,
    "carNumber": "42",
    "driverName": "Driver Name",
    "teamName": "Team Name",
    "className": "GT3",
    "position": 8,
    "classPosition": 4,
    "lap": 27,
    "lapCompleted": 26,
    "lapDistPct": 0.421,
    "speedKph": 162.4,
    "gear": 4,
    "rpm": 7350,
    "throttle": 0.82,
    "brake": 0.0,
    "steeringWheelAngleRad": -0.13,
    "fuelLevelLiters": 41.2,
    "onPitRoad": false,
    "inPitStall": false,
    "trackSurface": "onTrack"
  },
  "cars": [],
  "strategy": {},
  "events": []
}
```

## Car model

```json
{
  "carIdx": 12,
  "carNumber": "42",
  "driverName": "Driver Name",
  "teamName": "Team Name",
  "classId": 1234,
  "className": "GT3",
  "position": 8,
  "classPosition": 4,
  "lap": 27,
  "lapCompleted": 26,
  "lapDistPct": 0.421,
  "lastLapTimeSec": 105.321,
  "bestLapTimeSec": 104.982,
  "estTimeToCurrentLocationSec": 44.12,
  "onPitRoad": false,
  "trackSurface": "onTrack",
  "isPlayer": false,
  "isPaceCar": false
}
```

## Strategy model

```json
{
  "fuel": {
    "fuelLevelLiters": 41.2,
    "fuelBurnPerLapLiters": 2.65,
    "fuelBurnSampleLaps": 5,
    "estimatedLapsRemaining": 15.5,
    "fuelToFinishLiters": 52.0,
    "fuelDeltaToFinishLiters": -10.8,
    "confidence": "medium",
    "status": "pitRequired"
  },
  "stint": {
    "currentDriverName": "Driver Name",
    "stintLapCount": 18,
    "stintTimeSec": 1921,
    "estimatedNextPitLap": 42,
    "driverSwapDue": false
  },
  "pit": {
    "isPitWindowOpen": false,
    "projectedPitLap": 42,
    "lastPitLap": 12,
    "lastPitDurationSec": 46.2
  }
}
```

## Race event model

```json
{
  "eventId": "evt_01J...",
  "timestamp": "2026-06-20T21:00:00.000Z",
  "sessionTimeSec": 4211.42,
  "lap": 27,
  "type": "pitEntry",
  "severity": "info",
  "title": "Pit entry",
  "details": "Car entered pit road on lap 27.",
  "carIdx": 12,
  "source": "derived"
}
```

## Naming rules

- Backend raw variable names may use iRacing original names.
- Normalized frontend fields use lowerCamelCase.
- Units are explicit in field names when ambiguity matters, e.g. `speedKph`, `fuelLevelLiters`, `timeRemainingSec`.
- Raw values can be included in debug payloads but should not be required by widgets.

## Versioning

- Start with `schemaVersion: "0.1.0"`.
- Add fields freely in minor versions.
- Do not rename/remove fields without a major version bump.
- Widgets should ignore unknown fields.
