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
