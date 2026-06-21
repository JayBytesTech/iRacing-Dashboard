using IracingEngineer.Strategy.Fuel;
using Xunit;

namespace IracingEngineer.Strategy.Tests;

public class FuelModelTests
{
    // Helper: a clean lap burning a given amount of fuel at a given lap time.
    private static LapRecord Clean(int lap, double fuel, double time = 100) => new(lap, fuel, time);

    // ---- Clean-lap filter -----------------------------------------------------------------------

    [Fact]
    public void IsCleanLap_accepts_a_normal_racing_lap()
    {
        Assert.True(FuelModel.IsCleanLap(Clean(5, 2.6)));
    }

    [Theory]
    [MemberData(nameof(DirtyLaps))]
    public void IsCleanLap_rejects_disqualified_laps(LapRecord lap)
    {
        Assert.False(FuelModel.IsCleanLap(lap));
    }

    public static IEnumerable<object[]> DirtyLaps() => new[]
    {
        new object[] { Clean(1, 2.6) with { UsedPitRoad = true } },
        new object[] { Clean(1, 2.6) with { IsOutLap = true } },
        new object[] { Clean(1, 2.6) with { IsInLap = true } },
        new object[] { Clean(1, 2.6) with { IsValid = false } },
        new object[] { Clean(1, 2.6) with { UnderCaution = true } },
        new object[] { Clean(1, 2.6) with { FuelIncreased = true } },
        new object[] { Clean(1, 0.0) },          // no burn recorded
        new object[] { new LapRecord(1, 2.6, 0) }, // no lap time
    };

    [Fact]
    public void CleanLaps_filters_out_pit_and_invalid_laps()
    {
        var laps = new[]
        {
            Clean(1, 3.0) with { IsOutLap = true },
            Clean(2, 2.6),
            Clean(3, 2.6) with { UsedPitRoad = true },
            Clean(4, 2.7),
        };
        Assert.Equal(2, FuelModel.CleanLaps(laps).Count);
    }

    // ---- Burn average ---------------------------------------------------------------------------

    [Fact]
    public void AverageBurnPerLap_uses_only_the_last_N_clean_laps()
    {
        var laps = new[] { Clean(1, 4.0), Clean(2, 2.0), Clean(3, 2.0), Clean(4, 2.0) };
        // window of 3 ignores the 4.0 outlier on lap 1 -> average of last three 2.0s
        Assert.Equal(2.0, FuelModel.AverageBurnPerLap(FuelModel.CleanLaps(laps), window: 3));
    }

    [Fact]
    public void AverageBurnPerLap_is_null_with_no_clean_laps()
    {
        Assert.Null(FuelModel.AverageBurnPerLap(new List<LapRecord>(), window: 5));
    }

    // ---- Confidence -----------------------------------------------------------------------------

    [Fact]
    public void Confidence_is_low_with_fewer_than_three_laps()
    {
        var laps = FuelModel.CleanLaps(new[] { Clean(1, 2.6), Clean(2, 2.6) });
        Assert.Equal(FuelConfidence.Low, FuelModel.ComputeConfidence(laps, new FuelOptions()));
    }

    [Fact]
    public void Confidence_is_medium_with_three_to_five_stable_laps()
    {
        var laps = FuelModel.CleanLaps(new[] { Clean(1, 2.60), Clean(2, 2.61), Clean(3, 2.59) });
        Assert.Equal(FuelConfidence.Medium, FuelModel.ComputeConfidence(laps, new FuelOptions()));
    }

    [Fact]
    public void Confidence_is_high_with_six_plus_stable_laps()
    {
        var laps = FuelModel.CleanLaps(Enumerable.Range(1, 6).Select(i => Clean(i, 2.60)).ToArray());
        Assert.Equal(FuelConfidence.High, FuelModel.ComputeConfidence(laps, new FuelOptions()));
    }

    [Fact]
    public void Confidence_is_capped_when_burn_is_volatile()
    {
        // Six laps (would be High) but burn swings wildly -> volatility pulls it down.
        var laps = FuelModel.CleanLaps(new[]
        {
            Clean(1, 2.0), Clean(2, 3.2), Clean(3, 2.1), Clean(4, 3.3), Clean(5, 2.0), Clean(6, 3.4),
        });
        Assert.Equal(FuelConfidence.Medium, FuelModel.ComputeConfidence(laps, new FuelOptions()));
    }

    // ---- Full estimate: race by laps ------------------------------------------------------------

