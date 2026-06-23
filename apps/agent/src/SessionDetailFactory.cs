using System.Text.Json;
using System.Text.Json.Serialization;
using IracingEngineer.Coaching;
using IracingEngineer.Strategy.Fuel;
using IracingEngineer.TelemetryCore.Events;
using IracingEngineer.TelemetryCore.SessionInfo;

namespace IracingEngineer.Agent;

/// <summary>
/// Builds the full <see cref="SessionDetail"/> for a captured session from the same accumulated trackers
/// the <see cref="SessionRecordFactory"/> summary uses. This is the persisted-at-capture analysis the
/// in-browser detail view renders: fuel/stint retrospective, worst-lap coaching, consistency table, and
/// the event timeline. Pure projection of already-tested cores (FuelModel, CoachingModel, EventDetector).
/// </summary>
public static class SessionDetailFactory
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Converters = { new JsonStringEnumConverter() },
    };

    /// <summary>Serialize a detail blob for storage (lowerCamelCase + enum names, matching the live wire).</summary>
    public static string Serialize(SessionDetail detail) => JsonSerializer.Serialize(detail, JsonOptions);

    public static SessionDetail Build(
        SessionInfoData? session,
        FuelStrategyTracker fuelTracker,
        LapTraceRecorder traceRecorder,
        EventDetector? events)
    {
        var laps = fuelTracker.Laps;
        var clean = FuelModel.CleanLaps(laps);

        var fuel = laps.Count > 0 ? BuildFuel(laps, clean) : null;
        var trackMeters = (session?.TrackLengthKm ?? 0) * 1000.0;
        var coaching = BuildCoaching(traceRecorder.Traces, trackMeters);

        var lapGaps = CoachingModel.Consistency(traceRecorder.Traces)?.LapGaps
            .Select(g => new LapGapEntry(g.Lap, g.LapTimeSec, g.GapToBestSec))
            .ToList() ?? new List<LapGapEntry>();

        string? car = session?.PlayerCarIdx is { } idx && session.DriversByCarIdx.TryGetValue(idx, out var d)
            ? d.CarScreenName
            : null;

        var evs = events?.Events.ToList() ?? new List<RaceEvent>();

        return new SessionDetail(
            TrackName: session?.TrackDisplayName,
            TrackConfig: session?.TrackConfigName,
            Car: car,
            SessionType: session?.SessionType,
            Laps: laps.Count,
            CleanLaps: clean.Count,
            Fuel: fuel,
            Coaching: coaching,
            LapGaps: lapGaps,
            Events: evs);
    }

    private static FuelDetail BuildFuel(IReadOnlyList<LapRecord> laps, IReadOnlyList<LapRecord> clean)
    {
        double? mean = null, stdev = null, fastest = null, median = null;
        if (clean.Count > 0)
        {
            var burns = clean.Select(l => l.FuelUsedLiters).ToList();
            mean = burns.Average();
            stdev = Math.Sqrt(burns.Sum(b => (b - mean.Value) * (b - mean.Value)) / burns.Count);
            var times = clean.Select(l => l.LapTimeSec).OrderBy(x => x).ToList();
            fastest = times[0];
            median = Median(times);
        }
        return new FuelDetail(mean, stdev, fastest, median, clean.Count, laps.Count, BuildStints(laps));
    }

    /// <summary>Split laps into stints at every pit-road lap (the in/out lap of a stop); mirrors analyze.</summary>
    private static List<StintSummary> BuildStints(IReadOnlyList<LapRecord> laps)
    {
        var stints = new List<StintSummary>();
        var stintStart = 0;
        var stintNo = 0;
        for (var i = 0; i < laps.Count; i++)
        {
            var isLast = i == laps.Count - 1;
            if (laps[i].UsedPitRoad || isLast)
            {
                var segment = laps.Skip(stintStart).Take(i - stintStart + 1).ToList();
                if (segment.Count == 0) { stintStart = i + 1; continue; }
                var segClean = segment.Where(FuelModel.IsCleanLap).ToList();
                stintNo++;
                stints.Add(new StintSummary(
                    StintNo: stintNo,
                    FromLap: segment[0].Lap,
                    ToLap: segment[^1].Lap,
                    Laps: segment.Count,
                    CleanLaps: segClean.Count,
                    AvgBurnLiters: segClean.Count > 0 ? segClean.Average(l => l.FuelUsedLiters) : null));
                stintStart = i + 1;
            }
        }
        return stints;
    }

    /// <summary>Coach the *slowest* representative lap against the reference — the most instructive lap to
    /// review after a session ("where did my bad laps go wrong"). Mirrors AnalyzeCommand.PrintCoaching.</summary>
    private static CoachingSnapshot? BuildCoaching(IReadOnlyList<LapTrace> traces, double trackMeters)
    {
        var consistency = CoachingModel.Consistency(traces);
        var reference = CoachingModel.ReferenceLap(traces);
        if (consistency is null || reference is null) return null;

        LapDeltaSnapshot? worstLap = null;
        var representative = traces.Where(CoachingModel.IsRepresentative).ToList();
        if (representative.Count > 0 && trackMeters > 0)
        {
            var worst = representative.OrderByDescending(l => l.LapTimeSec).First();
            if (worst.Lap != reference.Lap)
            {
                var d = CoachingModel.CompareToReference(worst, reference, trackMeters);
                worstLap = new LapDeltaSnapshot(
                    d.Lap, d.FinalDeltaSec, d.CumulativeDeltaSec,
                    d.TopLossZones.Select(z => new LossZoneSnapshot(z.StartPct, z.EndPct, z.SecondsLost)).ToList());
            }
        }

        return new CoachingSnapshot(
            ReferenceLap: reference.Lap,
            LapCount: consistency.LapCount,
            BestLapSec: consistency.BestLapSec,
            MeanLapSec: consistency.MeanLapSec,
            StdDevSec: consistency.StdDevSec,
            SpreadSec: consistency.SpreadSec,
            LastLap: worstLap);
    }

    private static double Median(IReadOnlyList<double> sorted)
    {
        if (sorted.Count == 0) return 0;
        var mid = sorted.Count / 2;
        return sorted.Count % 2 == 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2.0;
    }
}
