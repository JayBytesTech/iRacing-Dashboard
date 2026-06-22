using System.Text.Json;
using IracingEngineer.TelemetryCore.SessionInfo;

namespace IracingEngineer.Agent;

/// <summary>
/// Plays back a recording written by <see cref="SessionRecorder"/> through the same
/// <see cref="ITelemetrySource"/> the rest of the agent consumes — so the dashboard, journal and
/// strategy work unchanged, now driven by a captured multi-car session. Cross-platform: a race recorded
/// on the Windows sim PC replays here on Linux with the whole field intact.
/// </summary>
public sealed class RecordingTelemetrySource : ITelemetrySource
{
    private readonly string _path;
    private readonly int _speed; // 1 = real time, 0/neg = as fast as possible
    private readonly JsonSerializerOptions _json;

    public event Action<TelemetryFrame>? FrameReceived;
    public event Action<SessionInfoData>? SessionInfoReceived;
    public event Action<bool>? ConnectionChanged;

    public RecordingTelemetrySource(string path, int speed, JsonSerializerOptions json)
    {
        _path = path;
        _speed = speed;
        _json = json;
    }

    public async Task RunAsync(CancellationToken ct)
    {
        ConnectionChanged?.Invoke(true);
        using var reader = new StreamReader(_path);
        long? prevMs = null;

        string? line;
        while ((line = await reader.ReadLineAsync()) is not null && !ct.IsCancellationRequested)
        {
            if (string.IsNullOrWhiteSpace(line)) continue;
            RecordingLine? rec;
            try { rec = JsonSerializer.Deserialize<RecordingLine>(line, _json); }
            catch { continue; } // a malformed line shouldn't take down playback
            if (rec is null) continue;

            switch (rec.K)
            {
                case "s" when rec.S is not null:
                    SessionInfoReceived?.Invoke(rec.S);
                    break;
                case "f" when rec.F is not null:
                    if (_speed > 0 && prevMs is { } p)
                    {
                        var delayMs = (rec.F.SessionTimeMs - p) / (double)_speed;
                        if (delayMs > 0) await Task.Delay((int)Math.Min(delayMs, 5000), ct);
                    }
                    prevMs = rec.F.SessionTimeMs;
                    FrameReceived?.Invoke(rec.F);
                    break;
            }
        }

        ConnectionChanged?.Invoke(false);
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;
}
