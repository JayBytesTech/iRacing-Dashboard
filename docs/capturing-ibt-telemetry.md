# Capturing iRacing `.ibt` telemetry (for the dashboard)

A practical guide to recording telemetry files we can feed into the agent's `ibt` replay mode. Do this
on the **Windows sim PC**. The goal is one or two good `.ibt` files that exercise the dashboard:
fuel strategy, session header, relative, leaderboard, and track map.

---

## 1. One-time setup — turn on disk telemetry

iRacing writes a `.ibt` file per session **only when disk logging is enabled**. Pick either path:

### Easy path (manual, no config editing)
- In the sim, press **`Alt + L`** to toggle telemetry logging on. An on-screen "telemetry" indicator
  appears when it's active. The `.ibt` is written when the session ends.
- Just remember to hit `Alt + L` at the start of each stint.

### Set-and-forget path (auto-record every session)
Edit **`Documents\iRacing\app.ini`** (close iRacing first), find the `[Misc]` section, and set:

```ini
irsdkEnableDisk=1      ; enable .ibt disk telemetry
irsdkAutoLogDisk=1     ; auto-start logging whenever you get in the car
irsdkEnableMem=1       ; live shared-memory telemetry (needed later for "live" mode; harmless now)
irsdkLimitFileSize=0   ; don't split a long session into multiple files
```

Save, relaunch iRacing. Now every session records automatically — no `Alt + L` needed.
> `irsdkAutoLogDisk=1` will record *every* session and can fill disk over time; turn it back to `0`
> when you're done collecting samples.

---

## 2. Set up the session so the data is useful

What we capture determines what we can test. Aim for:

- **Add AI opponents.** A solo practice has only your car, so Relative / Leaderboard / Track map will
  be empty. Run an **offline AI session with a field of cars** so the per-car arrays are populated.
- **Multi-class is a bonus.** If you pick an AI roster with two classes (e.g. GTP + GT3), you'll
  exercise the class colors and class standings. Single class is fine too.
- **Run a real stint.** Do **6+ flying green laps** so the fuel model reaches "High" confidence
  (3+ = medium, 6+ = high). Normal pace, nothing weird.
- **Make one pit stop** if you can (in-lap → pit → out-lap). Lets us validate pit detection and the
  out/in-lap fuel filtering later.
- **Burn fuel normally.** Don't use unlimited-fuel / fixed-fuel test setups.

### Capture two sessions if you have time
| Session | Why |
| --- | --- |
| **Practice with AI traffic** | Driver roster + relative/leaderboard/track map; burn rate + laps-of-fuel. |
| **Short AI race (~10 laps)** | A **lap-limited** SessionInfo, so the full **fuel-to-finish / pit-window** path lights up (practice is "unlimited", so fuel-to-finish stays blank). |

A ~10-lap AI race is the single most useful capture — it touches almost every widget.

---

## 3. During the session
- If using the manual path, press **`Alt + L`** once you're on track and confirm the telemetry
  indicator is showing.
- Drive your laps. Optionally make a pit stop.
- **Leave the session normally** (ESC / exit). The `.ibt` is finalized on exit.

---

## 4. Find the file
- Location: **`Documents\iRacing\telemetry\`**
- Name looks like: `carname_trackname_YYYY-MM-DD HH-MM-SS.ibt`
- Grab the most recent one(s). File size scales with session length (a 10–15 min run is plenty).

---

## 5. Get it into the agent

The `.ibt` is on Windows; the dashboard dev box is Linux. Two options:

**A) Test on Linux (recommended for dev):** copy the `.ibt` to the Linux box (USB / network share /
scp / cloud), then:
```bash
cp <file>.ibt ~/Projects/"iRacing Dashboard"/data/sample-sessions/
# edit apps/agent/agent.config.json:
#   "telemetry": { "mode": "ibt", "ibtPath": "../../data/sample-sessions/<file>.ibt" }
cd ~/Projects/"iRacing Dashboard"/apps/agent && dotnet run
# then in another terminal: cd ../web && npm run dev  -> http://localhost:3000  (and /debug)
```
> `.ibt` files are git-ignored on purpose (size + they can contain real driver names / customer IDs),
> so don't commit them — just copy the file across.

**B) Test on Windows:** the repo + .NET 10 SDK can run there too (`winget install Microsoft.DotNet.SDK.10`).
Same config + `dotnet run`. Later, `live` mode (real-time, no file) only works on Windows.

When it runs, open **`/debug`** in the dashboard — the field-coverage map shows exactly which real
variables came through, and whether the SessionInfo parser handled the real YAML.

---

## TL;DR checklist
- [ ] Enable disk telemetry: `Alt + L` in-sim, **or** `irsdkAutoLogDisk=1` in `app.ini`.
- [ ] Offline session **with AI cars** (multi-class if easy).
- [ ] **6+ green laps**, normal fuel, ideally **one pit stop**.
- [ ] Bonus: a **~10-lap AI race** for the lap-limited fuel-to-finish path.
- [ ] Exit normally → grab the newest `.ibt` from `Documents\iRacing\telemetry\`.
- [ ] Copy it over, set `agent.config.json` → `mode: "ibt"` + `ibtPath`, `dotnet run`, watch `/debug`.
