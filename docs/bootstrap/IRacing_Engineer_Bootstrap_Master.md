# iRacing Engineer Dashboard Bootstrap Documents

Generated: 2026-06-20


---

# 01 - Project Charter

## Product name

Working name: **iRacing Engineer Dashboard**  
Product framing: **Mission Control for iRacing teams**

## One-line vision

Create a configurable, local-first race engineering dashboard that turns iRacing live telemetry and session data into actionable information for endurance teams, spotters, streamers, and solo drivers.

## Problem statement

iRacing provides rich telemetry and session data, but during a race most drivers and spotters rely on scattered tools: black boxes, crew-chief audio, timing overlays, fuel calculators, Discord notes, and manual stint tracking. Endurance teams especially need one reliable place to watch the car, strategy, traffic, driver swaps, fuel, events, and race context.

## Target users

### Primary

1. **Endurance team crew chief**
   - Needs live fuel, pit window, driver stint timing, position, class gaps, traffic, and event history.
2. **Spotter/friend watching a teammate**
   - Needs relative, track position, nearby cars, incidents, flags, and simple car health.
3. **Driver with a second monitor/tablet**
   - Needs lightweight glanceable status: fuel, relative, gap, lap delta, car health, stint target.

### Secondary

1. **Streamer/broadcaster**
   - Needs clean overlay widgets, leaderboard, track map, battle tracker, car status.
2. **League admin/team manager**
   - Needs post-race session review, incident timeline, stint consistency, driver comparison.
3. **Open-source contributor**
   - Needs clear plugin/widget architecture and documented data contracts.

## Product principles

1. **Local-first reliability**
   - Race-critical views must work on the LAN without requiring cloud connectivity.
2. **Raw data is not enough**
   - The product should explain what matters: fuel window, rejoin risk, car closing, stint pace drop, pit-road events.
3. **Configurable, not chaotic**
   - Users can customize layouts, but MVP should ship with excellent default dashboards.
4. **Dynamic telemetry handling**
   - Available iRacing variables differ by context; the agent must detect and report capabilities.
5. **Endurance-first, sprint-usable**
   - Build around endurance needs, but keep fast sprint layouts simple and useful.
6. **No cheating, no automation abuse**
   - Do not attempt to expose hidden competitor data or automate unfair in-car control. Stay within normal SDK usage patterns.

## Goals

### MVP goals

- Run a local telemetry agent on the iRacing PC.
- View a live dashboard from the same PC or another LAN device.
- Show connection state, session state, car status, fuel, relative, basic leaderboard, and event timeline.
- Calculate fuel burn/lap, laps remaining, fuel-to-finish, and pit-window status.
- Log simple race events: lap completed, pit entry, pit exit, incident count change, driver change detected where possible.

### V1 goals

- Support saved dashboards and configurable widgets.
- Support endurance driver/stint manager.
- Support post-race review from locally stored sessions.
- Add a more useful track map and battle tracker.
- Add mobile/tablet crew-chief view.

### Future goals

- Team workspaces and cloud relay.
- OBS/broadcast widgets.
- Discord alerts.
- Plugin/widget ecosystem.
- Optional open-source self-hosted edition.

## Non-goals for MVP

- Full cloud SaaS.
- Payments/subscriptions.
- AI engineer layer.
- Perfect track maps for every track.
- Full raw telemetry analytics like Garage61/Motec.
- Setup analysis.
- Voice recognition.
- Automatic pit command manipulation beyond safe, explicit user-initiated controls.

## Success metrics

### Practical race metrics

- Dashboard remains connected for a full 2-hour race without manual restart.
- LAN viewer can refresh and reconnect without interrupting the agent.
- Fuel-to-finish estimate is within one lap after enough clean laps are sampled.
- Event timeline captures pit entry/exit and lap completion accurately.
- Spotter can identify nearby class traffic faster than using only the in-sim black box.

### Product metrics

- Your team voluntarily uses it during every endurance race after testing.
- First-time setup takes under 10 minutes for a technically comfortable sim racer.
- A new widget can be added without rewriting core transport/contracts.
- The project can run in local-only mode indefinitely.

---

# 02 - Product Requirements: MVP

## MVP statement

