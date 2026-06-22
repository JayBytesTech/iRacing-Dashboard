namespace IracingEngineer.Coaching;

/// <summary>
/// One lap resampled onto a fixed grid of lap-distance bins (0..1 of the track). Every array has the
/// same length (<see cref="BinCount"/>) so laps are directly comparable bin-for-bin regardless of how
/// many raw telemetry frames each lap produced. Speed is the one channel the time-delta math needs;
/// throttle/brake are carried for "why" context (and future coaching). Built by the agent's recorder.
/// </summary>
public sealed record LapTrace(
    int Lap,
    double LapTimeSec,
    IReadOnlyList<double> SpeedMps,
    IReadOnlyList<double> Throttle,
    IReadOnlyList<double> Brake)
{
    public int BinCount => SpeedMps.Count;

    /// <summary>iRacing flagged the lap valid (defaults true so a minimal trace is usable in tests).</summary>
    public bool IsValid { get; init; } = true;
    /// <summary>The car was on pit road during the lap — never a representative reference/coaching lap.</summary>
    public bool UsedPitRoad { get; init; }
}

/// <summary>A contiguous stretch of track where one lap loses time to another.</summary>
public sealed record TimeLossZone(double StartPct, double EndPct, double SecondsLost);

/// <summary>The result of comparing one lap against a reference lap.</summary>
public sealed record LapDelta(
    int Lap,
    int ReferenceLap,
    double FinalDeltaSec,
    IReadOnlyList<double> CumulativeDeltaSec,
    IReadOnlyList<TimeLossZone> TopLossZones);

/// <summary>Lap-time spread across the representative laps + each lap's gap to the driver's best.</summary>
public sealed record ConsistencyReport(
    int LapCount,
    double BestLapSec,
    double MeanLapSec,
    double StdDevSec,
    double SpreadSec,
    IReadOnlyList<LapGap> LapGaps);

/// <summary>One lap's gap to the best representative lap.</summary>
public sealed record LapGap(int Lap, double LapTimeSec, double GapToBestSec);
