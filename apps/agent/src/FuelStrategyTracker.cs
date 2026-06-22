using IracingEngineer.Strategy.Fuel;

namespace IracingEngineer.Agent;

/// <summary>
/// Stateful bridge between the live telemetry stream and the pure <see cref="FuelModel"/>. It watches
/// frames, materializes a <see cref="LapRecord"/> each time a lap completes (fuel burned + lap time),
/// and re-runs the estimate. All the actual math lives in the tested strategy package; this class
/// only does the transition detection that needs running state.
/// </summary>
public sealed class FuelStrategyTracker
{
    private readonly FuelOptions _opts;
    private readonly List<LapRecord> _laps = new();

    private int? _lastLapCompleted;
    private double? _fuelAtLapStart;
    private long _lapStartMs;
    private bool _pitDuringLap;
    private double? _currentFuel;

    public FuelStrategyTracker(FuelOptions? opts = null) => _opts = opts ?? new FuelOptions();

    public FuelEstimate Current { get; private set; } = FuelEstimate.Unknown;

    /// <summary>Every completed lap recorded so far. Exposed for offline analysis / diagnostics.</summary>
    public IReadOnlyList<LapRecord> Laps => _laps;

    /// <summary>Feed one telemetry frame. <paramref name="remaining"/> comes from session metadata.</summary>
    public void OnFrame(TelemetryFrame f, RaceRemaining remaining)
    {
        if (f.FuelLevel is { } fuelNow) _currentFuel = fuelNow;
        if (f.OnPitRoad == true) _pitDuringLap = true;

        if (f.LapCompleted is { } completed)
        {
            if (_lastLapCompleted is null)
            {
                StartLap(f); // first observation — begin tracking, don't record a partial lap
            }
            else if (completed > _lastLapCompleted)
            {
                RecordCompletedLap(completed, f);
                StartLap(f);
            }
        }

        if (_currentFuel is { } fuel)
            Current = FuelModel.Estimate(_laps, fuel, remaining, _opts);
    }

    private void RecordCompletedLap(int lap, TelemetryFrame f)
    {
        if (_fuelAtLapStart is { } startFuel && f.FuelLevel is { } endFuel)
        {
            _laps.Add(new LapRecord(lap, FuelUsedLiters: startFuel - endFuel, LapTimeSec: (f.SessionTimeMs - _lapStartMs) / 1000.0)
            {
                UsedPitRoad = _pitDuringLap,
                FuelIncreased = endFuel > startFuel,
            });
        }
    }

    private void StartLap(TelemetryFrame f)
    {
        _lastLapCompleted = f.LapCompleted;
        _fuelAtLapStart = f.FuelLevel;
        _lapStartMs = f.SessionTimeMs;
        _pitDuringLap = f.OnPitRoad == true;
    }
}
