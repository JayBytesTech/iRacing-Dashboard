using IracingEngineer.Coaching;

namespace IracingEngineer.Agent;

/// <summary>
/// Stateful bridge between the live telemetry stream and the pure <see cref="CoachingModel"/>. It bins
/// each lap's frames by lap-distance into fixed-length speed/throttle/brake arrays and emits a
/// <see cref="LapTrace"/> when the lap completes. Same transition-detection pattern as
/// <see cref="FuelStrategyTracker"/>; all the analysis lives in the tested coaching package.
/// </summary>
public sealed class LapTraceRecorder
{
    private readonly int _bins;
    private readonly List<LapTrace> _traces = new();

    private int? _lastLapCompleted;
    private long _lapStartMs;
    private bool _pitDuringLap;

    private double[] _speedSum;
    private double[] _thrSum;
    private double[] _brkSum;
    private int[] _count;

    public LapTraceRecorder(int bins = 100)
    {
        _bins = bins;
        _speedSum = new double[bins];
        _thrSum = new double[bins];
        _brkSum = new double[bins];
        _count = new int[bins];
    }

    /// <summary>Completed lap traces, in order. Exposed for offline analysis and (later) the dashboard.</summary>
    public IReadOnlyList<LapTrace> Traces => _traces;

    public void OnFrame(TelemetryFrame f)
    {
        if (f.OnPitRoad == true) _pitDuringLap = true;

        // Handle the lap boundary first so the current frame lands in the new lap's bins.
        if (f.LapCompleted is { } completed)
        {
            if (_lastLapCompleted is null) StartLap(f);
            else if (completed > _lastLapCompleted)
            {
                RecordLap(completed, f);
                StartLap(f);
            }
        }

        Accumulate(f);
    }

    private void Accumulate(TelemetryFrame f)
    {
        if (f.LapDistPct is not { } pct || pct < 0 || f.Speed is not { } speed) return;
        var bin = Math.Clamp((int)(pct * _bins), 0, _bins - 1);
        _speedSum[bin] += speed;
        _thrSum[bin] += f.Throttle ?? 0;
        _brkSum[bin] += f.Brake ?? 0;
        _count[bin]++;
    }

    private void RecordLap(int lap, TelemetryFrame f)
    {
        var lapTimeSec = (f.SessionTimeMs - _lapStartMs) / 1000.0;
        if (lapTimeSec <= 0) return;

        var speed = Densify(_speedSum, _count);
        if (speed is null) return; // no usable samples this lap — skip
        var throttle = Densify(_thrSum, _count) ?? new double[_bins];
        var brake = Densify(_brkSum, _count) ?? new double[_bins];

        _traces.Add(new LapTrace(lap, lapTimeSec, speed, throttle, brake) { UsedPitRoad = _pitDuringLap });
    }

    private void StartLap(TelemetryFrame f)
    {
        _lastLapCompleted = f.LapCompleted;
        _lapStartMs = f.SessionTimeMs;
        _pitDuringLap = f.OnPitRoad == true;
        Array.Clear(_speedSum);
        Array.Clear(_thrSum);
        Array.Clear(_brkSum);
        Array.Clear(_count);
    }

    /// <summary>
    /// Average each bin, then forward/back-fill empty bins so a gap never reads as zero speed (which
    /// would manufacture a fake time loss). Returns null if the lap produced no samples at all.
    /// </summary>
    private double[]? Densify(double[] sum, int[] count)
    {
        var outp = new double[_bins];
        var last = double.NaN;
        for (var i = 0; i < _bins; i++)
        {
            if (count[i] > 0) { outp[i] = sum[i] / count[i]; last = outp[i]; }
            else outp[i] = last; // forward-fill from the previous known bin
        }
        // Back-fill any leading empty bins with the first known value.
        var firstKnown = Array.FindIndex(outp, v => !double.IsNaN(v));
        if (firstKnown < 0) return null;
        for (var i = 0; i < firstKnown; i++) outp[i] = outp[firstKnown];
        return outp;
    }
}