The MVP is a local-first live race dashboard that reads iRacing telemetry from the sim PC and displays a useful endurance-focused dashboard on the same PC or any LAN device.

## MVP user promise

> During a race, I can open one dashboard and immediately understand car status, fuel strategy, position, relative traffic, and important race events.

## MVP personas and use cases

### Crew chief / strategist

- Watch fuel window and fuel-to-finish.
- Watch gaps and class position.
- See whether the car is on track, in pits, or off track.
- Track pit entry/exit and stint progress.
- Record useful events without manually writing everything down.

### Spotter

- Watch nearby cars and gap changes.
- See cars on pit road.
- Identify class traffic.
- Keep an eye on incident changes and flags.

### Driver with second monitor

- Use a compact dashboard showing fuel, relative, lap delta, engine health, and next pit target.
- Avoid hunting through black boxes for critical values.

## MVP dashboard pages

### `/live`

Primary race dashboard.

Required sections:

- Connection banner
- Session header
- Player car card
- Fuel widget
- Relative widget
- Leaderboard widget
- Event timeline
- Basic track map

### `/settings`

Local configuration page.

Required settings:

- Agent URL
- Units: metric/imperial display
- Telemetry update rate for UI
- Dashboard layout preset
- Data recording enabled/disabled
- Team/car nickname

### `/review`

Very simple post-session view.

Required sections:

- Session summary
- Lap list
- Pit stops
- Event timeline
- Fuel burn chart/table

## MVP widgets

### 1. Connection status

Displays:

- Agent connected/disconnected
- iRacing connected/disconnected
- Live/replay/garage state
- Last packet time
- Data age warning

Acceptance criteria:

- If dashboard loses the agent, status turns red within 2 seconds.
- If iRacing is not running, the page clearly says so.
- If data is stale, widgets do not pretend values are live.

### 2. Session header

Displays:

- Track name
- Session type
- Session time remaining
- Laps remaining where applicable
- Weather summary
- Flag state where available
- Your car number/name/team

### 3. Player car card

Displays:

- Speed
- Gear
- RPM
- Lap
- Lap distance percent
- Last lap
- Best lap
- Current lap estimate
- Position and class position
- On track / pit road / garage state

### 4. Fuel widget

Displays:

- Fuel level
- Fuel level percent
- Fuel used per lap
- Estimated laps remaining
- Fuel-to-finish estimate
- Pit window open/closed
- Fuel risk state: safe, marginal, critical

Acceptance criteria:

- Fuel burn ignores out-laps, in-laps, pit laps, and obvious invalid laps by default.
- User can choose average based on last 3/5/10 clean laps.
- Widget explains when estimate confidence is low.

### 5. Relative widget

Displays:

- Cars around the player sorted by track-relative order
- Car number/name
- Class
- Lap delta / gap estimate
- On pit road status
- Track surface status where available

Acceptance criteria:

- Handles lap wrap-around.
- Highlights cars one lap ahead/behind differently.
- Highlights same-class cars.

### 6. Leaderboard widget

Displays:

- Overall position
- Class position
- Driver/team name
- Last lap
- Best lap
- On pit road
- Laps completed

### 7. Event timeline

Auto-records:

- Session start/update
- Lap completed
- Best lap
- Pit entry
- Pit exit
- Incident count change
- Driver change detected where possible
- Fuel window opened
- Low fuel warning

Manual entries:

- Add note
- Mark traffic issue
- Mark damage
- Mark strategy call

### 8. Track map v0

Displays:

- Simplified loop/ribbon using lap distance percent.
- Player car highlighted.
- Overall leader/class leader highlighted.
- Cars color-coded by class.
- Pit-road cars visually marked.

Acceptance criteria:

- It is acceptable for v0 to be topological rather than geographically accurate.
- It must help understand car order and track spread.

## V1 requirements after MVP

- Drag/drop and resize widgets.
- Saved layouts.
- Driver/stint manager.
- Pit rejoin estimator.
- Battle tracker.
- Better mobile layout.
- Race history storage.
- Export session summary to CSV/JSON.
- OBS/browser-source-friendly widgets.

## MVP release checklist

- Agent installer or simple executable build available.
- Dashboard can connect from another LAN device.
- At least one complete race test performed.
- Stale/disconnected states tested.
- Basic docs written for setup and troubleshooting.
- All derived calculations are visibly labeled as estimates.

