# First live boot — preflight checklist

The replay/`.ibt` path is fully tested on Linux. The one thing that can only be proven on the **Windows
sim PC** is the live shared-memory read — and, with it, the per-car `CarIdx*` arrays that light up the
relative / leaderboard / track-map-of-field widgets. This is a one-screen checklist so that boot is a
*confirmation*, not a debugging session.

## Before you boot

1. **.NET 10 SDK installed** on the sim PC (the SVappsLAB source generator needs Roslyn 5.0; .NET 8/9
   silently disable it). The build target stays `net8.0` — only the build SDK must be 10.x.
2. **Repo pulled** and `dotnet build` of `apps/agent` succeeds.
3. **Live config in place.** Copy `apps/agent/agent.config.live.example.json` to
   `apps/agent/agent.config.json` (this filename is gitignored). Key fields:
   - `"mode": "live"` — read live shared memory instead of an `.ibt`.
   - `"recordSession": true` — **also** capture the whole field to `data/recordings/<ts>.ndjson` so you
     can replay this exact race on Linux afterward. This is the payoff: prove live once, analyze forever.

## The boot, in order

1. **Start iRacing and get into a session** (practice/test is fine — even an AI race gives you a full
   field). Get on track so telemetry is flowing.
2. **Start the agent** (`dotnet run` in `apps/agent`). On connect you should see, in the agent log:
   - a `[record] writing session to data/recordings/…` line (recording armed), and
   - a `[diag] SessionInfo … track=… drivers=N playerIdx=…` line (roster parsed), and
   - a `[diag] first frame: CarIdxPosition.Len=… active(>=0)=… …` line.

### The single thing to confirm

On that **`[diag] first frame`** line:

- `CarIdxPosition.Len` should be **64** (iRacing's max grid), and
- `active(>=0)` should be **> 1** — i.e. more than just you. That number is the size of the field the
  agent can actually see.

If `active(>=0)` is `> 1`, **the live multi-car read works.** Everything downstream already consumes it.

3. **Open the dashboard** (`apps/web`, `npm run dev`) pointed at the sim PC's IP:5174 and:
   - The **`/debug`** page → field-coverage map should show `cars[0].*` fields **present**, including
     `cars[0].estTimeToCurrentLocationSec` (the input for accurate relative gaps).
   - The main page → the **Relative** and **Leaderboard** panels should show real opponents, and gaps
     should read in sensible seconds (now sourced from `CarIdxEstTime`, not a track-fraction estimate).

## If it doesn't work

- **`active(>=0)` is `1` (only you):** you're likely solo on track with no other cars — load a session
  with AI or join a multi-car session and re-check.
- **No `[diag] first frame` line at all / never connects:** iRacing isn't exposing telemetry. Confirm
  you're in a session and on track. The SDK reads shared memory only while the sim is running.
- **Connects but arrays are empty:** capture the `data/recordings/*.ndjson` anyway and sync it to Linux —
  the recording lets us debug the exact frames offline without tying up the sim PC.

## After the boot

Whatever happened, the recording (if `active > 1`) is the prize: copy `data/recordings/*.ndjson` to the
Linux box, set `"mode": "recording"` + `"recordingPath"` to that file, and the full field replays into
every widget — repeatable, no sim required.
