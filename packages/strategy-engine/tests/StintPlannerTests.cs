using IracingEngineer.Strategy.Fuel;
using Xunit;

namespace IracingEngineer.Strategy.Tests;

public class StintPlannerTests
{
    // Guardrails: nonsensical inputs return null rather than dividing by zero / planning negatives.
    [Theory]
    [InlineData(0, 50, 100, 10)]   // zero burn
    [InlineData(3, 50, 0, 10)]     // zero tank
    [InlineData(3, 50, 100, -1)]   // negative laps
    public void Plan_returns_null_for_invalid_inputs(double burn, double fuel, double tank, int laps)
    {
        Assert.Null(StintPlanner.Plan(burn, fuel, tank, laps));
    }

    [Fact]
    public void MaxLapsPerStint_is_floor_of_usable_tank_over_burn()
    {
        // 100 L usable, 3.2 L/lap -> 31.25 -> 31 laps per brimmed stint.
        var plan = StintPlanner.Plan(burnPerLapLiters: 3.2, currentFuelLiters: 100, usableTankLiters: 100, lapsToGo: 50)!;
        Assert.Equal(31, plan.MaxLapsPerStint);
    }

    [Fact]
    public void Reserve_shortens_the_stint()
    {
        // (100 - 5) / 3.2 = 29.6 -> 29 laps once a 5 L reserve must stay in.
        var plan = StintPlanner.Plan(3.2, 100, 100, 50, reserveLiters: 5)!;
        Assert.Equal(29, plan.MaxLapsPerStint);
    }

    [Fact]
    public void No_stop_needed_when_current_fuel_covers_the_race()
    {
        // 10 laps * 3 L = 30 L needed; 40 aboard -> finish without stopping.
        var plan = StintPlanner.Plan(3.0, currentFuelLiters: 40, usableTankLiters: 100, lapsToGo: 10)!;
        Assert.True(plan.CanFinishOnCurrentFuel);
        Assert.Equal(0, plan.StopsRemaining);
        Assert.Equal(0, plan.FuelToAddTotalLiters);
    }

    [Fact]
    public void One_stop_when_deficit_fits_a_single_tank()
    {
        // Need 60 laps * 3 = 180 L; aboard 90; deficit 90 <= one 100 L tank -> exactly 1 stop.
        var plan = StintPlanner.Plan(3.0, currentFuelLiters: 90, usableTankLiters: 100, lapsToGo: 60)!;
        Assert.False(plan.CanFinishOnCurrentFuel);
        Assert.Equal(1, plan.StopsRemaining);
        Assert.Equal(90, plan.FuelToAddTotalLiters);
        Assert.Equal(180, plan.TotalFuelToFinishLiters);
    }

    [Fact]
    public void Enduro_needs_multiple_stops_each_capped_at_one_tank()
    {
        // The Glen 6h case the analyze run surfaced: ~3.2 L/lap, ~104 L tank, big deficit.
        // 77 laps to go * 3.2 = 246.4 L; aboard ~89.6; deficit ~156.8; ceil(156.8/100) = 2 stops.
        var plan = StintPlanner.Plan(burnPerLapLiters: 3.2, currentFuelLiters: 89.6, usableTankLiters: 100, lapsToGo: 77)!;
        Assert.Equal(2, plan.StopsRemaining);
        Assert.False(plan.CanFinishOnCurrentFuel);
        Assert.True(plan.FuelToAddTotalLiters > 100); // more than one tank — that's why it's >1 stop
    }

    [Fact]
    public void LapsOnCurrentFuel_reports_what_the_current_load_covers()
    {
        var plan = StintPlanner.Plan(2.0, currentFuelLiters: 50, usableTankLiters: 100, lapsToGo: 200)!;
        Assert.Equal(25.0, plan.LapsOnCurrentFuel);
    }
}