---

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

---

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

---

# 05 - Technical Architecture

## Recommended architecture

Start with a **local-first agent + web dashboard**.

```text
iRacing Simulator
  ↓ shared memory / IRSDK
Local Agent (.NET)
  ↓ WebSocket + HTTP
Web Dashboard (Next.js)
  ↓ optional local storage / SQLite
Session history and review
```

Later:

```text
Local Agent
  ↓ encrypted relay / team link
Cloud Relay/API
  ↓
Remote crew chief, mobile viewers, OBS overlays, race history
```

## Why local-first

- Works even if internet/cloud fails.
- Lowest latency.
- Easier for private team use.
- Avoids account/auth complexity in MVP.
- Preserves a clean path to self-hosted/open-source community use.

## Repo structure

```text
iracing-engineer-dashboard/
  apps/
    agent/                  # .NET local IRSDK agent
    web/                    # Next.js dashboard
    desktop-shell/          # optional future wrapper
  packages/
    telemetry-contracts/    # shared JSON schemas / generated TS types
    strategy-engine/        # fuel, stint, pit, relative calculations
    ui-widgets/             # reusable dashboard widgets
  docs/
    product/
    architecture/
    telemetry/
    operations/
  scripts/
    dump-variables/
    generate-types/
  data/
    sample-sessions/
    track-maps/
```

## Agent responsibilities

- Detect iRacing availability.
- Read telemetry variables and SessionInfo YAML.
- Dynamically discover available variables.
- Normalize core data into stable contracts.
- Downsample high-frequency telemetry for UI.
- Emit events and strategy derived state.
- Optionally record local session history.
- Host local WebSocket and HTTP status endpoints.

## Web dashboard responsibilities

- Connect to agent.
- Display connection/session state.
- Render widgets and layouts.
- Persist user layouts/settings locally.
- Show derived strategy with confidence states.
- Degrade gracefully when variables are unavailable.

## Storage strategy

### MVP

Use local filesystem + SQLite.

Store:

- Session metadata
- Lap records
- Pit events
- Race events
- Downsampled telemetry for charts
- Dashboard layouts

Avoid storing:

- Every 60 Hz sample forever by default
- Sensitive user identifiers unless needed
- Raw SessionInfo forever unless user enables debug recording

### V1

Add PostgreSQL only if cloud/team history is introduced.

## Sampling model

| Stream | Rate | Purpose |
| --- | ---: | --- |
| Raw IRSDK read | 60 Hz if available | Internal latest state. |
| UI live snapshot | 4-10 Hz | Dashboard widgets. |
| High-rate trace | 30-60 Hz optional | Pedal/steering traces and charts. |
| Event stream | Event-driven | Timeline. |
| SessionInfo parse | On update only | Metadata and driver list. |

## Derived calculations location

Prefer a shared `strategy-engine` package with deterministic pure functions.

Input:

- Normalized snapshots
- Lap history
- Session metadata

Output:

- Strategy state
- Event candidates
- Alert candidates
- Confidence values

This makes calculations testable without iRacing running.

## Future cloud architecture

Cloud should be a relay and history layer, not required for local use.

Cloud features:

- Team workspaces
- Remote crew links
- Race history sync
- OBS widget URLs
- Discord webhook integration
- Account/user management

Cloud concerns:

- Authentication
- Team permissions
- Rate limits
- Data retention
- Privacy around names/user IDs
- Service reliability during official events

## Technology decisions

### Agent

Recommended: C#/.NET 8+

Rationale:

- Strong Windows packaging.
- Mature iRacing SDK library options.
- Good WebSocket/HTTP hosting.
- Easier installer/service/tray app later.

### Frontend

Recommended: Next.js + TypeScript.

Rationale:

- Fast UI development.
- Easy local app and future hosted app reuse.
- Good component ecosystem.
- Browser-source-friendly for OBS later.

### Local database

Recommended: SQLite.

Rationale:

- Simple local persistence.
- No user setup.
- Good enough for event/lap/session history.

## Failure modes to design for

- iRacing not running.
- iRacing running but memory telemetry disabled.
- User in replay, not live car.
- Dashboard opened before agent.
- Agent restarted mid-race.
- SessionInfo YAML update causes parse error.
- Variables missing for a car/session.
- Race PC changes IP address.
- LAN firewall blocks dashboard access.
- Browser sleeps on tablet.

