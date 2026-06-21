namespace IracingEngineer.Strategy.Fuel;

/// <summary>
/// Pure fuel-strategy calculations. No state, no I/O. Given lap history + current fuel + race
/// remaining, produces a <see cref="FuelEstimate"/>. Every method is deterministic and individually
/// testable. See docs/bootstrap/08_strategy_engine_spec.md for the intended behavior.
/// </summary>
public static class FuelModel
{
    /// <summary>A lap is a valid burn sample only if nothing disqualifies it.</summary>
    public static bool IsCleanLap(LapRecord lap) =>
        lap is { IsValid: true, UsedPitRoad: false, IsOutLap: false, IsInLap: false, UnderCaution: false, FuelIncreased: false }
        && lap.FuelUsedLiters > 0
        && lap.LapTimeSec > 0;

    public static IReadOnlyList<LapRecord> CleanLaps(IEnumerable<LapRecord> laps) =>
        laps.Where(IsCleanLap).ToList();

    /// <summary>Average fuel burn over the most recent <paramref name="window"/> clean laps.</summary>
    public static double? AverageBurnPerLap(IReadOnlyList<LapRecord> cleanLaps, int window)
    {
        if (cleanLaps.Count == 0) return null;
        var sample = TakeLast(cleanLaps, window);
        return sample.Average(l => l.FuelUsedLiters);
    }

    /// <summary>Average lap time over the most recent <paramref name="window"/> clean laps.</summary>
    public static double? AverageLapTimeSec(IReadOnlyList<LapRecord> cleanLaps, int window)
    {
        if (cleanLaps.Count == 0) return null;
        var sample = TakeLast(cleanLaps, window);
        return sample.Average(l => l.LapTimeSec);
    }

    /// <summary>
    /// Confidence from sample size and burn stability (coefficient of variation). Volatility can only
    /// pull confidence down, never up.
    /// </summary>
    public static FuelConfidence ComputeConfidence(IReadOnlyList<LapRecord> cleanLaps, FuelOptions opts)
    {
        // Size tier reflects how much clean data we've collected overall ("6+ clean laps" in the
        // spec). Stability is judged only over the laps actually used for the burn number (the
        // window), and can pull the tier down but never up.
        var total = cleanLaps.Count;
        if (total < 3) return FuelConfidence.Low;
        var bySize = total >= 6 ? FuelConfidence.High : FuelConfidence.Medium;

        var sample = TakeLast(cleanLaps, opts.BurnWindowLaps);
        var mean = sample.Average(l => l.FuelUsedLiters);
        if (mean <= 0) return FuelConfidence.Low;
        var variance = sample.Sum(l => Math.Pow(l.FuelUsedLiters - mean, 2)) / sample.Count;
        var cov = Math.Sqrt(variance) / mean;
        if (cov > opts.VolatileCoefficientOfVariation)
            return bySize == FuelConfidence.High ? FuelConfidence.Medium : FuelConfidence.Low;

        return bySize;
    }

    /// <summary>Full fuel estimate. Returns <see cref="FuelEstimate.Unknown"/> when burn can't be computed.</summary>
    public static FuelEstimate Estimate(
        IReadOnlyList<LapRecord> laps,
        double currentFuelLiters,
        RaceRemaining remaining,
        FuelOptions? options = null)
    {
        var opts = options ?? new FuelOptions();
        var clean = CleanLaps(laps);
        var burn = AverageBurnPerLap(clean, opts.BurnWindowLaps);
        if (burn is not { } burnPerLap || burnPerLap <= 0)
            return FuelEstimate.Unknown with { SampleLapCount = Math.Min(clean.Count, opts.BurnWindowLaps) };

        var sampleCount = Math.Min(clean.Count, opts.BurnWindowLaps);
        var lapsAboard = currentFuelLiters / burnPerLap;
        var confidence = ComputeConfidence(clean, opts);

        var lapsToGo = ResolveLapsToGo(remaining, clean, opts);

        double? fuelToFinish = lapsToGo is { } toGo ? toGo * burnPerLap : null;
        double? delta = fuelToFinish is { } need ? currentFuelLiters - need : null;
        double? toAdd = fuelToFinish is { } need2 ? Math.Max(0, need2 + opts.ReserveLiters - currentFuelLiters) : null;

        var status = ResolveStatus(lapsAboard, lapsToGo, opts);
        // v0 definition: the window is "open" once we cannot reach the finish on current fuel, i.e. a
        // fuel stop is needed before the end. Tank-capacity-aware windows come later.
        var pitWindowOpen = lapsToGo is { } g && lapsAboard < g;

        return new FuelEstimate
        {
            FuelBurnPerLapLiters = Round(burnPerLap, 3),
            SampleLapCount = sampleCount,
            EstimatedLapsRemaining = Round(lapsAboard, 2),
            RaceLapsToGo = lapsToGo,
            FuelToFinishLiters = Round(fuelToFinish, 2),
            FuelDeltaToFinishLiters = Round(delta, 2),
            FuelToAddAtNextStopLiters = Round(toAdd, 2),
            PitWindowOpen = pitWindowOpen,
            Confidence = confidence,
            Status = status,
        };
    }

    /// <summary>Race-by-laps uses the given count; race-by-time converts via average clean lap time.</summary>
    private static int? ResolveLapsToGo(RaceRemaining remaining, IReadOnlyList<LapRecord> clean, FuelOptions opts)
    {
        if (remaining.LapsRemaining is { } laps) return Math.Max(0, laps);
        if (remaining.TimeRemainingSec is { } secs && AverageLapTimeSec(clean, opts.BurnWindowLaps) is { } avgLap && avgLap > 0)
            return (int)Math.Ceiling(Math.Max(0, secs) / avgLap); // a partial lap still has to be completed
        return null;
    }

    private static FuelStatus ResolveStatus(double lapsAboard, int? lapsToGo, FuelOptions opts)
    {
        if (lapsAboard < opts.LowFuelLapsThreshold) return FuelStatus.Critical;
        if (lapsToGo is not { } toGo) return FuelStatus.Unknown;
        var headroom = lapsAboard - toGo;
        if (headroom < 0) return FuelStatus.PitRequired;
        if (headroom < opts.SafetyMarginLaps) return FuelStatus.Marginal;
        return FuelStatus.Safe;
    }

    private static IReadOnlyList<LapRecord> TakeLast(IReadOnlyList<LapRecord> laps, int n) =>
        n >= laps.Count ? laps : laps.Skip(laps.Count - n).ToList();

    private static double? Round(double? v, int digits) => v is { } x ? Math.Round(x, digits) : null;
}
