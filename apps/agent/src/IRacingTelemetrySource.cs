namespace IracingEngineer.Agent;

/// <summary>
/// Adapter over SVappsLAB.iRacingTelemetrySDK. The SDK exposes ONE API for both live telemetry and
/// .ibt file playback (see https://github.com/SVappsLAB/iRacingTelemetrySDK), so this single class
/// covers both modes — choose by config:
///   - mode "ibt"  -> playback of a recorded .ibt file (cross-platform: Linux/macOS/Windows)
///   - mode "live" -> live shared-memory telemetry (Windows-only)
///
/// NOTE: this is the one file that depends on the SDK surface. It is intentionally the *only* place
/// to touch when wiring the real SDK on the first Windows pull. The SDK uses a source generator to
/// produce a typed telemetry struct from a [RequiredTelemetryVars] attribute; wire that struct's
/// fields into TelemetryFrame below. Everything downstream consumes ITelemetrySource and is already
/// testable on Linux via the mock agent / IbtReplaySource.
/// </summary>
public sealed class IRacingTelemetrySource : ITelemetrySource
{
    private readonly AgentConfig _config;

    public event Action<TelemetryFrame>? FrameReceived;
    public event Action<SessionInfoFrame>? SessionInfoReceived;
    public event Action<bool>? ConnectionChanged;

    public IRacingTelemetrySource(AgentConfig config) => _config = config;

    public Task RunAsync(CancellationToken ct)
    {
        // TODO(first-windows-pull): instantiate the SVappsLAB TelemetryClient and call Monitor()
        // with TelemetryHandlers wired to the events below:
        //
        //   var client = mode == "ibt"
        //       ? TelemetryClient<MyVars>.Create(logger, ibtOptions: new IBTOptions(_config.Telemetry.IbtPath))
        //       : TelemetryClient<MyVars>.Create(logger);            // live (Windows)
        //
        //   await client.Monitor(new TelemetryHandlers<MyVars>
        //   {
        //       OnConnectStateChanged = e => ConnectionChanged?.Invoke(e.State == ConnectState.Connected),
        //       OnSessionInfoUpdate   = info => SessionInfoReceived?.Invoke(MapSessionInfo(info)),
        //       OnTelemetryUpdate     = t   => FrameReceived?.Invoke(MapFrame(t)),
        //       OnError               = ex  => log.Error(ex, "telemetry source error"),
        //   }, ct);
        //
        // Until then, RunAsync is a no-op so the agent boots and serves /status. Use IbtReplaySource
        // (or the Node mock-agent) for the live data path during Linux development.
        return Task.CompletedTask;
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;
}
