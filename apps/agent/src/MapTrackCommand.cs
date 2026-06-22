using System.Text.Json;
using IracingEngineer.TelemetryCore.SessionInfo;

namespace IracingEngineer.Agent;

/// <summary>
/// Offline track-map exporter: <c>dotnet run -- maptrack &lt;file.ibt&gt; &gt; track.json</c>. Replays a
/// file, takes the fastest clean lap's GPS centerline, projects it to a flat local-metres plane and
/// normalizes it into a square SVG viewBox (north up), then writes a track-map JSON asset to stdout.
/// Diagnostics go to stderr so stdout stays clean for redirection. Maps are derived from the user's own
/// telemetry — no copyrighted track files.
/// </summary>
public static class MapTrackCommand
{
    private const int Bins = 240;
    private const double Size = 1000;
    private const double Pad = 40;

    public static async Task<int> Run(AgentConfig config, string? ibtPathOverride)
    {
        var path = ibtPathOverride ?? config.Telemetry.IbtPath;
        if (string.IsNullOrWhiteSpace(path) || !File.Exists(path))
        {
            Console.Error.WriteLine($"maptrack: file not found: {path}");
            return 1;
        }

        var runConfig = config with
        {
            Telemetry = config.Telemetry with { Mode = "ibt", IbtPath = path, IbtPlaybackSpeed = 0 },
        };

        var recorder = new TrackPathRecorder(Bins);
        SessionInfoData? session = null;
        long frames = 0;
        var lastFrameAt = DateTimeOffset.UtcNow;

        var source = new IRacingTelemetrySource(runConfig);
        source.SessionInfoReceived += info => session = info;
        source.FrameReceived += f => { frames++; lastFrameAt = DateTimeOffset.UtcNow; recorder.OnFrame(f); };

        Console.Error.WriteLine($"maptrack: replaying {Path.GetFileName(path)} at max speed…");
        using var cts = new CancellationTokenSource();
        var replay = source.RunAsync(cts.Token);
        while (!replay.IsCompleted)
        {
            await Task.WhenAny(replay, Task.Delay(500));
            if (frames > 0 && (DateTimeOffset.UtcNow - lastFrameAt).TotalSeconds > 4) { cts.Cancel(); break; }
        }
        try { await replay; } catch (OperationCanceledException) { }
        await source.DisposeAsync();

        // Fastest non-pit lap = the cleanest single trip around the track.
        var reference = recorder.Laps.Where(l => !l.UsedPitRoad).OrderBy(l => l.LapTimeSec).FirstOrDefault();
        if (reference is null)
        {
            Console.Error.WriteLine("maptrack: no clean lap found to build a centerline.");
            return 1;
        }
        Console.Error.WriteLine($"maptrack: {frames:N0} frames, {recorder.Laps.Count} laps; using lap {reference.Lap} @ {reference.LapTimeSec:F2}s");

        var asset = Export(reference, session);
        Console.WriteLine(JsonSerializer.Serialize(asset, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false,
        }));
        return 0;
    }

    private static object Export(TrackLap lap, SessionInfoData? session)
    {
        var n = lap.Lat.Length;
        var lat0 = lap.Lat.Average();
        var lon0 = lap.Lon.Average();
        var mPerDegLat = 110540.0;
        var mPerDegLon = 111320.0 * Math.Cos(lat0 * Math.PI / 180.0);

        var xm = new double[n];
        var ym = new double[n];
        for (var i = 0; i < n; i++)
        {
            xm[i] = (lap.Lon[i] - lon0) * mPerDegLon;
            ym[i] = (lap.Lat[i] - lat0) * mPerDegLat;
        }

        double minX = xm.Min(), maxX = xm.Max(), minY = ym.Min(), maxY = ym.Max();
        var usable = Size - 2 * Pad;
        var scale = usable / Math.Max(maxX - minX, maxY - minY);
        var ox = Pad + (usable - (maxX - minX) * scale) / 2;
        var oy = Pad + (usable - (maxY - minY) * scale) / 2;

        var points = new double[n][];
        for (var i = 0; i < n; i++)
        {
            var sx = ox + (xm[i] - minX) * scale;
            var sy = oy + (maxY - ym[i]) * scale; // flip Y so north is up
            points[i] = new[] { Math.Round(sx, 1), Math.Round(sy, 1) };
        }

        var name = session?.TrackDisplayName ?? "Unknown Track";
        return new
        {
            trackId = Slug(name + (session?.TrackConfigName is { } c ? "-" + c : "")),
            name,
            configName = session?.TrackConfigName,
            bins = n,
            viewBox = new[] { 0, 0, (int)Size, (int)Size },
            points,
        };
    }

    private static string Slug(string s)
    {
        var chars = s.ToLowerInvariant().Select(ch => char.IsLetterOrDigit(ch) ? ch : '-').ToArray();
        return string.Join('-', new string(chars).Split('-', StringSplitOptions.RemoveEmptyEntries));
    }
}
