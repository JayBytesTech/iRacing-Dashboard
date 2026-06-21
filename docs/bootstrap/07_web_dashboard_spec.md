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
