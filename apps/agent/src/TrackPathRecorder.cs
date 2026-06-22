namespace IracingEngineer.Agent;

/// <summary>One completed lap's GPS centerline, binned by lap-distance.</summary>
public sealed record TrackLap(int Lap, double LapTimeSec, double[] Lat, double[] Lon, bool UsedPitRoad);

/// <summary>
/// Records each lap's GPS (Lat/Lon) into fixed lap-distance bins so a clean lap yields the track's real
/// centerline. Same transition-detection pattern as the other recorders; used by the <c>maptrack</c>
/// exporter to build geographic track-map assets from an .ibt — no copyrighted track files needed.
/// </summary>
public sealed class TrackPathRecorder
{
    private readonly int _bins;
    private readonly List<TrackLap> _laps = new();

    private int? _lastLapCompleted;
    private long _lapStartMs;
    private bool _pitDuringLap;
    private double[] _latSum;
    private double[] _lonSum;
    private int[] _count;

    public TrackPathRecorder(int bins = 240)
    {
        _bins = bins;
        _latSum = new double[bins];
        _lonSum = new double[bins];
        _count = new int[bins];
    }

    public IReadOnlyList<TrackLap> Laps => _laps;

    public void OnFrame(TelemetryFrame f)
    {
        if (f.OnPitRoad == true) _pitDuringLap = true;

        if (f.LapCompleted is { } completed)
        {
            if (_lastLapCompleted is null) StartLap(f);
            else if (completed > _lastLapCompleted)
            {
                RecordLap(completed, f);
                StartLap(f);
            }
        }

        if (f.LapDistPct is { } pct && pct >= 0 && f.Lat is { } lat && f.Lon is { } lon)
        {
            var bin = Math.Clamp((int)(pct * _bins), 0, _bins - 1);
            _latSum[bin] += lat;
            _lonSum[bin] += lon;
            _count[bin]++;
        }
    }

    private void RecordLap(int lap, TelemetryFrame f)
    {
        var lapTimeSec = (f.SessionTimeMs - _lapStartMs) / 1000.0;
        if (lapTimeSec <= 0) return;
        var lat = Densify(_latSum, _count);
        var lon = Densify(_lonSum, _count);
        if (lat is null || lon is null) return;
        _laps.Add(new TrackLap(lap, lapTimeSec, lat, lon, _pitDuringLap));
    }

    private void StartLap(TelemetryFrame f)
    {
        _lastLapCompleted = f.LapCompleted;
        _lapStartMs = f.SessionTimeMs;
        _pitDuringLap = f.OnPitRoad == true;
        Array.Clear(_latSum);
        Array.Clear(_lonSum);
        Array.Clear(_count);
    }

    // Average each bin; forward/back-fill empty bins so the centerline has no gaps. Null if no samples.
    private double[]? Densify(double[] sum, int[] count)
    {
        var outp = new double[_bins];
        var last = double.NaN;
        for (var i = 0; i < _bins; i++)
        {
            if (count[i] > 0) { outp[i] = sum[i] / count[i]; last = outp[i]; }
            else outp[i] = last;
        }
        var firstKnown = Array.FindIndex(outp, v => !double.IsNaN(v));
        if (firstKnown < 0) return null;
        for (var i = 0; i < firstKnown; i++) outp[i] = outp[firstKnown];
        return outp;
    }
}
