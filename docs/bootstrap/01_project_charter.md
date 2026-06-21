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
