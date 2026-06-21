# iRacing Engineer Dashboard

> Mission Control for iRacing teams — a local-first race-engineering dashboard that turns live
> iRacing telemetry into actionable fuel, strategy, relative, and event information.

**Status:** pre-MVP walking skeleton. **License:** [AGPL-3.0](LICENSE) (open core; future hosted/cloud
features will live in a separate repo and are not covered by this license).

---

## Why this layout exists (read before adding code)

Two hard constraints shape everything:

1. **iRacing live telemetry is Windows-only.** It is read from Windows shared memory. The **agent** must
   run on the sim PC. The **web dashboard** is just a WebSocket client and runs anywhere (incl. Linux).
2. **We develop primarily on Linux.** So the telemetry input is built **replay-source-first**: the agent
   reads recorded data through the same code path it will later use for live data, letting us build and
   test almost everything without iRacing running.

The chosen C# SDK ([`SVappsLAB.iRacingTelemetrySDK`](https://github.com/SVappsLAB/iRacingTelemetrySDK),
Apache-2.0) supports this directly: **identical API for live telemetry and `.ibt` file playback**, and its
`.ibt` playback path is **cross-platform (Windows/Linux/macOS)**. Live still requires Windows.

## The walking skeleton (what works today)

```
.ibt / .jsonl recording ──► agent ──► WebSocket (liveSnapshot) ──► web dashboard (one live number)
```

The whole point of milestone 0 is to prove that pipe end-to-end **on Linux**, before building widgets.

To prove it right now without .NET or iRacing installed, a dependency-free **mock agent** (Node, no npm
install needed) replays a sample session over the real contract:

```bash
node tools/mock-agent/mock-agent.mjs        # serves ws://localhost:5174/live
node tools/mock-agent/test-client.mjs       # prints decoded liveSnapshot frames
```

Then the web client (real target) connects to the same socket — see `apps/web/README.md`.

## Repo structure

```
apps/
  agent/                 # C#/.NET 8 local telemetry agent (production target; runs on Windows for live)
  web/                   # Next.js + TypeScript dashboard (runs anywhere)
packages/
  telemetry-contracts/   # JSON Schemas = single source of truth for agent <-> web messages
tools/
  mock-agent/            # dependency-free Node replay server — proves the contract on Linux today
docs/
  bootstrap/             # the original design docs (charter, PRD, architecture, specs, backlog)
data/
  sample-sessions/       # committed sample fixtures for replay-driven dev (no real driver PII)
```

## Toolchain

| Part | Needs | Notes |
| --- | --- | --- |
| `apps/web` | Node 18+ | `npm install && npm run dev` |
| `tools/mock-agent` | Node 18+ | zero dependencies, runs as-is |
| `apps/agent` | .NET 8 SDK | builds on Linux; **live** telemetry only works on Windows |

## Roadmap pointer

See [`docs/bootstrap/`](docs/bootstrap/) for the full charter, MVP requirements, and sprint plan.
Milestone order: **(0) prove the pipe → (1) first useful widgets → (2) endurance MVP → (3) usability.**
