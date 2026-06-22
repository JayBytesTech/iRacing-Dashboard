namespace IracingEngineer.TelemetryCore.Events;

/// <summary>One frame's worth of the inputs the detector watches. Decoupled from the agent's
/// telemetry frame so this stays a pure, testable library with no iRacing dependency.</summary>
/// <param name="SessionTimeMs">Session time in ms.</param>
/// <param name="Lap">Player lap number (null if unknown).</param>
/// <param name="OnPitRoad">Whether the player is on pit road this frame.</param>
/// <param name="IncidentCount">The player's cumulative session incident count (the "x" total).</param>
public readonly record struct EventInput(long SessionTimeMs, int? Lap, bool? OnPitRoad, int? IncidentCount);

/// <summary>
/// Turns the player's per-frame telemetry into a stream of discrete <see cref="RaceEvent"/>s by watching
/// for edges: pit-road crossings and increases in the incident count. Stateful and single-session — the
/// agent creates a fresh one per session (like the fuel/coach trackers). First frame only seeds the
/// baseline so a session that starts on pit road or with carried-over incidents doesn't emit a phantom
/// event. Pure: no I/O, no iRacing types, so it's unit-tested on Linux without the sim.
/// </summary>
public sealed class EventDetector
{
    private bool? _lastOnPitRoad;
    private int? _lastIncidentCount;
    private readonly List<RaceEvent> _events = new();

    /// <summary>All events detected so far, in chronological order.</summary>
    public IReadOnlyList<RaceEvent> Events => _events;

    /// <summary>How many times the player entered pit road (≈ pit stops).</summary>
    public int PitStops { get; private set; }

    /// <summary>Total incident points accrued this session (latest count minus the session baseline).</summary>
    public int Incidents { get; private set; }

    /// <summary>Feed one frame. Returns any events newly detected on this frame (also appended to <see cref="Events"/>).</summary>
    public IReadOnlyList<RaceEvent> OnFrame(EventInput f)
    {
        var emitted = new List<RaceEvent>(2);

        // Pit-road edges. Only fire on a real transition (skip the seeding frame where last is null).
        if (f.OnPitRoad is { } onPit)
        {
            if (_lastOnPitRoad is { } wasOnPit && onPit != wasOnPit)
            {
                if (onPit) { PitStops++; emitted.Add(new RaceEvent(f.SessionTimeMs, f.Lap, RaceEventKind.PitEntry)); }
                else emitted.Add(new RaceEvent(f.SessionTimeMs, f.Lap, RaceEventKind.PitExit));
            }
            _lastOnPitRoad = onPit;
        }

        // Incident edges: emit when the cumulative count rises, tagged with the delta ("+2x"). The first
        // frame just seeds the baseline (so carried-over incidents from before the capture don't count).
        if (f.IncidentCount is { } inc)
        {
            if (_lastIncidentCount is { } wasInc && inc > wasInc)
            {
                var delta = inc - wasInc;
                Incidents += delta;
                emitted.Add(new RaceEvent(f.SessionTimeMs, f.Lap, RaceEventKind.Incident, $"+{delta}x"));
            }
            _lastIncidentCount = inc;
        }

        _events.AddRange(emitted);
        return emitted;
    }
}