---

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

---

# 07 - Web Dashboard Spec

## Frontend stack

Recommended:

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand or Jotai for live state
- Recharts or lightweight-charts
- react-grid-layout after MVP

## App routes

| Route | Purpose |
| --- | --- |
| `/` | Redirect to `/live` or setup page. |
| `/live` | Main live dashboard. |
| `/layouts` | Manage saved layouts. |
| `/review` | Post-session review. |
| `/settings` | Agent URL, units, display preferences. |
| `/debug` | Capability map, raw payload viewer, connection logs. |

## UI states

Every widget must support:

- Loading
- Live
- Stale data
- Missing/unsupported variable
- Disconnected agent
- iRacing not running
- Replay mode

## Default layouts

### Endurance crew chief

Top row:

- Session header
- Position/class position
- Fuel window
- Stint timer

Main area:

- Track map
- Relative
- Leaderboard

Right rail:

- Fuel strategy
- Pit status
- Driver/stint manager

Bottom:

- Event timeline
- Notes

### Spotter

Top row:

- Session header
- Flag/incident state

Main area:

- Relative
- Track map
- Nearby cars/radar

Right rail:

- Leaderboard
- Battle tracker later

### Driver second monitor

Large, glanceable widgets:

- Fuel status
- Relative top/bottom 5
- Gap ahead/behind
- Lap delta
- Engine warnings
- Pit target

### Sprint compact

- Relative
- Fuel remaining
- Track map
- Leaderboard
- Incident/flags

## Widget design rules

1. Use large numbers for race-critical values.
2. Show confidence for estimates.
3. Always label units.
4. Avoid tiny dense tables for second-monitor usage.
5. Highlight same-class cars.
6. Highlight cars on pit road.
7. Use stale-data visuals aggressively.
8. Prefer configurable thresholds.

## MVP components

### ConnectionBanner

Inputs:

- `connection.iracingConnected`
- `connection.dataAgeMs`
- agent heartbeat

Behavior:

- Green/live when fresh.
- Yellow/stale above 1000 ms.
- Red/disconnected above 3000 ms.

### SessionHeader

Inputs:

- session metadata
- weather summary
- flags

### PlayerCarCard

Inputs:

- player model

Fields:

- speed, gear, RPM
- lap, last/best/current
- fuel level
- position/class position
- track status

### FuelWidget

Inputs:

- strategy.fuel
- player.fuelLevelLiters
- session remaining

States:

- Not enough laps sampled
- Safe
- Marginal
- Critical
- Pit required

### RelativeWidget

Inputs:

- player
- cars
- session/track length

Features:

- Sort cars by relative distance from player.
- Show ahead/behind sections.
- Show class and pit state.

### LeaderboardWidget

Inputs:

- cars

Features:

- Overall/class toggle.
- Compact and expanded modes.

### TrackMapWidget v0

Inputs:

- cars[].lapDistPct
- cars[].className
- cars[].onPitRoad

Rendering:

- MVP: circular or ribbon visualization.
- Future: SVG track maps.

### EventTimeline

Inputs:

- event stream

Features:

- Auto events.
- Manual note entry.
- Filters by severity/type.

## Settings

- Agent URL
- Units
- Theme
- Refresh rate
- Layout preset
- Same-class highlighting
- Fuel calculation lap window
- Low fuel threshold
- Recording enabled

## Debug page

The debug page is important for a project like this.

Show:

- Last raw `liveSnapshot`
- Capability map
- Missing variables by widget
- Agent version
- Connected clients
- Last SessionInfo update
- Event log

## Accessibility / usability

- High contrast mode later.
- Keyboard accessible layouts.
- Large text mode for second monitor.
- Avoid relying only on color for critical warnings.

---

# 08 - Strategy Engine Spec

## Purpose

The strategy engine turns raw telemetry and session state into race-useful intelligence.

It should answer:

- How much fuel do we have?
- How long can we stay out?
- Can we finish?
- Is the pit window open?
- Who are we racing?
- Are we losing pace?
- What important events just happened?

## Design principles

