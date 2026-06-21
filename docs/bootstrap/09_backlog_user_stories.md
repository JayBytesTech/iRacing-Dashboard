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
