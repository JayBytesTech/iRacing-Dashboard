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
cp agent.config.example.json agent.config.json     # then set telemetry.mode + ibtPath
dotnet run                                          # serves http://localhost:5174 + ws /live + /status
```

> **Build toolchain: the .NET 10 SDK is required** (the SVappsLAB 2.0.0 source generator needs
> Roslyn 5.0). The project still *targets* net8.0; only the build SDK must be 10.x. `global.json`
> at the repo root enforces this. Install (no sudo): `curl -fsSL https://dot.net/v1/dotnet-install.sh
> | bash -s -- --channel 10.0 --install-dir "$HOME/.dotnet"`, or see https://dotnet.microsoft.com/download

## Status: SDK wired

`IRacingTelemetrySource` is now a real adapter over `SVappsLAB.iRacingTelemetrySDK` 2.0.0:
`[RequiredTelemetryVars(...)]` generates the typed `TelemetryData`; `Monitor` feeds `OnTelemetryUpdate`
→ `MapFrame` → `TelemetryFrame`, and `OnRawSessionInfoUpdate` → our tested `SessionInfoParser`.

| `telemetry.mode` | Source | Platform |
| --- | --- | --- |
| `"ibt"` | `.ibt` file playback (`telemetry.ibtPath`) | cross-platform (test on Linux) |
| `"live"` | live shared-memory telemetry | Windows only |

**Compiles on Linux; not yet run-verified** — needs a real `.ibt` (replay) or the Windows sim PC (live).

## Next steps

1. Record one real `.ibt` on the Windows PC → drop in `data/sample-sessions/`, set `telemetry.ibtPath`.
2. `dotnet run` in `ibt` mode → point the dashboard at `ws://localhost:5174/live`, watch `/debug`.
3. Validate `SessionInfoParser` against the real SessionInfo YAML; then `live` mode on Windows.
