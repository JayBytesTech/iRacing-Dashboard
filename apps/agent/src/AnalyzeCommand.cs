using IracingEngineer.Strategy.Fuel;
using IracingEngineer.TelemetryCore.SessionInfo;

namespace IracingEngineer.Agent;

/// <summary>
/// Offline replay-and-report mode: <c>dotnet run -- analyze [path.ibt]</c>. It drives a real
/// <see cref="IRacingTelemetrySource"/> over an .ibt file to completion (no web server) and runs every
/// frame through the same <see cref="FuelStrategyTracker"/> + <see cref="FuelModel"/> the live agent
/// uses, then prints a fuel / clean-lap / stint validation report. This is the harness for validating
/// the strategy engine against real enduro data and the base for the forward-sim.
/// </summary>
public static class AnalyzeCommand
{
    public static async Task<int> Run(AgentConfig config, string? ibtPathOverride)
    {
        var path = ibtPathOverride ?? config.Telemetry.IbtPath;
        if (string.IsNullOrWhiteSpace(path))
        {
            Console.Error.WriteLine("analyze: no .ibt path. Pass one as an argument or set telemetry.ibtPath in agent.config.json.");
            return 1;
        }
        if (!File.Exists(path))
        {
            Console.Error.WriteLine($"analyze: file not found: {path}");
            return 1;
        }

        // Force ibt mode at max playback speed (process the whole file as fast as possible).
        var runConfig = config with
        {
            Telemetry = config.Telemetry with { Mode = "ibt", IbtPath = path, IbtPlaybackSpeed = 0 },
        };

        var tracker = new FuelStrategyTracker();
        SessionInfoData? session = null;
        long frameCount = 0;
        var lastFrameAt = DateTimeOffset.UtcNow;

        // Quiet source (NullLogger) — we print our own report rather than per-frame SDK logs.
        var source = new IRacingTelemetrySource(runConfig);
        source.SessionInfoReceived += info => session = info;
        source.FrameReceived += f =>
        {
            frameCount++;
            lastFrameAt = DateTimeOffset.UtcNow;
            tracker.OnFrame(f, ResolveRaceRemaining(f, session));
        };

        Console.WriteLine($"analyze: replaying {Path.GetFileName(path)} ({new FileInfo(path).Length / (1024 * 1024)} MB) at max speed…");
        var sw = System.Diagnostics.Stopwatch.StartNew();

        using var cts = new CancellationTokenSource();
        var replay = source.RunAsync(cts.Token);

        // Watchdog: at max speed frames pour in; once they stop for a few wall-clock seconds the file
        // is exhausted. This guards against Monitor not self-completing at EOF.
        while (!replay.IsCompleted)
        {
            await Task.WhenAny(replay, Task.Delay(500));
            if (frameCount > 0 && (DateTimeOffset.UtcNow - lastFrameAt).TotalSeconds > 4)
            {
                cts.Cancel();
                break;
            }
        }
        try { await replay; } catch (OperationCanceledException) { }
        sw.Stop();
        await source.DisposeAsync();

        PrintReport(tracker, session, frameCount, sw.Elapsed);
        return 0;
    }

    // Mirrors Program.ResolveRaceRemaining: SessionInfo says lap-vs-time mode; telemetry is the countdown.
    private static RaceRemaining ResolveRaceRemaining(TelemetryFrame f, SessionInfoData? session)
    {
        var lapLimited = session?.IsLapLimited ?? false;
        if (lapLimited && f.SessionLapsRemaining is { } laps) return new RaceRemaining(LapsRemaining: laps);
        if (f.SessionTimeRemainingSec is { } secs) return new RaceRemaining(TimeRemainingSec: secs);
        if (f.SessionLapsRemaining is { } fallbackLaps) return new RaceRemaining(LapsRemaining: fallbackLaps);
        return new RaceRemaining();
    }