1. Keep calculations deterministic and testable.
2. Separate calculation from display.
3. Record confidence and sample quality.
4. Avoid pretending estimates are facts.
5. Mark laps as clean/dirty/invalid before using them.

## Fuel model

### Inputs

- Fuel level
- Lap completed
- Lap time
- Pit status
- Session remaining time/laps
- Track length/session type

### Clean lap filter

Exclude laps where:

- Pit road was used.
- Lap time is invalid or missing.
- Lap is out-lap/in-lap.
- Incident/off-track or reset was detected if available.
- Fuel increased during lap.
- Lap was under caution/pace conditions if detectable.

### Outputs

```json
{
  "fuelBurnPerLapLiters": 2.65,
  "sampleLapCount": 5,
  "estimatedLapsRemaining": 15.5,
  "fuelToFinishLiters": 52.0,
  "fuelDeltaToFinishLiters": -10.8,
  "pitWindowOpen": false,
  "confidence": "medium",
  "status": "pitRequired"
}
```

### Confidence rules

| Confidence | Conditions |
| --- | --- |
| Low | Fewer than 3 clean laps or volatile fuel burn. |
| Medium | 3-5 clean laps and stable burn. |
| High | 6+ clean laps and stable burn. |

## Stint model

Track:

- Stint start time/lap
- Current driver
- Laps in stint
- Time in stint
- Driver changes
- Pit stops
- Fuel burn during stint
- Average lap time

Future endurance features:

- Driver minimum/maximum drive time rules by event.
- Required driver count.
- Driver rotation plan.
- Driver time remaining.

## Pit model

Detect:

- Pit entry
- Pit stall arrival
- Pit service start/end where possible
- Pit exit
- Pit lane duration
- Stationary time
- Total stop loss estimate

Outputs:

- Last pit lap
- Last pit duration
- Average pit loss
- Projected next pit lap
- Fuel window state

## Relative/gap model

### Input options

- `CarIdxLapDistPct`
- `CarIdxLap`
- `CarIdxLapCompleted`
- `CarIdxEstTime`
- `CarIdxPosition`
- `CarIdxClassPosition`
- last/best lap times

### MVP approach

1. Compute each car's normalized race distance:

```text
raceDistance = lapCompleted + lapDistPct
```

2. Compute relative distance to player with wrap-around handling.
3. Sort cars ahead/behind.
4. Use estimated time fields where available for timing gaps.
5. Fall back to approximate gap using lap distance and player pace.

## Event detection

Events should be emitted from transitions, not repeated every tick.

Event types:

- `sessionStarted`
- `sessionInfoUpdated`
- `lapCompleted`
- `bestLap`
- `pitEntry`
- `pitStall`
- `pitExit`
- `incidentCountChanged`
- `fuelWindowOpened`
- `fuelCritical`
- `driverChange`
- `manualNote`
- `connectionLost`
- `connectionRestored`

## Alert system v1

Alert examples:

- Fuel window opens in 3 laps.
- Fuel critical: estimated 1.2 laps remaining.
- Same-class car behind is closing by 0.4 sec/lap.
- You will rejoin near heavy traffic if pitting now.
- Stint pace has dropped 0.5 sec/lap over last 5 laps.
- Pit stop was 4 sec slower than average.

## Testing strategy

Build tests from recorded snapshots.

Test cases:

- Fuel burn with clean laps.
- Fuel burn with pit laps excluded.
- Lap wrap-around in relative sorting.
- Pit entry/exit transitions.
- Incident count increases.
- Missing variable fallback.
- Race by laps vs race by time.
- Multi-class relative highlighting.

---

# 09 - Backlog and User Stories

## Epic 1 - Local agent proof-of-life

### Story 1.1: Connect to iRacing

As a developer, I want the agent to detect iRacing and read live telemetry so that the dashboard has a real data source.

Acceptance criteria:

- Agent reports connected/disconnected.
- Agent reads Speed, Gear, RPM, FuelLevel, Lap, LapDistPct.
- Agent does not crash when iRacing is closed.

### Story 1.2: Publish WebSocket snapshots

As a dashboard, I want live snapshots over WebSocket so that widgets can update in real time.

Acceptance criteria:

- WebSocket client receives `hello` and `liveSnapshot` messages.
- Snapshot includes connection, session, player, and cars arrays.
- Snapshot frequency is configurable.

