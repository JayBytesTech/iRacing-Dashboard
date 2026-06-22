using IracingEngineer.Coaching;
using Xunit;

namespace IracingEngineer.Coaching.Tests;

public class CoachingModelTests
{
    // A trace with a per-bin speed profile; throttle/brake zeroed (not needed by the delta math).
    private static LapTrace Trace(int lap, double lapTimeSec, double[] speed) =>
        new(lap, lapTimeSec, speed, new double[speed.Length], new double[speed.Length]);

    private static double[] Const(int bins, double v) => Enumerable.Repeat(v, bins).ToArray();

    // ---- representativeness / reference selection ------------------------------------------------

    [Theory]
    [InlineData(true, false, 90, true)]
    [InlineData(false, false, 90, false)] // invalid
    [InlineData(true, true, 90, false)]   // pit lap
    [InlineData(true, false, 0, false)]   // no lap time
    public void IsRepresentative(bool valid, bool pit, double lapTime, bool expected)
    {
        var t = Trace(1, lapTime, Const(10, 50)) with { IsValid = valid, UsedPitRoad = pit };
        Assert.Equal(expected, CoachingModel.IsRepresentative(t));
    }

    [Fact]
    public void ReferenceLap_is_the_fastest_representative_lap()
    {
        var laps = new[]
        {
            Trace(1, 105, Const(10, 50)),
            Trace(2, 101, Const(10, 50)),                                  // fastest valid
            Trace(3, 99,  Const(10, 50)) with { UsedPitRoad = true },      // faster but a pit lap -> ignored
            Trace(4, 98,  Const(10, 50)) with { IsValid = false },         // faster but invalid -> ignored
        };
        Assert.Equal(2, CoachingModel.ReferenceLap(laps)!.Lap);
    }

    [Fact]
    public void ReferenceLap_is_null_when_nothing_is_representative()
    {
        var laps = new[] { Trace(1, 100, Const(10, 50)) with { UsedPitRoad = true } };
        Assert.Null(CoachingModel.ReferenceLap(laps));
    }

    // ---- time-delta vs reference ----------------------------------------------------------------

    [Fact]
    public void Identical_laps_have_zero_delta_and_no_loss_zones()
    {
        var speed = Const(50, 50);
        var reference = Trace(1, 100, speed);
        var target = Trace(2, 100, speed);
        var d = CoachingModel.CompareToReference(target, reference, trackLengthMeters: 5000);
        Assert.Equal(0, d.FinalDeltaSec, 3);
        Assert.Empty(d.TopLossZones);
    }

    [Fact]
    public void A_slow_section_becomes_the_top_loss_zone()
    {
        // 50 bins over 5000 m -> 100 m/bin. Reference holds 50 m/s (2 s/bin) -> 100 s lap.
        // Target matches except bins 20..24 at 25 m/s (4 s/bin) -> +2 s each = +10 s, 110 s lap.
        var refSpeed = Const(50, 50);
        var tgtSpeed = Const(50, 50);
        for (var i = 20; i < 25; i++) tgtSpeed[i] = 25;

        var d = CoachingModel.CompareToReference(Trace(2, 110, tgtSpeed), Trace(1, 100, refSpeed), 5000);

        Assert.Equal(10, d.FinalDeltaSec, 3);
        Assert.Equal(1, d.ReferenceLap);
        var zone = Assert.Single(d.TopLossZones);
        Assert.Equal(0.40, zone.StartPct, 3);
        Assert.Equal(0.50, zone.EndPct, 3);
        Assert.Equal(10, zone.SecondsLost, 3);
        // Curve ends at the final delta.
        Assert.Equal(d.FinalDeltaSec, d.CumulativeDeltaSec[^1], 3);
    }

    [Fact]
    public void Loss_zones_are_ranked_worst_first_and_capped()
    {
        var refSpeed = Const(40, 50);
        var tgtSpeed = Const(40, 50);
        for (var i = 5; i < 7; i++) tgtSpeed[i] = 40;   // small loss zone
        for (var i = 20; i < 25; i++) tgtSpeed[i] = 20; // big loss zone
        var d = CoachingModel.CompareToReference(Trace(2, 130, tgtSpeed), Trace(1, 100, refSpeed), 4000, topZones: 1);
        var zone = Assert.Single(d.TopLossZones);
        Assert.Equal(0.50, zone.StartPct, 3); // the big one (bins 20..24) wins
    }

    // ---- consistency ----------------------------------------------------------------------------

    [Fact]
    public void Consistency_reports_spread_and_gaps_over_representative_laps()
    {
        var laps = new[]
        {
            Trace(1, 100, Const(10, 50)),
            Trace(2, 101, Const(10, 50)),
            Trace(3, 102, Const(10, 50)),
            Trace(4, 95,  Const(10, 50)) with { UsedPitRoad = true }, // excluded despite being fastest
        };
        var c = CoachingModel.Consistency(laps)!;
        Assert.Equal(3, c.LapCount);
        Assert.Equal(100, c.BestLapSec, 3);
        Assert.Equal(101, c.MeanLapSec, 3);
        Assert.Equal(2, c.SpreadSec, 3);
        Assert.Equal(0.816, c.StdDevSec, 3);
        Assert.Equal(new[] { 0.0, 1.0, 2.0 }, c.LapGaps.Select(g => g.GapToBestSec));
    }

    [Fact]
    public void Consistency_is_null_without_representative_laps()
    {
        var laps = new[] { Trace(1, 100, Const(10, 50)) with { IsValid = false } };
        Assert.Null(CoachingModel.Consistency(laps));
    }
}
