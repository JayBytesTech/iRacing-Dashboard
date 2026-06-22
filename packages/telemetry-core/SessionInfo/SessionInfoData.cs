namespace IracingEngineer.TelemetryCore.SessionInfo;

/// <summary>
/// Normalized snapshot of the slower-changing iRacing SessionInfo YAML. Produced by
/// <see cref="SessionInfoParser"/>; consumed by the agent to fill the session header, driver roster,
/// and the lap-vs-time race mode. Note: the live *remaining* clock (time/laps left) comes from
/// telemetry, not this — here we capture the static length + whether the race is lap- or time-limited.
/// </summary>
public sealed record SessionInfoData
{
    public string? TrackDisplayName { get; init; }
    public string? TrackConfigName { get; init; }
    public double? TrackLengthKm { get; init; }

    /// <summary>DriverInfo.DriverCarIdx — which car in the field is the local player/team car.</summary>
    public int? PlayerCarIdx { get; init; }

    /// <summary>DriverInfo.DriverCarFuelMaxLtr — physical tank size of the player's car, litres.</summary>
    public double? FuelTankMaxLiters { get; init; }
    /// <summary>DriverInfo.DriverCarMaxFuelPct — max fill fraction (e.g. 0.98 under a fuel-fill rule).</summary>
    public double? MaxFuelPct { get; init; }

    /// <summary>Usable tank = capacity × max-fill rule. Falls back to raw capacity if the pct is absent.</summary>
    public double? UsableFuelLiters =>
        FuelTankMaxLiters is { } cap ? cap * (MaxFuelPct ?? 1.0) : null;

    public int? CurrentSessionNum { get; init; }
    public string? SessionType { get; init; }

    /// <summary>True when the current session ends on a lap count rather than a clock.</summary>
    public bool IsLapLimited { get; init; }
    /// <summary>Total scheduled laps when lap-limited (else null).</summary>
    public int? SessionTotalLaps { get; init; }
    /// <summary>Total scheduled seconds when time-limited (else null).</summary>
    public double? SessionTotalTimeSec { get; init; }

    public IReadOnlyList<SessionDriver> Drivers { get; init; } = Array.Empty<SessionDriver>();

    /// <summary>Driver entries keyed by car index for O(1) lookup while building snapshots.</summary>
    public IReadOnlyDictionary<int, SessionDriver> DriversByCarIdx =>
        _byCarIdx ??= Drivers.GroupBy(d => d.CarIdx).ToDictionary(g => g.Key, g => g.First());
    private Dictionary<int, SessionDriver>? _byCarIdx;
}

/// <summary>One entry from DriverInfo.Drivers.</summary>
public sealed record SessionDriver(
    int CarIdx,
    string? CarNumber,
    string? DriverName,
    string? TeamName,
    string? ClassName,
    int? ClassId,
    bool IsPaceCar);