### Story 1.3: Publish capability map

As a widget, I want to know which variables are available so that I can show missing data states correctly.

Acceptance criteria:

- Agent publishes available variable names/types/units.
- Widget can detect unsupported fields.

## Epic 2 - Live dashboard MVP

### Story 2.1: Connection banner

Acceptance criteria:

- Shows agent/iRacing state.
- Shows stale data warning.
- Reconnects after agent restart.

### Story 2.2: Player car card

Acceptance criteria:

- Shows speed, gear, RPM, lap, last lap, best lap, position, class position, fuel.
- Handles missing values.

### Story 2.3: Relative widget

Acceptance criteria:

- Shows cars ahead/behind.
- Highlights same class.
- Shows pit-road state.
- Handles lap wrap-around.

### Story 2.4: Leaderboard widget

Acceptance criteria:

- Shows overall standings.
- Supports class-only toggle.
- Sorts consistently.

### Story 2.5: Fuel widget

Acceptance criteria:

- Shows fuel level, burn per lap, estimated laps remaining.
- Uses clean lap filter.
- Shows confidence.

## Epic 3 - Endurance functionality

### Story 3.1: Event timeline

Acceptance criteria:

- Logs lap completed, pit entry, pit exit, incident count changes.
- Allows manual note entry.
- Events include session time/lap.

### Story 3.2: Stint timer

Acceptance criteria:

- Tracks stint start after pit exit or driver change.
- Shows stint time and stint lap count.

### Story 3.3: Pit window

Acceptance criteria:

- Displays estimated next pit lap.
- Displays fuel-to-finish status.
- Shows safe/marginal/critical state.

## Epic 4 - Track map v0

### Story 4.1: Lap-distance ribbon map

Acceptance criteria:

- Shows all cars on a simple loop/ribbon.
- Highlights player car.
- Color-codes classes.
- Marks pit-road cars.

## Epic 5 - Local review

### Story 5.1: Record session summary

Acceptance criteria:

- Saves session metadata, lap records, pit stops, and events.
- User can open `/review` after session.

### Story 5.2: Review page

Acceptance criteria:

- Shows lap list, events, pit stops, and fuel trend.

## Suggested first four build sprints

### Sprint 1: Data loop

- Agent connects to iRacing.
- WebSocket live snapshots.
- Basic debug web page.
- Variable dump command.

### Sprint 2: First useful dashboard

- Connection banner.
- Player car card.
- Fuel widget.
- Relative widget.
- Leaderboard widget.

### Sprint 3: Endurance MVP

- Event timeline.
- Pit entry/exit detection.
- Fuel-to-finish.
- Stint timer.
- Basic review storage.

### Sprint 4: Usability

- Saved settings.
- Default layouts.
- LAN docs.
- Debug page.
- Track map v0.

## Definition of done for MVP

- Tested in at least one practice session and one race session.
- Handles iRacing not running.
- Handles dashboard refresh/reconnect.
- Handles missing variables.
- Fuel estimates mark confidence.
- Event timeline can be exported.
- Setup instructions are clear enough for a friend to install without you present.

---

# 10 - Open Source and Monetization Plan

## Strategic recommendation

Build private/local-first first. Do not monetize until the tool is genuinely useful for your own endurance races.

Then choose one of three paths:

1. Fully open source.
2. Open core with paid cloud features.
3. Private product with free local version.

## Recommended model if it grows

**Open core + optional hosted services.**

Free/open-source:

- Local agent
- Local dashboard
- Basic widgets
- Local session history
- Community track maps
- Plugin/widget SDK

Paid/hosted optional:

- Cloud relay for remote crew
- Team workspaces
- Cloud session history
- Private sharing links
- OBS overlay hosting
- Discord notifications
- Long-term analytics
- Priority support

## Licensing options

### MIT

Pros:

- Very community friendly.
- Easy adoption.
- Commercial reuse allowed.

Cons:

- Others can commercialize your work without contributing back.

### GPL/AGPL

Pros:

- Stronger open-source reciprocity.
- Better if you want modifications to remain open.

Cons:

- Lower commercial adoption.
- Some contributors/users avoid it.

### Dual license

Pros:

- Community version plus commercial path.

Cons:

- More administrative complexity.

## My recommendation

For your first public version:

