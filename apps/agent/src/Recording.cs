using System.Text.Json;
using IracingEngineer.TelemetryCore.SessionInfo;

namespace IracingEngineer.Agent;

/// <summary>
/// One line of an NDJSON session recording. <see cref="K"/> discriminates: "h" header, "s" session
/// info, "f" telemetry frame. Only the matching payload field is populated (nulls are omitted on
/// write), so the file is a readable, append-friendly stream.
/// </summary>
public sealed record RecordingLine(
    string K,
    RecordingHeader? H = null,
    SessionInfoData? S = null,
    TelemetryFrame? F = null);

public sealed record RecordingHeader(string RecordedAt, int RecordHz, string AgentVersion);

/// <summary>
/// Writes the agent's normalized telemetry stream to our own recording file. Unlike an `.ibt` (which is
/// single-car), this captures whatever the live source provides — including the per-car <c>CarIdx*</c>
/// arrays — so a recorded race holds the whole field and can be replayed/analyzed anywhere later.
/// Frames are downsampled by SESSION time (not wall clock) so density is independent of playback speed.
/// </summary>
public sealed class SessionRecorder : IDisposable
{
    private readonly StreamWriter _writer;
    private readonly JsonSerializerOptions _json;
    private readonly long _intervalMs;
    private readonly object _lock = new();
    private long? _lastRecordedMs;

    public string Path { get; }

    public SessionRecorder(string dir, int recordHz, JsonSerializerOptions json)
    {
        Directory.CreateDirectory(dir);
        Path = System.IO.Path.Combine(dir, $"{DateTimeOffset.Now:yyyyMMdd-HHmmss}.ndjson");
        _writer = new StreamWriter(Path) { AutoFlush = true }; // durable even if the agent is killed
        _json = json;
        _intervalMs = Math.Max(1, 1000 / Math.Max(1, recordHz));
        Write(new RecordingLine("h", H: new RecordingHeader(DateTimeOffset.UtcNow.ToString("o"), recordHz, "0.1.0")));
    }

    public void OnSessionInfo(SessionInfoData session)
    {
        lock (_lock) Write(new RecordingLine("s", S: session));
    }

    public void OnFrame(TelemetryFrame frame)
    {
        lock (_lock)
        {
            // downsample by session time (always record the first frame)
            if (_lastRecordedMs is { } last && frame.SessionTimeMs - last < _intervalMs) return;
            _lastRecordedMs = frame.SessionTimeMs;
            Write(new RecordingLine("f", F: frame));
        }
    }

    private void Write(RecordingLine line) => _writer.WriteLine(JsonSerializer.Serialize(line, _json));

    public void Dispose()
    {
        lock (_lock)
        {
            _writer.Flush();
            _writer.Dispose();
        }
    }
}
