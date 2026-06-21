# 06 - Local Agent Spec

## Purpose

The local agent is the trusted process that talks to iRacing. It reads IRSDK data, normalizes it, computes first-pass derived state, and serves it to the dashboard.

## MVP executable behavior

```text
IracingEngineer.Agent.exe
```

On start:

1. Load config.
2. Start HTTP/WebSocket server.
3. Attempt iRacing connection.
4. Emit status even if iRacing is unavailable.
5. Watch for iRacing connect/disconnect.

## Default ports

```text
HTTP:      5174
WebSocket: 5174/live
Status:    5174/status
```

## Configuration

Example `agent.config.json`:

```json
{
  "server": {
    "host": "0.0.0.0",
    "port": 5174,
    "allowLan": true
  },
  "telemetry": {
    "uiSnapshotHz": 5,
    "highRateTelemetryHz": 30,
    "publishHighRateTelemetry": false,
    "recordSession": true
  },
  "units": {
    "speed": "kph",
    "fuel": "liters",
    "temperature": "celsius"
  },
  "privacy": {
    "maskDriverNames": false,
    "storeRawSessionInfo": false
  }
}
```

## Core modules

### `IracingConnection`

- Connects/disconnects to IRSDK.
- Detects availability.
- Exposes latest raw telemetry read.
- Exposes session info update events.

### `VariableCatalog`

- Reads available telemetry variable definitions.
- Tracks name, type, unit, count, description.
- Publishes capability messages.

### `SessionInfoParser`

- Parses YAML safely.
- Normalizes WeekendInfo, DriverInfo, SessionInfo.
- Keeps raw YAML only when debug mode is enabled.

### `SnapshotBuilder`

- Converts raw SDK variables into normalized `liveSnapshot` payloads.
- Applies unit conversion.
- Handles missing variables.

### `StrategyEngineAdapter`

- Maintains lap history, pit history, event detection, and derived fuel/stint state.
- Should call pure functions from shared strategy package when practical.

### `WebSocketHub`

- Manages dashboard clients.
- Sends hello, capabilities, live snapshots, events, and heartbeats.
- Tracks connected client count.

### `Recorder`

- Writes local session summary, events, laps, pits, and optional downsampled telemetry.

## Agent status endpoint

`GET /status`

```json
{
  "agentVersion": "0.1.0",
  "agentStartedAt": "2026-06-20T21:00:00Z",
  "iracingConnected": true,
  "sessionActive": true,
  "clientsConnected": 2,
  "lastTelemetryAt": "2026-06-20T21:05:00Z",
  "dataAgeMs": 18,
  "recording": true
}
```

## Reliability requirements

- Agent should not crash if YAML parsing fails; publish error and continue telemetry.
- Agent should not crash if a telemetry variable is missing.
- Agent should reconnect when iRacing starts after the agent.
- Agent should continue serving status when iRacing exits.
- WebSocket clients should reconnect without restarting the agent.
- Agent should log enough to troubleshoot: connection, session updates, variable catalog, parse errors, client connections.

## MVP event detection

Detect from state transitions:

| Event | Detection |
| --- | --- |
| Lap completed | `LapCompleted` increases. |
| Pit entry | Player `OnPitRoad` false -> true. |
| Pit exit | Player `OnPitRoad` true -> false. |
| In pit stall | `PlayerCarInPitStall` false -> true. |
| Incident change | Incident count increases. |
| Best lap | `LapBestLapTime` changes or last lap equals new best. |
| Fuel window open | Strategy engine transitions to open. |
| Low fuel | Estimated laps remaining below threshold. |
| Driver change | Driver/team field changes or endurance/team vars indicate transition. |

## Debug commands

```text
agent.exe dump-variables --out ./variables.json
agent.exe dump-session-info --out ./session.yaml
agent.exe replay-log --file ./sample-session.jsonl
```

## Installer expectations later

- Windows installer.
- Optional tray icon.
- Start with Windows toggle.
- Firewall rule helper.
- Open dashboard button.
- Show local/LAN URLs.