- Use **MIT** if your main goal is community adoption.
- Use **AGPL** if your main concern is preventing hosted clones from taking without contributing.
- Keep cloud code separate if you want open core later.

## Contribution model

Add:

- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- Issue templates
- Feature request templates
- Telemetry variable dump contribution guide
- Track map contribution guide
- Widget contribution guide

## Community-friendly features

- Export/import dashboard layouts.
- Community widget marketplace later.
- Community SVG track maps.
- Telemetry capability reports by car/track/session.
- Open JSON contracts.
- Example recorded session file for development without iRacing.

## Monetization ideas

### Hosted team relay

Remote crew chief can join without VPN/Tailscale/LAN.

### Race history cloud

Long-term team analytics and session comparison.

### OBS overlays

Hosted browser-source overlays for streamers.

### Team plan

Private team workspace, layouts, cloud history, driver profiles.

### Supporter tier

For open-source users who want to support development.

## Monetization cautions

- Avoid gating basic local race-critical features too early.
- Avoid anything that feels like pay-to-win.
- Do not collect more personal/race data than needed.
- Make data export/delete easy.
- Keep local-only mode strong.

---

# 11 - Security, Privacy, and Reliability

## Security model for MVP

The MVP runs on a trusted local network.

Assumptions:

- User controls the race PC.
- LAN viewers are trusted friends/devices.
- No internet-exposed port by default.
- No authentication in first private MVP unless cloud/remote sharing is added.

## Risks

| Risk | Mitigation |
| --- | --- |
| Exposing agent to public internet | Bind to LAN only; warn user; no UPnP; document firewall. |
| Untrusted viewer sees names/user IDs | Privacy settings to mask driver names and avoid storing raw IDs. |
| Dashboard shows stale data | Heartbeat and aggressive stale-state UI. |
| Agent crash during race | Defensive parsing, null handling, logging, reconnect loop. |
| SessionInfo YAML parse failure | Keep telemetry loop separate from YAML parser. |
| Cloud relay leak later | Auth, team permissions, TLS, expiring share links. |

## Privacy principles

- Local-first by default.
- Store minimal data.
- Make recording optional.
- Allow deleting session history.
- Avoid storing raw SessionInfo unless debug mode is enabled.
- Mask driver names/user IDs when sharing screenshots or public links.

## Data retention defaults

MVP local defaults:

- Keep session summaries until deleted.
- Keep downsampled telemetry only when recording is enabled.
- Keep raw debug logs for 7 days or size-limited rotation.
- Do not upload anything by default.

## Reliability checklist

Agent:

- Reconnects to iRacing.
- Handles missing variables.
- Handles YAML parse errors.
- Handles multiple dashboard clients.
- Does not block telemetry reads while parsing YAML.
- Logs errors without flooding.

Dashboard:

- Reconnects WebSocket.
- Shows stale data.
- Does not crash on unknown/missing fields.
- Saves layout/settings locally.
- Has a debug page.

Network:

- Clearly displays local dashboard URL.
- Clearly displays LAN dashboard URL.
- Warns if firewall likely blocks access.

## Pre-race checklist

- Agent running.
- iRacing connected.
- Dashboard connected from crew device.
- Correct car/session detected.
- Fuel widget has enough clean-lap samples.
- Event timeline recording enabled.
- Device sleep disabled on crew tablet/laptop.

## During-race recovery checklist

If dashboard freezes:

1. Check stale banner.
2. Refresh browser.
3. Confirm agent status endpoint.
4. Restart agent only if needed.
5. Verify iRacing still connected.
6. Resume recording if disabled.

## Future cloud security checklist

- OAuth or magic-link auth.
- Team roles: owner/admin/member/viewer.
- Expiring share links.
- TLS everywhere.
- Audit log for team access.
- Rate limiting.
- Data export/delete.
- Clear privacy policy.

---

# 12 - Questions for Jay

Answering these will shape the first build sprint and prevent scope creep.

## Product direction

1. What working name do you want: `iRacing Engineer Dashboard`, `Mission Control`, `PitWall`, something else?
2. Is the first goal strictly private use with your friends, or do you want the repo structured publicly from day one?
3. Do you want this to feel more like a race engineer dashboard, a streamer overlay toolkit, or a team management tool first?
4. What are the top three views you personally want during an endurance race?

