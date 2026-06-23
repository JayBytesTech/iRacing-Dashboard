using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using IracingEngineer.Agent;
using IracingEngineer.Strategy.Fuel;
using IracingEngineer.TelemetryCore.SessionInfo;
using IracingEngineer.Journal;

// Entry point for the local telemetry agent.
//   1. load config   2. start HTTP + WebSocket host   3. start the telemetry source
//   4. normalize frames -> liveSnapshot   5. broadcast to dashboard clients at the UI rate
// The agent must boot and serve /status even if iRacing is unavailable.

var config = AgentConfig.Load("agent.config.json");

// Offline replay-and-report mode: `dotnet run -- analyze [path.ibt]`. Replays a file to completion
// through the real fuel tracker and prints a validation report, then exits (no web server).
if (args.Length > 0 && args[0] == "analyze")
{
    var rest = args.Skip(1).ToArray();
    var save = rest.Contains("--save");
    var ibtArg = rest.FirstOrDefault(a => !a.StartsWith("--"));
    return await AnalyzeCommand.Run(config, ibtArg, save);
}

// Batch backfill: `dotnet run -- import <dir>` replays every .ibt under a folder and saves each to the
// journal (quietly), so the trend views have history to chart.
if (args.Length > 0 && args[0] == "import")
    return await ImportCommand.Run(config, args.Length > 1 ? args[1] : null);

// Offline track-map exporter: replays a file and writes a geographic centerline JSON to stdout.
if (args.Length > 0 && args[0] == "maptrack")
    return await MapTrackCommand.Run(config, args.Length > 1 ? args[1] : null);

var jsonOptions = new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    // Serialize enums (FuelStatus, FuelConfidence, …) as their names, e.g. "Safe"/"Medium", so the
    // dashboard reads them directly instead of magic integers.
    Converters = { new JsonStringEnumConverter() },
};

var hub = new WebSocketHub(jsonOptions);
var builder = new SnapshotBuilder(config.Privacy);
var fuelTracker = new FuelStrategyTracker();
var traceRecorder = new LapTraceRecorder();
var eventDetector = new IracingEngineer.TelemetryCore.Events.EventDetector();

using var telemetryLoggerFactory = LoggerFactory.Create(b => b.AddConsole());
// Source: replay our own multi-car recording, else the iRacing SDK (live shared memory or .ibt).
ITelemetrySource source = config.Telemetry.Mode == "recording" && !string.IsNullOrWhiteSpace(config.Telemetry.RecordingPath)
    ? new RecordingTelemetrySource(
        config.Telemetry.RecordingPath!,
        config.Telemetry.IbtPlaybackSpeed > 0 ? config.Telemetry.IbtPlaybackSpeed : int.MaxValue,
        jsonOptions)
    : new IRacingTelemetrySource(config, telemetryLoggerFactory.CreateLogger("iracing"));

// Optionally record the live/ibt stream (the whole field) to our own cross-platform format.
SessionRecorder? recorder = config.Telemetry.RecordSession && config.Telemetry.Mode != "recording"
    ? new SessionRecorder("data/recordings", config.Telemetry.RecordHz, jsonOptions)
    : null;
if (recorder is not null) Console.WriteLine($"[record] writing session to {recorder.Path}");

var iracingConnected = false;
TelemetryFrame? latest = null;
SessionInfoData? latestSession = null;
var lastFrameAt = DateTimeOffset.UtcNow;

// Journal: shared by the HTTP API and the live session-end auto-capture below.
var journal = new JournalStore(config.Journal.DbPath);
var captureLock = new object();
var runStart = DateTimeOffset.UtcNow;
int? activeSessionNum = null;
var capturedSessions = new HashSet<int>();

// Write a journal record for the session we've been accumulating. Idempotent per SessionNum, so the
// session-change, end-of-stream, and shutdown triggers can all fire without duplicating.
void CaptureSession(string reason)
{
    if (!config.Journal.AutoCapture) return;
    lock (captureLock)
    {
        if (activeSessionNum is not { } sn || fuelTracker.Laps.Count == 0) return;
        if (!capturedSessions.Add(sn)) return;

        var ibt = config.Telemetry.Mode == "ibt" && !string.IsNullOrWhiteSpace(config.Telemetry.IbtPath);
        var id = ibt ? "ibt:" + Path.GetFileName(config.Telemetry.IbtPath!)
                     : $"live:{runStart:yyyyMMdd-HHmmss}:s{sn}";
        var capturedAt = ibt && File.Exists(config.Telemetry.IbtPath!)
            ? new DateTimeOffset(File.GetLastWriteTimeUtc(config.Telemetry.IbtPath!), TimeSpan.Zero)
            : DateTimeOffset.UtcNow;
        var record = SessionRecordFactory.Build(id, ibt ? id : "live", capturedAt, latestSession, fuelTracker, traceRecorder, eventDetector);
        var detail = SessionDetailFactory.Build(latestSession, fuelTracker, traceRecorder, eventDetector);
        journal.Upsert(record, SessionDetailFactory.Serialize(detail));
        Console.WriteLine($"[journal] captured session {sn} ({reason}): {record.Laps} laps, " +
                          $"best {record.BestLapSec?.ToString("F2") ?? "—"}s -> {record.Id}");
    }
}