    private static void PrintReport(FuelStrategyTracker tracker, SessionInfoData? session, long frames, TimeSpan wall)
    {
        var laps = tracker.Laps;
        var clean = FuelModel.CleanLaps(laps);

        void Rule() => Console.WriteLine(new string('─', 64));

        Console.WriteLine();
        Rule();
        Console.WriteLine("  SESSION");
        Rule();
        Console.WriteLine($"  Track       : {session?.TrackDisplayName ?? "(unknown)"}");
        Console.WriteLine($"  Lap-limited : {(session is null ? "(unknown)" : session.IsLapLimited.ToString())}");
        Console.WriteLine($"  Drivers     : {session?.Drivers.Count.ToString() ?? "(unknown)"}   playerIdx={session?.PlayerCarIdx?.ToString() ?? "?"}");
        Console.WriteLine($"  Frames      : {frames:N0}   replayed in {wall.TotalSeconds:F1}s wall");

        Console.WriteLine();
        Rule();
        Console.WriteLine("  LAP DETECTION & CLEAN-LAP FILTER");
        Rule();
        Console.WriteLine($"  Laps recorded : {laps.Count}");
        Console.WriteLine($"  Clean laps    : {clean.Count}");
        // Why were non-clean laps excluded? (a lap can trip more than one flag)
        int pit = 0, refuel = 0, badBurn = 0, badTime = 0;
        foreach (var l in laps)
        {
            if (FuelModel.IsCleanLap(l)) continue;
            if (l.UsedPitRoad) pit++;
            if (l.FuelIncreased) refuel++;
            if (l.FuelUsedLiters <= 0) badBurn++;
            if (l.LapTimeSec <= 0) badTime++;
        }
        Console.WriteLine($"  Excluded      : pit={pit}  refuel/fuel-up={refuel}  non-positive-burn={badBurn}  non-positive-time={badTime}");

        if (clean.Count > 0)
        {
            var burns = clean.Select(l => l.FuelUsedLiters).OrderBy(x => x).ToList();
            var times = clean.Select(l => l.LapTimeSec).OrderBy(x => x).ToList();
            var mean = burns.Average();
            var sd = Math.Sqrt(burns.Sum(b => (b - mean) * (b - mean)) / burns.Count);
            Console.WriteLine();
            Rule();
            Console.WriteLine("  BURN (clean laps, litres/lap)");
            Rule();
            Console.WriteLine($"  mean={mean:F3}  median={Median(burns):F3}  min={burns[0]:F3}  max={burns[^1]:F3}");
            Console.WriteLine($"  stdev={sd:F3}  CoV={(mean > 0 ? sd / mean : 0):P1}   (volatile threshold = 4.0%)");
            Console.WriteLine($"  lap time      : median={Median(times):F2}s  fastest={times[0]:F2}s");
        }

        // Stints: a new stint begins after any lap that used pit road (in/out lap of a stop).
        Console.WriteLine();
        Rule();
        Console.WriteLine("  STINTS (split at pit-road laps)");
        Rule();
        var stintStart = 0;
        var stintNo = 0;
        for (var i = 0; i < laps.Count; i++)
        {
            var isLast = i == laps.Count - 1;
            if (laps[i].UsedPitRoad || isLast)
            {
                var segment = laps.Skip(stintStart).Take(i - stintStart + 1).ToList();
                var segClean = segment.Where(FuelModel.IsCleanLap).ToList();
                stintNo++;
                var avg = segClean.Count > 0 ? segClean.Average(l => l.FuelUsedLiters) : 0;
                Console.WriteLine($"  Stint {stintNo,2}: laps {segment[0].Lap}–{segment[^1].Lap}  " +
                                  $"({segment.Count} laps, {segClean.Count} clean)  avg burn {(segClean.Count > 0 ? $"{avg:F3} L" : "—")}");
                stintStart = i + 1;
            }
        }
        if (stintNo == 0) Console.WriteLine("  (no laps)");

        Console.WriteLine();
        Rule();
        Console.WriteLine("  FINAL FUEL ESTIMATE (end of replay)");
        Rule();
        var e = tracker.Current;
        Console.WriteLine($"  status={e.Status}  confidence={e.Confidence}  sampleLaps={e.SampleLapCount}");
        Console.WriteLine($"  burn/lap={Fmt(e.FuelBurnPerLapLiters)} L  lapsAboard={Fmt(e.EstimatedLapsRemaining)}  raceLapsToGo={e.RaceLapsToGo?.ToString() ?? "—"}");
        Console.WriteLine($"  fuelToFinish={Fmt(e.FuelToFinishLiters)} L  delta={Fmt(e.FuelDeltaToFinishLiters)} L  addAtNextStop={Fmt(e.FuelToAddAtNextStopLiters)} L");

        // Tank-aware enduro plan: reframes the (often tank-impossible) single-tank "fuel to finish"
        // into stops + stint length using the car's real usable tank from SessionInfo.
        Console.WriteLine();
        Rule();
        Console.WriteLine("  STINT PLAN (tank-aware)");
        Rule();
        var tank = session?.UsableFuelLiters;
        Console.WriteLine($"  Usable tank : {(tank is { } cap ? $"{cap:F1} L" : "(unknown — no DriverCarFuelMaxLtr)")}" +
                          (session?.FuelTankMaxLiters is { } raw ? $"   (capacity {raw:F0} L × maxFill {(session.MaxFuelPct ?? 1.0):P0})" : ""));
        if (tank is { } usable && e.FuelBurnPerLapLiters is { } burn && e.EstimatedLapsRemaining is { } aboard && e.RaceLapsToGo is { } toGo)
        {
            var fuelNow = aboard * burn; // litres aboard at end of replay, from the estimate
            var plan = StintPlanner.Plan(burn, fuelNow, usable, toGo);
            if (plan is not null)
            {
                Console.WriteLine($"  Stint length      : {plan.MaxLapsPerStint} laps on a brimmed tank");
                Console.WriteLine($"  Laps on cur. fuel : {plan.LapsOnCurrentFuel:F1}");
                Console.WriteLine($"  Stops remaining   : {plan.StopsRemaining}  (can finish on current fuel: {plan.CanFinishOnCurrentFuel})");
                Console.WriteLine($"  Fuel still to add : {plan.FuelToAddTotalLiters:F1} L total across those stops");
                Console.WriteLine($"  Race fuel to end  : {plan.TotalFuelToFinishLiters:F1} L");
            }
        }
        else
        {
            Console.WriteLine("  (need usable tank + burn + laps-to-go to plan)");
        }
        Console.WriteLine();
    }

    private static double Median(IReadOnlyList<double> sorted)
    {
        if (sorted.Count == 0) return 0;
        var mid = sorted.Count / 2;
        return sorted.Count % 2 == 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2.0;
    }

    private static string Fmt(double? v) => v is { } x ? x.ToString("F2") : "—";
}
