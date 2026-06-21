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
