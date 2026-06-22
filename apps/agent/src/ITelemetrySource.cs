using IracingEngineer.TelemetryCore.SessionInfo;

namespace IracingEngineer.Agent;

/// <summary>
/// Abstraction over "where telemetry comes from" so the rest of the agent never knows whether it
/// is live or replayed. This is the keystone of replay-source-first development: build and test
/// everything downstream on Linux against a replay source, then drop in the live source on the
/// Windows sim PC with zero changes to the normalizer / hub / strategy engine.
/// </summary>
public interface ITelemetrySource : IAsyncDisposable
{
    /// <summary>Raised on every telemetry tick with a raw, source-agnostic frame.</summary>
    event Action<TelemetryFrame>? FrameReceived;

    /// <summary>Raised when the (slower-changing) SessionInfo YAML updates, already parsed/normalized.</summary>
    event Action<SessionInfoData>? SessionInfoReceived;

    /// <summary>Raised when the underlying connection state changes (connected / disconnected).</summary>
    event Action<bool>? ConnectionChanged;

    Task RunAsync(CancellationToken ct);
}

/// <summary>One telemetry tick, already projected to the fields the normalizer needs.</summary>
public record TelemetryFrame(
    long SessionTimeMs,
    bool IsOnTrack,
    bool IsReplayPlaying,
    double? Speed,
    int? Gear,
    double? Rpm,
    double? Throttle,
    double? Brake,
    double? Lat,
    double? Lon,
    double? FuelLevel,
    int? Lap,
    int? LapCompleted,
    double? LapDistPct,
    bool? OnPitRoad,
    // Live race-remaining (counts down) — these come from telemetry vars, not SessionInfo YAML.
    int? SessionLapsRemaining,
    double? SessionTimeRemainingSec,
    int? SessionNum,
    // Per-car arrays (index = carIdx). Inactive slots are null / filtered upstream.
    IReadOnlyList<int?>? CarIdxPosition,
    IReadOnlyList<int?>? CarIdxClassPosition,
    IReadOnlyList<int?>? CarIdxLap,
    IReadOnlyList<double?>? CarIdxLapDistPct,
    IReadOnlyList<bool?>? CarIdxOnPitRoad);
