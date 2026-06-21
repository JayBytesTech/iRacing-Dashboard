namespace IracingEngineer.Strategy.Fuel;

/// <summary>How much we trust the burn estimate, per docs/bootstrap/08_strategy_engine_spec.md.</summary>
public enum FuelConfidence
{
    /// <summary>Fewer than 3 clean laps, or volatile burn.</summary>
    Low,
    /// <summary>3–5 clean laps with stable burn.</summary>
    Medium,
    /// <summary>6+ clean laps with stable burn.</summary>
    High,
}

/// <summary>Overall fuel situation, worst-applicable wins.</summary>
public enum FuelStatus
{
    /// <summary>Not enough data to judge.</summary>
    Unknown,
    /// <summary>Comfortably enough fuel to finish, with margin.</summary>
    Safe,
    /// <summary>Enough to finish but inside the safety margin — watch it.</summary>
    Marginal,
    /// <summary>Cannot finish on current fuel — a stop for fuel is required.</summary>
    PitRequired,
    /// <summary>About to run dry within the low-fuel lap threshold.</summary>
    Critical,
}

/// <summary>
/// One completed lap's fuel + context. The agent builds these from telemetry transitions; the flags
/// drive the clean-lap filter. All flags default to "clean" so a minimal record is usable in tests.
/// </summary>
public record LapRecord(
    int Lap,
    double FuelUsedLiters,
    double LapTimeSec)
{
    public bool UsedPitRoad { get; init; }
    public bool IsOutLap { get; init; }
    public bool IsInLap { get; init; }
    public bool IsValid { get; init; } = true;
    public bool UnderCaution { get; init; }
    /// <summary>Fuel went up during the lap (refuel / tow / reset) — never a valid burn sample.</summary>
    public bool FuelIncreased { get; init; }
}

/// <summary>How much race is left. Provide laps if known (race-by-laps), else time (race-by-time).</summary>
public record RaceRemaining(int? LapsRemaining = null, double? TimeRemainingSec = null);

/// <summary>Tunable thresholds. Defaults match the dashboard spec's stated behavior.</summary>
public record FuelOptions
{
    /// <summary>Average burn over the last N clean laps (user-selectable 3/5/10).</summary>
    public int BurnWindowLaps { get; init; } = 5;
    /// <summary>Below this many laps of fuel aboard ⇒ Critical.</summary>
    public double LowFuelLapsThreshold { get; init; } = 2.0;
    /// <summary>Laps of headroom required to be considered Safe rather than Marginal.</summary>
    public double SafetyMarginLaps { get; init; } = 1.0;
    /// <summary>Litres to keep as reserve when computing fuel to add.</summary>
    public double ReserveLiters { get; init; } = 0.0;
    /// <summary>Coefficient of variation above which burn is treated as "volatile" (caps confidence).</summary>
    public double VolatileCoefficientOfVariation { get; init; } = 0.04;
}

/// <summary>
/// The fuel strategy output. Nullable numeric fields mean "not enough data yet" — widgets must show
/// that state rather than a fake number (principle: never pretend an estimate is a fact).
/// </summary>
public record FuelEstimate
{
    public double? FuelBurnPerLapLiters { get; init; }
    public int SampleLapCount { get; init; }
    /// <summary>Laps of running left on the fuel currently aboard.</summary>
    public double? EstimatedLapsRemaining { get; init; }
    /// <summary>Laps still to run in the race (given or derived from time ÷ avg lap).</summary>
    public int? RaceLapsToGo { get; init; }
    public double? FuelToFinishLiters { get; init; }
    /// <summary>Fuel aboard minus fuel needed. Negative = short.</summary>
    public double? FuelDeltaToFinishLiters { get; init; }
    /// <summary>The crew-chief number: litres to add at the next stop to reach the finish (+reserve).</summary>
    public double? FuelToAddAtNextStopLiters { get; init; }
    public bool PitWindowOpen { get; init; }
    public FuelConfidence Confidence { get; init; } = FuelConfidence.Low;
    public FuelStatus Status { get; init; } = FuelStatus.Unknown;

    public static readonly FuelEstimate Unknown = new();
}
