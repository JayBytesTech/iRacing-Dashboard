using System.Text.Json;
using System.Text.Json.Serialization;
using IracingEngineer.Agent;
using IracingEngineer.Strategy.Fuel;
using IracingEngineer.TelemetryCore.SessionInfo;

// Entry point for the local telemetry agent.
//   1. load config   2. start HTTP + WebSocket host   3. start the telemetry source
//   4. normalize frames -> liveSnapshot   5. broadcast to dashboard clients at the UI rate
// The agent must boot and serve /status even if iRacing is unavailable.

var config = AgentConfig.Load("agent.config.json");

var jsonOptions = new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
};

var hub = new WebSocketHub(jsonOptions);
var builder = new SnapshotBuilder(config.Privacy);
var fuelTracker = new FuelStrategyTracker();

ITelemetrySource source = new IRacingTelemetrySource(config);
var iracingConnected = false;
TelemetryFrame? latest = null;
SessionInfoData? latestSession = null;
var lastFrameAt = DateTimeOffset.UtcNow;

source.ConnectionChanged += c => iracingConnected = c;
source.SessionInfoReceived += info =>
{
    latestSession = info;
    builder.UpdateSessionInfo(info);
};
source.FrameReceived += f =>
{
    latest = f;
    lastFrameAt = DateTimeOffset.UtcNow;
    fuelTracker.OnFrame(f, ResolveRaceRemaining(f, latestSession));
};

// Remaining laps/time count down via telemetry; SessionInfo tells us which one bounds the race.
static RaceRemaining ResolveRaceRemaining(TelemetryFrame f, SessionInfoData? session)
{
    var lapLimited = session?.IsLapLimited ?? false;
    if (lapLimited && f.SessionLapsRemaining is { } laps) return new RaceRemaining(LapsRemaining: laps);
    if (f.SessionTimeRemainingSec is { } secs) return new RaceRemaining(TimeRemainingSec: secs);
    if (f.SessionLapsRemaining is { } fallbackLaps) return new RaceRemaining(LapsRemaining: fallbackLaps);
    return new RaceRemaining();
}

var app = WebApplication.CreateBuilder(args).Build();
app.UseWebSockets();

// --- HTTP status / capabilities (plain JSON) ---
app.MapGet("/status", () => Results.Json(new
{
    agentVersion = "0.1.0",
    iracingConnected,
    clientsConnected = hub.ClientCount,
    recording = config.Telemetry.RecordSession,
    mode = config.Telemetry.Mode,
}, jsonOptions));

// --- WebSocket live stream ---
app.Map("/live", async context =>
{
    if (!context.WebSockets.IsWebSocketRequest)
    {
        context.Response.StatusCode = 400;
        return;
    }
    using var socket = await context.WebSockets.AcceptWebSocketAsync();
    await hub.BroadcastAsync("hello", new { agentVersion = "0.1.0" }, context.RequestAborted);
    await hub.HandleClientAsync(socket, context.RequestAborted);
});

// --- Telemetry source + broadcast loop ---
var cts = new CancellationTokenSource();
_ = source.RunAsync(cts.Token);

var snapshotInterval = TimeSpan.FromMilliseconds(1000.0 / Math.Max(1, config.Telemetry.UiSnapshotHz));
_ = Task.Run(async () =>
{
    using var timer = new PeriodicTimer(snapshotInterval);
    while (await timer.WaitForNextTickAsync(cts.Token))
    {
        if (latest is not { } frame) continue;
        var ageMs = (long)(DateTimeOffset.UtcNow - lastFrameAt).TotalMilliseconds;
        var snapshot = builder.Build(frame, iracingConnected, ageMs, fuelTracker.Current);
        await hub.BroadcastAsync("liveSnapshot", snapshot, cts.Token);
    }
});

app.Lifetime.ApplicationStopping.Register(() => cts.Cancel());
app.Run($"http://{config.Server.Host}:{config.Server.Port}");