source.ConnectionChanged += c => iracingConnected = c;
source.SessionInfoReceived += info =>
{
    latestSession = info;
    builder.UpdateSessionInfo(info);
    recorder?.OnSessionInfo(info);
};
source.FrameReceived += f =>
{
    latest = f;
    lastFrameAt = DateTimeOffset.UtcNow;

    // Session boundary: log the finished session, then accumulate the next one from scratch.
    if (f.SessionNum is { } sn && sn != activeSessionNum)
    {
        if (activeSessionNum is not null) CaptureSession("session change");
        activeSessionNum = sn;
        fuelTracker = new FuelStrategyTracker();
        traceRecorder = new LapTraceRecorder();
        eventDetector = new IracingEngineer.TelemetryCore.Events.EventDetector();
    }

    fuelTracker.OnFrame(f, ResolveRaceRemaining(f, latestSession));
    traceRecorder.OnFrame(f);
    eventDetector.OnFrame(new IracingEngineer.TelemetryCore.Events.EventInput(f.SessionTimeMs, f.Lap, f.OnPitRoad, f.IncidentCount));
    recorder?.OnFrame(f);
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

var webBuilder = WebApplication.CreateBuilder(args);
// The web dashboard is served from a different origin in dev (localhost:3000); allow it to read/write
// the journal API. This is a local-only agent, so a permissive policy is fine.
webBuilder.Services.AddCors(o => o.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));
var app = webBuilder.Build();
app.UseWebSockets();
app.UseCors();

// --- HTTP status / capabilities (plain JSON) ---
app.MapGet("/status", () => Results.Json(new
{
    agentVersion = "0.1.0",
    iracingConnected,
    clientsConnected = hub.ClientCount,
    recording = config.Telemetry.RecordSession,
    mode = config.Telemetry.Mode,
}, jsonOptions));

// --- Driver's journal (SQLite-backed) ---
app.MapGet("/journal", () => Results.Json(journal.List(), jsonOptions));
app.MapGet("/journal/{id}", (string id) =>
    journal.Get(id) is { } r ? Results.Json(r, jsonOptions) : Results.NotFound());
// Full analysis blob for the in-browser detail view (stored as lowerCamelCase JSON at capture time).
app.MapGet("/journal/{id}/detail", (string id) =>
    journal.GetDetail(id) is { } d ? Results.Content(d, "application/json") : Results.NotFound());
app.MapPost("/journal/{id}", (string id, JournalEdit edit) =>
    journal.SaveEdit(id, edit) is { } r ? Results.Json(r, jsonOptions) : Results.NotFound());

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
// When the stream ends (an .ibt reaches EOF, or live disconnects), log the in-progress session.
_ = source.RunAsync(cts.Token).ContinueWith(_ => CaptureSession("end of stream"), TaskScheduler.Default);

var snapshotInterval = TimeSpan.FromMilliseconds(1000.0 / Math.Max(1, config.Telemetry.UiSnapshotHz));
_ = Task.Run(async () =>
{
    using var timer = new PeriodicTimer(snapshotInterval);
    while (await timer.WaitForNextTickAsync(cts.Token))
    {
        if (latest is not { } frame) continue;
        var ageMs = (long)(DateTimeOffset.UtcNow - lastFrameAt).TotalMilliseconds;
        var trackMeters = (latestSession?.TrackLengthKm ?? 0) * 1000.0;
        var coaching = CoachingSnapshotBuilder.Build(traceRecorder.Traces, trackMeters);
        // Most recent events first, capped so the payload stays small (the timeline shows the latest).
        var recentEvents = eventDetector.Events.Count <= 20
            ? eventDetector.Events.Reverse().ToList()
            : eventDetector.Events.Skip(eventDetector.Events.Count - 20).Reverse().ToList();
        var snapshot = builder.Build(frame, iracingConnected, ageMs, fuelTracker.Current, coaching, recentEvents);
        await hub.BroadcastAsync("liveSnapshot", snapshot, cts.Token);
    }
});

app.Lifetime.ApplicationStopping.Register(() =>
{
    CaptureSession("shutdown"); // flush the current session on graceful stop (SIGINT/SIGTERM)
    recorder?.Dispose();        // close the recording file
    cts.Cancel();
});
app.Run($"http://{config.Server.Host}:{config.Server.Port}");
return 0;
