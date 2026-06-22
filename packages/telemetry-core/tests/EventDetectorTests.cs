using IracingEngineer.TelemetryCore.Events;
using Xunit;

namespace IracingEngineer.TelemetryCore.Tests;

public class EventDetectorTests
{
    private static EventInput F(long t, int lap, bool onPit, int inc) => new(t, lap, onPit, inc);

    [Fact]
    public void First_frame_seeds_state_and_emits_nothing()
    {
        var d = new EventDetector();
        var emitted = d.OnFrame(F(0, 1, onPit: true, inc: 3)); // already on pit, 3 incidents carried in
        Assert.Empty(emitted);
        Assert.Empty(d.Events);
        Assert.Equal(0, d.PitStops);
        Assert.Equal(0, d.Incidents); // carried-over incidents are the baseline, not counted
    }

    [Fact]
    public void Detects_pit_entry_and_exit_on_transitions()
    {
        var d = new EventDetector();
        d.OnFrame(F(0, 1, onPit: false, inc: 0));   // seed: on track
        var entry = d.OnFrame(F(1000, 2, onPit: true, inc: 0));
        var none = d.OnFrame(F(1100, 2, onPit: true, inc: 0)); // still on pit -> no new event
        var exit = d.OnFrame(F(2000, 2, onPit: false, inc: 0));

        Assert.Equal(RaceEventKind.PitEntry, Assert.Single(entry).Kind);
        Assert.Empty(none);
        var ex = Assert.Single(exit);
        Assert.Equal(RaceEventKind.PitExit, ex.Kind);
        Assert.Equal(2, ex.Lap);
        Assert.Equal(1, d.PitStops);
        Assert.Equal(2, d.Events.Count);
    }

    [Fact]
    public void Detects_incident_increases_with_delta_detail()
    {
        var d = new EventDetector();
        d.OnFrame(F(0, 1, onPit: false, inc: 0)); // seed
        var same = d.OnFrame(F(500, 1, onPit: false, inc: 0));
        var bump = d.OnFrame(F(1000, 1, onPit: false, inc: 2)); // +2x
        var bump2 = d.OnFrame(F(1500, 2, onPit: false, inc: 6)); // +4x

        Assert.Empty(same);
        var e1 = Assert.Single(bump);
        Assert.Equal(RaceEventKind.Incident, e1.Kind);
        Assert.Equal("+2x", e1.Detail);
        Assert.Equal("+4x", Assert.Single(bump2).Detail);
        Assert.Equal(6, d.Incidents);
    }

    [Fact]
    public void Ignores_missing_inputs_without_emitting()
    {
        var d = new EventDetector();
        d.OnFrame(F(0, 1, onPit: false, inc: 0));
        var emitted = d.OnFrame(new EventInput(1000, 1, OnPitRoad: null, IncidentCount: null));
        Assert.Empty(emitted);
        Assert.Empty(d.Events);
    }

    [Fact]
    public void Events_accumulate_in_chronological_order()
    {
        var d = new EventDetector();
        d.OnFrame(F(0, 1, onPit: false, inc: 0));
        d.OnFrame(F(1000, 2, onPit: false, inc: 1)); // incident
        d.OnFrame(F(2000, 3, onPit: true, inc: 1));  // pit entry
        d.OnFrame(F(3000, 3, onPit: false, inc: 1)); // pit exit

        Assert.Collection(d.Events,
            e => Assert.Equal(RaceEventKind.Incident, e.Kind),
            e => Assert.Equal(RaceEventKind.PitEntry, e.Kind),
            e => Assert.Equal(RaceEventKind.PitExit, e.Kind));
        Assert.True(d.Events[0].SessionTimeMs < d.Events[1].SessionTimeMs);
    }
}
