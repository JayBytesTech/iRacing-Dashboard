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
    // Player's cumulative session incident count (iRacing's "x"); rises drive Incident events.
    int? IncidentCount,
    // Live race-remaining (counts down) — these come from telemetry vars, not SessionInfo YAML.
    int? SessionLapsRemaining,
    double? SessionTimeRemainingSec,
    int? SessionNum,
    // Per-car arrays (index = carIdx). Inactive slots are null / filtered upstream.
    IReadOnlyList<int?>? CarIdxPosition,
    IReadOnlyList<int?>? CarIdxClassPosition,
    IReadOnlyList<int?>? CarIdxLap,
    IReadOnlyList<double?>? CarIdxLapDistPct,
    IReadOnlyList<bool?>? CarIdxOnPitRoad,
    // CarIdxLapCompleted = last fully-completed lap per car (sharper lapped/blue-flag detection than
    // CarIdxLap, which increments at S/F). CarIdxEstTime = iRacing's own estimate of seconds from S/F
    // to each car's current track position — the proper input for relative gap-in-seconds (it accounts
    // for non-uniform speed around the lap, unlike lapDistPct x lap-time). Both default null so older
    // recordings (which lack them) still deserialize.
    IReadOnlyList<int?>? CarIdxLapCompleted = null,
    IReadOnlyList<double?>? CarIdxEstTime = null,
    // Player-car tires. Null on older recordings that predate tire capture (so they still deserialize).
    TireSet? Tires = null);

/// <summary>Player-car tires for one tick. Temps are live surface temps (°C), pressure is hot
/// pressure (kPa), wear is fraction of tread remaining (0..1, 1 = new). L/M/R are the tread
/// left/middle/right positions exactly as iRacing reports them; mapping to inner/outer (which
/// depends on the car side) is left to the UI.</summary>
public record TireSet(TireCorner Lf, TireCorner Rf, TireCorner Lr, TireCorner Rr);

public record TireCorner(
    double? TempLeftC = null,
    double? TempMidC = null,
    double? TempRightC = null,
    double? PressureKpa = null,
    double? WearLeft = null,
    double? WearMid = null,
    double? WearRight = null);
