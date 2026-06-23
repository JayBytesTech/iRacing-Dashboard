using IracingEngineer.Agent;
using IracingEngineer.Strategy.Fuel;
using IracingEngineer.TelemetryCore.Events;
using IracingEngineer.TelemetryCore.SessionInfo;
using Xunit;

namespace IracingEngineer.Agent.Tests;

/// <summary>
/// Drives a synthetic multi-lap session through the same trackers the live agent uses, then asserts the
/// captured <see cref="SessionDetail"/> — stints split at pit laps, the per-lap pace list, the reference
/// (best) lap stored in full, and the worst-lap coaching + input channels. Runs on Linux, no sim.
/// </summary>
public class SessionDetailFactoryTests
{
    // Four laps: a clean lap, a pit lap (stint boundary), then two more clean laps. Lap 3 is the
    // fastest (reference) and lap 4 the slowest clean lap (the one the coach dissects).
    private static readonly (long DurMs, bool Pit)[] Laps =
    {
        (100_000, false), // lap 1 — clean, 100.0s
        (130_000, true),  // lap 2 — pit in-lap, 130.0s (closes stint 1)
        (99_000, false),  // lap 3 — clean, 99.0s  → fastest → reference
        (101_000, false), // lap 4 — clean, 101.0s → slowest clean → worst
    };

    private static SessionDetail Build()
    {
        var fuel = new FuelStrategyTracker();
        var trace = new LapTraceRecorder();
        var events = new EventDetector();

        void Feed(TelemetryFrame f)
        {
            fuel.OnFrame(f, new RaceRemaining());
            trace.OnFrame(f);
            events.OnFrame(new EventInput(f.SessionTimeMs, f.Lap, f.OnPitRoad, f.IncidentCount));
        }

        long t = 0;
        double fuelLevel = 100.0;
        var lapCompleted = 0;
        Feed(Frame(t, lapCompleted, 0.0, fuelLevel, pit: false)); // first observation → starts tracking

        foreach (var (dur, pit) in Laps)
        {
            // Frames across the lap populate the trace bins; pit laps flag on-pit-road mid-lap.
            for (var i = 1; i <= 5; i++)
                Feed(Frame(t + dur * i / 6, lapCompleted, i / 6.0, fuelLevel, pit));

            // Boundary frame completes the lap (LapCompleted increments) and starts the next.
            t += dur;
            fuelLevel -= 3.0;
            lapCompleted++;
            Feed(Frame(t, lapCompleted, 0.0, fuelLevel, pit: false));
        }

        var session = new SessionInfoData
        {
            TrackDisplayName = "Watkins Glen",
            TrackConfigName = "Boot",
            SessionType = "Practice",
            TrackLengthKm = 5.0, // 5000 m — needed to locate time-loss zones
            PlayerCarIdx = 0,
            Drivers = new[] { new SessionDriver(0, "1", "Player", null, "GT3", 100, false, "Ferrari 296 GT3") },
        };
        return SessionDetailFactory.Build(session, fuel, trace, events);
    }

    [Fact]
    public void Captures_every_lap_with_clean_and_pit_flags()
    {
        var d = Build();
        Assert.Equal(4, d.PaceLaps.Count);
        Assert.Equal(new[] { 1, 2, 3, 4 }, d.PaceLaps.Select(l => l.Lap));
        Assert.True(d.PaceLaps[0].Clean);
        Assert.True(d.PaceLaps[1].UsedPitRoad);
        Assert.False(d.PaceLaps[1].Clean); // pit lap is never clean
        Assert.True(d.PaceLaps[2].Clean);
        Assert.True(d.PaceLaps[3].Clean);
    }

    [Fact]
    public void Splits_stints_at_pit_laps()
    {
        var d = Build();
        Assert.NotNull(d.Fuel);
        Assert.Equal(2, d.Fuel!.Stints.Count);
        Assert.Equal((1, 2), (d.Fuel.Stints[0].FromLap, d.Fuel.Stints[0].ToLap));
        Assert.Equal((3, 4), (d.Fuel.Stints[1].FromLap, d.Fuel.Stints[1].ToLap));
    }

    [Fact]
    public void Coaches_the_slowest_clean_lap_against_the_fastest()
    {
        var d = Build();
        Assert.NotNull(d.Coaching);
        Assert.Equal(3, d.Coaching!.ReferenceLap);     // lap 3 is fastest
        Assert.Equal(4, d.Coaching.LastLap?.Lap);      // lap 4 is the slowest clean lap
    }

    [Fact]
    public void Stores_the_reference_lap_in_full_for_cross_session_compare()
    {
        var d = Build();
        Assert.NotNull(d.Reference);
        Assert.Equal(3, d.Reference!.Lap);
        Assert.Equal(5000.0, d.Reference.TrackLengthMeters);
        Assert.Equal(100, d.Reference.SpeedMps.Count); // resampled onto the fixed bin grid
        Assert.Equal(100, d.Reference.Throttle.Count);
    }

    [Fact]
    public void Carries_throttle_brake_inputs_for_the_overlay()
    {
        var d = Build();
        Assert.NotNull(d.Inputs);
        Assert.Equal(3, d.Inputs!.ReferenceLap);
        Assert.Equal(4, d.Inputs.Lap);
        Assert.Equal(100, d.Inputs.LapThrottle.Count);
        Assert.Equal(100, d.Inputs.RefThrottle.Count);
    }

    [Fact]
    public void Detects_the_pit_stop_in_the_event_timeline()
    {
        var d = Build();
        Assert.Contains(d.Events, e => e.Kind == RaceEventKind.PitEntry);
    }

    private static TelemetryFrame Frame(long ms, int lapCompleted, double dist, double fuel, bool pit) => new(
        SessionTimeMs: ms,
        IsOnTrack: true,
        IsReplayPlaying: false,
        Speed: 50.0,
        Gear: 4,
        Rpm: 7000,
        Throttle: 0.8,
        Brake: 0.1,
        Lat: null,
        Lon: null,
        FuelLevel: fuel,
        Lap: lapCompleted + 1,
        LapCompleted: lapCompleted,
        LapDistPct: dist,
        OnPitRoad: pit,
        IncidentCount: 0,
        SessionLapsRemaining: null,
        SessionTimeRemainingSec: null,
        SessionNum: 0,
        CarIdxPosition: null,
        CarIdxClassPosition: null,
        CarIdxLap: null,
        CarIdxLapDistPct: null,
        CarIdxOnPitRoad: null);
}