## Technical direction

5. Are you comfortable starting the agent in C#/.NET, or would you rather prototype in Python first?
6. Do you want the web dashboard to be local-only at first, or accessible remotely through Tailscale/cloud relay quickly?
7. Do you prefer a monorepo with agent + web app together?
8. Do you want Docker involved for the web app/backend, or should MVP be simple native installs?

## Dashboard behavior

9. Should the driver view be safe for an active driver to glance at, meaning very large/simple and minimal distractions?
10. Do you want spotter/team users to be able to add manual notes during a race?
11. Should dashboard layouts be shared across your friend group, or personal per user/device?
12. Which layout should be the default: endurance crew chief, spotter, or driver second monitor?

## Telemetry and data

13. Do you want to record every session by default, or only when a race starts?
14. Do you care about long-term driver analytics, or is live race support the first priority?
15. Should raw telemetry recording be supported, or only downsampled session summaries?
16. Do you want to store real driver names/user IDs locally, or mask by default?

## Endurance/race features

17. Which endurance races are your main targets first: Watkins 6h, Daytona 24, Sebring, Petit Le Mans, Bathurst, NEC, IMSA Endurance?
18. Do you need driver swap legality/minimum-drive-time tracking in MVP, or later?
19. Do you want tire-set tracking and pit-service planning in MVP, or later?
20. Do you want Discord alerts for fuel window/driver swap/pit events?

## Community/monetization

21. If this grows, would you rather open source it, sell a hosted service, or keep it as a private team tool?
22. Would you be okay with an open-core model: local app free/open, hosted relay/history paid?
23. Are OBS overlay widgets important enough to include in v1?
24. Do you want contributors to be able to create custom widgets/plugins?

## Design

25. Do you want the UI style to be motorsport broadcast, engineering dark-mode, or clean SaaS dashboard?
26. Any apps you want visual inspiration from? Examples: Racelab, Garage61, SimHub, Grafana, F1 timing screens, MoTeC, Crew Chief.
27. Should the UI prioritize dark mode only at first?
28. Do you want branding/team colors baked into the initial design?

## MVP decision questions

For the very first usable build, rank these in order:

- Relative
- Fuel-to-finish
- Track map
- Leaderboard
- Event timeline
- Stint timer
- Driver swap manager
- Pit rejoin estimator
- OBS overlay
- Post-race review

---

# 13 - Sources and Reference Notes

These references were used to ground the bootstrap docs. The project should still validate live behavior through its own variable dump command because telemetry availability can vary by car, session, replay/live state, and SDK/library behavior.

| Source | URL | Notes |
| --- | --- | --- |
| pyirsdk README | https://github.com/kutu/pyirsdk | Documents Python IRSDK access to session data, live telemetry, and broadcast messages. |
| pyirsdk vars.txt | https://github.com/kutu/pyirsdk/blob/master/vars.txt | Community-maintained telemetry variable reference with examples such as Speed, FuelLevel, CarIdxLapDistPct, CarIdxPosition, CarIdxOnPitRoad, lap delta fields, inputs, weather, and pit controls. |
| IRSDKSharper GitHub | https://github.com/mherbold/IRSDKSharper | C# implementation exposing telemetry data properties, session info YAML, data header information, and calculated properties. |
| IRSDKSharper NuGet | https://www.nuget.org/packages/IRSDKSharper | Notes memory-based telemetry requires irsdkEnableMem=1 in app.ini and documents current package usage. |
| sajax iRacing SDK YAML docs | https://sajax.github.io/irsdkdocs/yaml/ | Documents the slower-changing YAML session string structures such as WeekendInfo, DriverInfo, SessionInfo, SplitTimeInfo, QualifyResultsInfo, CameraInfo, and RadioInfo. |
| SVappsLAB iRacingTelemetrySDK | https://github.com/SVappsLAB/iRacingTelemetrySDK | Explains that telemetry variable availability varies by context and recommends dumping variable/session info from live sessions. |


## Reference interpretation

- Treat community variable lists as helpful references, not guarantees.
- Always inspect the live variable catalog from the running sim.
- Build widgets around capabilities and graceful degradation.
- Keep SessionInfo YAML parsing separate from high-frequency telemetry reads.
