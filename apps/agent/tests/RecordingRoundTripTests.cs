using System.Text.Json;
using System.Text.Json.Serialization;
using IracingEngineer.Agent;
using IracingEngineer.TelemetryCore.SessionInfo;
using Xunit;

namespace IracingEngineer.Agent.Tests;

/// <summary>
/// Proves our recording format preserves the WHOLE FIELD — the thing an .ibt can't hold. Records
/// synthetic multi-car frames, plays them back through <see cref="RecordingTelemetrySource"/>, and
/// asserts the per-car arrays survive the round trip. Runs on Linux with no sim.
/// </summary>
public class RecordingRoundTripTests
{
    // Same serializer settings the agent uses on the wire.
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Converters = { new JsonStringEnumConverter() },
    };

    private static TelemetryFrame MultiCarFrame(long sessionMs) => new(
        SessionTimeMs: sessionMs,
        IsOnTrack: true,
        IsReplayPlaying: true,
        Speed: 55.0,
        Gear: 4,
        Rpm: 7200,
        Throttle: 0.9,
        Brake: 0.0,
        Lat: 42.34,
        Lon: -76.93,
        FuelLevel: 60.0,
        Lap: 5,
        LapCompleted: 4,
        LapDistPct: 0.42,
        OnPitRoad: false,
        IncidentCount: 4,
        SessionLapsRemaining: 20,
        SessionTimeRemainingSec: null,
        SessionNum: 0,
        CarIdxPosition: new int?[] { 1, 2, 3 },
        CarIdxClassPosition: new int?[] { 1, 1, 2 },
        CarIdxLap: new int?[] { 5, 5, 4 },
        CarIdxLapDistPct: new double?[] { 0.42, 0.55, 0.10 },
        CarIdxOnPitRoad: new bool?[] { false, false, true },
        CarIdxLapCompleted: new int?[] { 4, 4, 3 },
        CarIdxEstTime: new double?[] { 42.0, 55.0, 10.0 });

    [Fact]
    public async Task Recording_round_trips_the_whole_field_and_session()
    {
        var dir = Path.Combine(Path.GetTempPath(), "rec-" + Guid.NewGuid().ToString("N"));
        var session = new SessionInfoData
        {
            TrackDisplayName = "Watkins Glen",
            PlayerCarIdx = 0,
            Drivers = new[]
            {
                new SessionDriver(0, "1", "Player", null, "GT3", 100, false),
                new SessionDriver(1, "22", "Rival", null, "GTP", 200, false),
                new SessionDriver(2, "7", "Other", null, "GT3", 100, false),
            },
        };

        string path;
        using (var rec = new SessionRecorder(dir, recordHz: 10, Json))
        {
            rec.OnSessionInfo(session);
            rec.OnFrame(MultiCarFrame(1000));
            path = rec.Path;
        }

        var frames = new List<TelemetryFrame>();
        SessionInfoData? gotSession = null;
        var src = new RecordingTelemetrySource(path, speed: 0, Json);
        src.SessionInfoReceived += s => gotSession = s;
        src.FrameReceived += f => frames.Add(f);
        await src.RunAsync(CancellationToken.None);

        // Session + roster survived.
        Assert.Equal("Watkins Glen", gotSession?.TrackDisplayName);
        Assert.Equal(3, gotSession?.Drivers.Count);

        // The per-car arrays — the thing the .ibt lacks — survived intact.
        var f = Assert.Single(frames);
        Assert.Equal(new int?[] { 1, 2, 3 }, f.CarIdxPosition);
        Assert.Equal(new int?[] { 1, 1, 2 }, f.CarIdxClassPosition);
        Assert.Equal(new double?[] { 0.42, 0.55, 0.10 }, f.CarIdxLapDistPct);
        Assert.Equal(new bool?[] { false, false, true }, f.CarIdxOnPitRoad);
        Assert.Equal(new int?[] { 4, 4, 3 }, f.CarIdxLapCompleted);
        Assert.Equal(new double?[] { 42.0, 55.0, 10.0 }, f.CarIdxEstTime);
        // Player scalars too.
        Assert.Equal(60.0, f.FuelLevel);
        Assert.Equal(0.42, f.LapDistPct);

        Directory.Delete(dir, recursive: true);
    }

    [Fact]
    public async Task Recorder_downsamples_by_session_time()
    {
        var dir = Path.Combine(Path.GetTempPath(), "rec-" + Guid.NewGuid().ToString("N"));
        string path;
        using (var rec = new SessionRecorder(dir, recordHz: 10, Json)) // 100 ms interval
        {
            rec.OnFrame(MultiCarFrame(0));    // recorded (first)
            rec.OnFrame(MultiCarFrame(50));   // skipped (<100 ms since last)
            rec.OnFrame(MultiCarFrame(150));  // recorded (>=100 ms)
            rec.OnFrame(MultiCarFrame(180));  // skipped
            path = rec.Path;
        }

        var frames = new List<TelemetryFrame>();
        var src = new RecordingTelemetrySource(path, speed: 0, Json);
        src.FrameReceived += f => frames.Add(f);
        await src.RunAsync(CancellationToken.None);

        Assert.Equal(2, frames.Count);
        Assert.Equal(new long[] { 0, 150 }, frames.Select(f => f.SessionTimeMs));

        Directory.Delete(dir, recursive: true);
    }
}
