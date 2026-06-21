# Telemetry agent (C# / .NET 8)

The trusted process that talks to iRacing, normalizes data into the shared contracts, and serves it
to the dashboard over WebSocket. **Production target** — during milestone 0 the Node mock agent
stands in for it.

## Replay-source-first

The agent reads telemetry through `ITelemetrySource`. There is one real implementation,
`IRacingTelemetrySource`, wrapping [`SVappsLAB.iRacingTelemetrySDK`](https://github.com/SVappsLAB/iRacingTelemetrySDK),
selectable by config:

| `telemetry.mode` | Source | Platform |
| --- | --- | --- |
| `"ibt"` | playback of a recorded `.ibt` file | **cross-platform** (dev on Linux) |
| `"live"` | live shared-memory telemetry | **Windows only** |

So you build and test the entire agent on Linux against a recorded `.ibt`, and only switch to
`live` on the Windows sim PC. `IRacingTelemetrySource.RunAsync` is the **single file** to wire when
you first pull to Windows — everything downstream is source-agnostic.

## Build & run

```bash
cp agent.config.example.json agent.config.json     # then set telemetry.ibtPath
dotnet run                                          # serves http://localhost:5174 + ws /live + /status
```

> `.NET 8 SDK` is required and is **not** installed on this box yet:
> `sudo pacman -S dotnet-sdk` (Arch) or see https://dotnet.microsoft.com/download

## Status: skeleton

What's wired: config load, HTTP `/status`, WebSocket `/live`, the snapshot broadcast loop, the
source-agnostic normalizer (`SnapshotBuilder`), and the inactive-car filter.

What's stubbed (marked `TODO(first-windows-pull)`): the actual SVappsLAB SDK calls inside
`IRacingTelemetrySource.RunAsync`, and an `.ibt`-replay path for Linux dev. Until then, use the Node
mock agent to drive the dashboard.

## Next steps

1. Record one real `.ibt` from a session on the Windows PC → drop in `data/sample-sessions/`.
2. Wire `IRacingTelemetrySource` against the SDK (`TelemetryClient` + `Monitor`/`TelemetryHandlers`).
3. Pull the strategy engine (fuel/stint/pit) out into `packages/strategy-engine` as pure functions.
