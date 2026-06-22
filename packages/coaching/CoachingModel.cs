namespace IracingEngineer.Coaching;

/// <summary>
/// Pure driving-coach analysis over per-lap traces. No state, no I/O. The headline question a coach
/// answers — "where am I losing time, and how consistent am I?" — reduces to two deterministic things:
/// a time-delta-vs-reference curve (from speed integrated over distance) and lap-time spread.
/// </summary>
public static class CoachingModel
{
    /// <summary>Speeds below this (m/s) are floored so a stationary/garbage sample can't blow up 1/v.</summary>
    private const double MinSpeedMps = 1.0;

    /// <summary>A lap is usable as a reference / coaching baseline only if it's valid and not a pit lap.</summary>
    public static bool IsRepresentative(LapTrace lap) => lap is { IsValid: true, UsedPitRoad: false } && lap.LapTimeSec > 0;

    /// <summary>The driver's fastest representative lap — the baseline everything else is measured against.</summary>
    public static LapTrace? ReferenceLap(IEnumerable<LapTrace> laps)
    {
        LapTrace? best = null;
        foreach (var l in laps)
        {
            if (!IsRepresentative(l)) continue;
            if (best is null || l.LapTimeSec < best.LapTimeSec) best = l;
        }
        return best;
    }

    /// <summary>
    /// Time gained/lost by <paramref name="target"/> relative to <paramref name="reference"/> as a
    /// function of track position. Time spent crossing each distance bin ≈ binMeters / speed; the
    /// cumulative difference is the delta curve, and runs where the target is slower become loss zones.
    /// </summary>
    public static LapDelta CompareToReference(LapTrace target, LapTrace reference, double trackLengthMeters, int topZones = 3)
    {
        var bins = Math.Min(target.BinCount, reference.BinCount);
        var binMeters = trackLengthMeters > 0 ? trackLengthMeters / bins : 0;

        var cumulative = new double[bins];
        var perBinLoss = new double[bins];
        var running = 0.0;
        for (var i = 0; i < bins; i++)
        {
            var tTarget = binMeters / Math.Max(target.SpeedMps[i], MinSpeedMps);
            var tRef = binMeters / Math.Max(reference.SpeedMps[i], MinSpeedMps);
            perBinLoss[i] = tTarget - tRef; // +ve => target slower across this bin
            running += perBinLoss[i];
            cumulative[i] = running;
        }

        // Anchor the curve to the real lap-time difference (integration is approximate); distribute the
        // small residual proportionally so the curve ends exactly at FinalDeltaSec.
        var finalDelta = target.LapTimeSec - reference.LapTimeSec;
        if (bins > 0 && Math.Abs(running) > 1e-9)
        {
            var scale = finalDelta / running;
            for (var i = 0; i < bins; i++) { cumulative[i] *= scale; perBinLoss[i] *= scale; }
        }

        return new LapDelta(target.Lap, reference.Lap, Round(finalDelta, 3),
            cumulative.Select(d => Round(d, 3)).ToList(), TopLossZones(perBinLoss, bins, topZones));
    }

    // Group contiguous bins where the target loses time, rank by total loss, return the worst few.
    private static IReadOnlyList<TimeLossZone> TopLossZones(double[] perBinLoss, int bins, int topZones)
    {
        var zones = new List<TimeLossZone>();
        var i = 0;
        while (i < bins)
        {
            if (perBinLoss[i] <= 0) { i++; continue; }
            var start = i;
            var sum = 0.0;
            while (i < bins && perBinLoss[i] > 0) { sum += perBinLoss[i]; i++; }
            zones.Add(new TimeLossZone((double)start / bins, (double)i / bins, Round(sum, 3)));
        }
        return zones.OrderByDescending(z => z.SecondsLost).Take(topZones).ToList();
    }

    /// <summary>Lap-time consistency across the representative laps, plus each lap's gap to the best.</summary>
    public static ConsistencyReport? Consistency(IEnumerable<LapTrace> laps)
    {
        var reps = laps.Where(IsRepresentative).ToList();
        if (reps.Count == 0) return null;

        var times = reps.Select(l => l.LapTimeSec).ToList();
        var best = times.Min();
        var mean = times.Average();
        var variance = times.Sum(t => (t - mean) * (t - mean)) / times.Count;
        var gaps = reps.Select(l => new LapGap(l.Lap, Round(l.LapTimeSec, 3), Round(l.LapTimeSec - best, 3))).ToList();

        return new ConsistencyReport(
            LapCount: reps.Count,
            BestLapSec: Round(best, 3),
            MeanLapSec: Round(mean, 3),
            StdDevSec: Round(Math.Sqrt(variance), 3),
            SpreadSec: Round(times.Max() - best, 3),
            LapGaps: gaps);
    }

    private static double Round(double v, int digits) => Math.Round(v, digits);
}
