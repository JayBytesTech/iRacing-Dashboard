using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using SVappsLAB.iRacingTelemetrySDK;
using IracingEngineer.TelemetryCore.SessionInfo;

namespace IracingEngineer.Agent;

/// <summary>
/// The one place that touches the SVappsLAB SDK. It exposes the same <see cref="ITelemetrySource"/>
/// the rest of the agent already consumes, so nothing downstream knows whether data is live or
/// replayed. Selected by config:
///   - mode "ibt"  -> playback of a recorded .ibt file (cross-platform; dev on Linux)
///   - mode "live" -> live shared-memory telemetry (Windows only)
///
/// The SDK's source generator turns the [RequiredTelemetryVars] list below into a strongly-typed
/// <c>TelemetryData</c> struct. Building this project therefore requires the .NET 10 SDK (the
/// generator needs Roslyn 5.0); the target framework itself is still net8.0.
/// </summary>
[RequiredTelemetryVars([
    TelemetryVar.IsOnTrack, TelemetryVar.IsReplayPlaying, TelemetryVar.SessionNum,
    TelemetryVar.SessionTime, TelemetryVar.SessionTimeRemain, TelemetryVar.SessionLapsRemainEx,
    TelemetryVar.Speed, TelemetryVar.Gear, TelemetryVar.RPM, TelemetryVar.FuelLevel,
    TelemetryVar.Throttle, TelemetryVar.Brake,
    TelemetryVar.Lap, TelemetryVar.LapCompleted, TelemetryVar.LapDistPct, TelemetryVar.OnPitRoad,
    TelemetryVar.CarIdxPosition, TelemetryVar.CarIdxClassPosition, TelemetryVar.CarIdxLap,
    TelemetryVar.CarIdxLapCompleted, TelemetryVar.CarIdxLapDistPct, TelemetryVar.CarIdxOnPitRoad,
    TelemetryVar.CarIdxEstTime,
])]
public sealed class IRacingTelemetrySource : ITelemetrySource
{
    private readonly AgentConfig _config;
    private readonly ILogger _logger;
    private int? _lastSessionNum;
    private bool _loggedFrame;

    // iRacing reports these sentinels when a session has no lap/time limit (e.g. practice).
    private const int UnlimitedLaps = 32767;
    private const double UnlimitedTimeSec = 604800; // 7 days

    public event Action<TelemetryFrame>? FrameReceived;
    public event Action<SessionInfoData>? SessionInfoReceived;
    public event Action<bool>? ConnectionChanged;

    public IRacingTelemetrySource(AgentConfig config, ILogger? logger = null)
    {
        _config = config;
        _logger = logger ?? NullLogger.Instance;
    }

    public async Task RunAsync(CancellationToken ct)
    {
        var speed = _config.Telemetry.IbtPlaybackSpeed > 0 ? _config.Telemetry.IbtPlaybackSpeed : int.MaxValue;
        var ibt = _config.Telemetry.Mode == "ibt" && !string.IsNullOrWhiteSpace(_config.Telemetry.IbtPath)
            ? new IBTOptions(_config.Telemetry.IbtPath!, speed)
            : null;

        await using var client = ibt is null
            ? TelemetryClient<TelemetryData>.Create(_logger)        // live (Windows shared memory)
            : TelemetryClient<TelemetryData>.Create(_logger, ibt);  // .ibt playback (cross-platform)

        var handlers = new TelemetryHandlers<TelemetryData>
        {
            OnConnectStateChanged = state =>
            {
                ConnectionChanged?.Invoke(state == ConnectState.Connected);
                return Task.CompletedTask;
            },
            // Parse the raw SessionInfo YAML with our own tested parser rather than the SDK's model.
            OnRawSessionInfoUpdate = yaml =>
            {
                var data = SessionInfoParser.Parse(yaml, _lastSessionNum);
                _logger.LogInformation("[diag] SessionInfo yaml={len}B parsed={ok} track={track} drivers={n} playerIdx={idx} lapLimited={ll}",
                    yaml?.Length, data is not null, data?.TrackDisplayName, data?.Drivers.Count, data?.PlayerCarIdx, data?.IsLapLimited);
                if (data is not null) SessionInfoReceived?.Invoke(data);
                return Task.CompletedTask;
            },
            OnTelemetryUpdate = t =>
            {
                _lastSessionNum = t.SessionNum;
                if (!_loggedFrame)
                {
                    _loggedFrame = true;
                    var pct = t.CarIdxLapDistPct;
                    var active = pct?.Count(x => x >= 0) ?? -1;
                    _logger.LogInformation("[diag] first frame: CarIdxPosition.Len={pos} CarIdxLapDistPct.Len={pl} active(>=0)={act} lapsRemEx={lr} timeRem={tr}",
                        t.CarIdxPosition?.Length, pct?.Length, active, t.SessionLapsRemainEx, t.SessionTimeRemain);
                }
                FrameReceived?.Invoke(MapFrame(t));
                return Task.CompletedTask;
            },
            OnError = ex =>
            {
                _logger.LogError(ex, "iRacing telemetry error");
                return Task.CompletedTask;
            },
        };

        await client.Monitor(handlers, ct);
    }

    /// <summary>Projects the generated SDK struct onto our source-agnostic <see cref="TelemetryFrame"/>.</summary>
    private static TelemetryFrame MapFrame(TelemetryData t) => new(
        SessionTimeMs: (long)((t.SessionTime ?? 0) * 1000),
        IsOnTrack: t.IsOnTrack ?? false,
        IsReplayPlaying: t.IsReplayPlaying ?? false,
        Speed: t.Speed,             // m/s; SnapshotBuilder converts to kph
        Gear: t.Gear,
        Rpm: t.RPM,
        Throttle: t.Throttle,       // 0..1
        Brake: t.Brake,             // 0..1
        FuelLevel: t.FuelLevel,     // litres
        Lap: t.Lap,
        LapCompleted: t.LapCompleted,
        LapDistPct: t.LapDistPct,
        OnPitRoad: t.OnPitRoad,
        // Map iRacing's "unlimited" sentinels to null so practice/open sessions don't read as a
        // 32767-lap race and wreck fuel-to-finish.
        SessionLapsRemaining: t.SessionLapsRemainEx is { } lr and < UnlimitedLaps ? lr : null,
        SessionTimeRemainingSec: t.SessionTimeRemain is { } tr and < UnlimitedTimeSec ? tr : null,
        SessionNum: t.SessionNum,
        CarIdxPosition: Nullable(t.CarIdxPosition),
        CarIdxClassPosition: Nullable(t.CarIdxClassPosition),
        CarIdxLap: Nullable(t.CarIdxLap),
        CarIdxLapDistPct: Nullable(t.CarIdxLapDistPct),
        CarIdxOnPitRoad: Nullable(t.CarIdxOnPitRoad));

    // The SDK exposes per-car arrays with non-nullable elements; our frame model uses nullable
    // elements so a missing slot is explicit. (-1 padding is filtered downstream in SnapshotBuilder.)
    private static IReadOnlyList<int?>? Nullable(int[]? a) => a?.Select(x => (int?)x).ToList();
    private static IReadOnlyList<double?>? Nullable(float[]? a) => a?.Select(x => (double?)x).ToList();
    private static IReadOnlyList<bool?>? Nullable(bool[]? a) => a?.Select(x => (bool?)x).ToList();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;
}
