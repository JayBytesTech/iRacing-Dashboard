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