    [Fact]
    public void Estimate_computes_burn_laps_remaining_and_fuel_to_finish()
    {
        var laps = Enumerable.Range(1, 5).Select(i => Clean(i, 2.5)).ToList();
        var est = FuelModel.Estimate(laps, currentFuelLiters: 25.0, new RaceRemaining(LapsRemaining: 8));

        Assert.Equal(2.5, est.FuelBurnPerLapLiters);
        Assert.Equal(10.0, est.EstimatedLapsRemaining); // 25 / 2.5
        Assert.Equal(8, est.RaceLapsToGo);
        Assert.Equal(20.0, est.FuelToFinishLiters);      // 8 * 2.5
        Assert.Equal(5.0, est.FuelDeltaToFinishLiters);  // 25 - 20, we have enough
        Assert.Equal(0.0, est.FuelToAddAtNextStopLiters); // nothing to add
        Assert.False(est.PitWindowOpen);
        Assert.Equal(FuelStatus.Safe, est.Status);
    }

    [Fact]
    public void Estimate_flags_pit_required_and_fuel_to_add_when_short()
    {
        var laps = Enumerable.Range(1, 5).Select(i => Clean(i, 2.5)).ToList();
        // 10 L aboard = 4 laps, but 12 laps to go.
        var est = FuelModel.Estimate(laps, currentFuelLiters: 10.0, new RaceRemaining(LapsRemaining: 12));

        Assert.Equal(4.0, est.EstimatedLapsRemaining);
        Assert.Equal(30.0, est.FuelToFinishLiters);       // 12 * 2.5
        Assert.Equal(-20.0, est.FuelDeltaToFinishLiters);  // short by 20 L
        Assert.Equal(20.0, est.FuelToAddAtNextStopLiters);
        Assert.True(est.PitWindowOpen);
        Assert.Equal(FuelStatus.PitRequired, est.Status);
    }

    [Fact]
    public void Estimate_reports_critical_when_about_to_run_dry()
    {
        var laps = Enumerable.Range(1, 5).Select(i => Clean(i, 2.5)).ToList();
        // 3 L aboard = 1.2 laps -> under the 2-lap low-fuel threshold.
        var est = FuelModel.Estimate(laps, currentFuelLiters: 3.0, new RaceRemaining(LapsRemaining: 10));
        Assert.Equal(FuelStatus.Critical, est.Status);
    }

    [Fact]
    public void Estimate_reports_marginal_inside_the_safety_margin()
    {
        var laps = Enumerable.Range(1, 5).Select(i => Clean(i, 2.0)).ToList();
        // 16.5 L = 8.25 laps aboard, 8 to go -> 0.25 lap headroom, under the 1-lap margin.
        var est = FuelModel.Estimate(laps, currentFuelLiters: 16.5, new RaceRemaining(LapsRemaining: 8));
        Assert.Equal(FuelStatus.Marginal, est.Status);
    }

    [Fact]
    public void Estimate_honors_a_fuel_reserve_when_computing_fuel_to_add()
    {
        var laps = Enumerable.Range(1, 5).Select(i => Clean(i, 2.5)).ToList();
        var opts = new FuelOptions { ReserveLiters = 2.0 };
        var est = FuelModel.Estimate(laps, currentFuelLiters: 10.0, new RaceRemaining(LapsRemaining: 12), opts);
        Assert.Equal(22.0, est.FuelToAddAtNextStopLiters); // 30 needed + 2 reserve - 10 aboard
    }

    // ---- Full estimate: race by time ------------------------------------------------------------

    [Fact]
    public void Estimate_converts_remaining_time_to_laps_using_average_lap_time()
    {
        var laps = Enumerable.Range(1, 5).Select(i => Clean(i, 2.5, time: 100)).ToList();
        // 650 s remaining / 100 s avg lap = 6.5 -> ceil to 7 laps to go.
        var est = FuelModel.Estimate(laps, currentFuelLiters: 25.0, new RaceRemaining(TimeRemainingSec: 650));
        Assert.Equal(7, est.RaceLapsToGo);
        Assert.Equal(17.5, est.FuelToFinishLiters); // 7 * 2.5
    }

    // ---- Degenerate inputs ----------------------------------------------------------------------

    [Fact]
    public void Estimate_returns_unknown_without_enough_clean_laps()
    {
        var est = FuelModel.Estimate(new List<LapRecord>(), 50.0, new RaceRemaining(LapsRemaining: 10));
        Assert.Equal(FuelEstimate.Unknown.Status, est.Status);
        Assert.Null(est.FuelBurnPerLapLiters);
    }

    [Fact]
    public void Estimate_with_known_burn_but_unknown_race_length_still_gives_laps_aboard()
    {
        var laps = Enumerable.Range(1, 5).Select(i => Clean(i, 2.5)).ToList();
        var est = FuelModel.Estimate(laps, currentFuelLiters: 25.0, new RaceRemaining());
        Assert.Equal(10.0, est.EstimatedLapsRemaining);
        Assert.Null(est.RaceLapsToGo);
        Assert.Null(est.FuelToFinishLiters);
    }
}
