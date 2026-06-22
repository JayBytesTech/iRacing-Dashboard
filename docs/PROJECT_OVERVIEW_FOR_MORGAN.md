# iRacing Engineer Dashboard — Project Overview

*Written for Morgan — co-driver, tester, idea person. Last updated 2026-06-22.*

## The pitch

A live race-engineering dashboard for iRacing, built by us, that runs alongside the sim. Think of it as a crew chief that watches your telemetry in real time and tells you things a real spotter/strategist would: fuel state, when to pit, how your lap compares to your own best, where on track you're losing time, and (soon) what the rest of the field is doing.

It's not a replacement for iRacing's own UI — it's the stuff iRacing *doesn't* give you. Everything runs on Jay's machines (his sim PC + a Linux box), and it's built to eventually be open-source so other sim racers can run it too.

## How it's built (the short version)

Two pieces:
- **The agent** — a small program that runs on the PC that's actually running iRacing. It reads the live telemetry and does the number-crunching (fuel math, lap comparisons, etc.).
- **The dashboard** — a webpage you open in a browser (on the sim PC, a second monitor, a tablet, whatever) that shows the results. It talks to the agent over the local network.

They're separate on purpose: the agent can also replay a recorded `.ibt` file (iRacing's own per-driver telemetry log) without iRacing even running, which is how most of this gets built and tested without burning sim time.

## What it can do right now

**Fuel & stint strategy**
- Tracks your real burn rate per lap and tells you if you're Safe / Marginal / Critical on fuel.
- For multi-stop races, works out a full stint plan: how many laps per tank, how many stops, total fuel to add — tank-aware, so it won't tell you to add more fuel than your tank holds.

**Driving coach**
- Builds a reference lap from your fastest *clean* lap (no offs/incidents).
- Compares every other lap to it and shows where on the track you're gaining or losing time — as a number, a chart, and traced onto the track map in orange.
- Shows consistency stats (best lap, average, how spread out your lap times are).

**Track maps**
- Real track shapes (not just a circle) traced from actual GPS data pulled out of your own laps — Watkins Glen (boot config) and VIR (full course) so far. More tracks = just record a clean lap there and run it through our tool.
- Toggle between the real shape and a simple circle view.

**Multi-car widgets (relative, leaderboard)**
- Built and working, but currently only proven with fake/mock data — see "the one big limitation" below.

**Driver's journal**
- Every session you run automatically gets logged: track, session type, lap count, best lap, fuel used.
- This is the start of a permanent diary of every session you've ever run — searchable later, with room for your own notes per session ("car was loose in T1," "need more front wing," etc.).
- Stored locally in a small database file, never uploaded anywhere, never committed to the code repository (it's your private data).

## The one big limitation right now

iRacing's `.ibt` telemetry file — the thing we use for most development and testing — **only contains your own car's data.** No other cars, no positions, nothing about the field. So all the "what's everyone else doing" stuff (relative panel, leaderboard, track map with the whole field on it) has been built and tested with fake data, but hasn't seen a real race yet.

The fix: while iRacing is actually running, it exposes *live* data for every car on track (that's what the in-game relative/leaderboard widgets use too). We just haven't proven that our agent can read it yet — that requires being at the sim PC during a real session.

**We also just built a workaround that matters a lot:** the agent can now *record* that live multi-car stream into our own file format while you're racing, then that recording can be played back and analyzed later on any computer — not just the sim PC. So once we prove the live read works, every race you run becomes a full-field recording you can pick apart afterward, same as the `.ibt` files now, but with everyone else included.

## What's coming next (in rough priority order)

1. **Prove the live read works on the sim PC.** This is the next real milestone — once it works, the multi-car features (relative, leaderboard, track map with the field) go from "demo" to "actually useful in a race."
2. **Capture a real race recording** once #1 works, and see what the relative/leaderboard panels look like with real opponents.
3. **Event timeline** — a log of things that happened in the session (off-tracks, contact, pit stops) so you can jump back to "what happened on lap 12."
4. **Journal upgrades** — add your own notes to sessions, search/filter past sessions, surface trends over time ("am I getting faster at this track?").
5. **More tracks** — each one just needs one clean lap from a `.ibt` file run through our map tool.

## Open questions for you and Jay to chew on

These are the kind of things where your input as the actual driver matters more than the code does:

- **What do you actually want to see *during* a race** vs. what's more useful to review *after*? (e.g., is the driving-coach delta useful live, or only after the session?)
- **What should the journal capture beyond the basics** — incidents, setup notes, weather, who you raced against?
- **For team/endurance racing** (which is a lot of what we do) — what would actually help a co-driver during a driver swap? Stint history, fuel handoff numbers, "here's what I was struggling with"?
- **Priority of the multi-car stuff** — once live data works, is relative/leaderboard the most valuable thing, or is there something else you'd rather see first (traffic warnings, blue-flag awareness, etc.)?
- **Eventually:** this is meant to be open-source. Any features you'd consider "ours" vs. things that should just be free for everyone — not urgent, but worth thinking about as it grows.

## The big picture / why this exists

Jay's building this as a long-term project — not a weekend hack. The plan is to open-source the core (so any sim racer can run their own copy), and possibly build paid hosted/cloud features on top later (so you don't need your own server, easier setup, maybe shared team features). Nothing monetized yet — right now it's just "make our own racing better," with you as the person actually using it and telling us what's missing or wrong.

If you want to actually run it and poke at it, just say so — it currently needs someone comfortable installing a couple of dev tools, but Jay can walk you through that whenever you're ready to try it live.
