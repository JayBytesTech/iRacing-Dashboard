namespace IracingEngineer.Strategy.Fuel;

/// <summary>
/// Tank-capacity-aware stint planning — the enduro counterpart to <see cref="FuelModel"/>'s
/// single-tank fuel estimate. Where the fuel estimate answers "can I reach the finish on what's
/// aboard?", this answers "over a race longer than one tank, how many more stops, and how long is a
/// full stint?". Pure and deterministic; all inputs are already-derived numbers (litres, laps).
/// </summary>
public static class StintPlanner
{
    /// <param name="burnPerLapLiters">Average clean-lap burn (from <see cref="FuelModel"/>).</param>
    /// <param name="currentFuelLiters">Fuel aboard right now.</param>
    /// <param name="usableTankLiters">Physical tank × max-fill rule (SessionInfo.UsableFuelLiters).</param>
    /// <param name="lapsToGo">Race laps still to run (given, or derived from time ÷ avg lap).</param>
    /// <param name="reserveLiters">Litres to still have in the tank when you take the flag.</param>
    public static StintPlan? Plan(
        double burnPerLapLiters,
        double currentFuelLiters,
        double usableTankLiters,
        int lapsToGo,
        double reserveLiters = 0.0)
    {
        if (burnPerLapLiters <= 0 || usableTankLiters <= 0 || lapsToGo < 0) return null;

        // A full green stint on a brimmed tank, leaving the reserve in at the end of that stint's fuel.
        var maxLapsPerStint = (int)Math.Floor((usableTankLiters - reserveLiters) / burnPerLapLiters);
        if (maxLapsPerStint < 0) maxLapsPerStint = 0;

        var totalToFinish = lapsToGo * burnPerLapLiters + reserveLiters;
        var deficit = totalToFinish - currentFuelLiters;

        // Each additional stop can take on at most a full usable tank, so the minimum number of stops
        // to make up the deficit is ceil(deficit / usableTank). Zero if we can already reach the end.
        var stops = deficit <= 0 ? 0 : (int)Math.Ceiling(deficit / usableTankLiters);

        return new StintPlan
        {
            MaxLapsPerStint = maxLapsPerStint,
            StopsRemaining = stops,
            CanFinishOnCurrentFuel = stops == 0,
            FuelToAddTotalLiters = Math.Round(Math.Max(0, deficit), 2),
            TotalFuelToFinishLiters = Math.Round(totalToFinish, 2),
            LapsOnCurrentFuel = Math.Round(currentFuelLiters / burnPerLapLiters, 2),
        };
    }
}

/// <summary>
/// A tank-aware plan for the rest of a race that may span several tanks. Distinct from
/// <see cref="FuelEstimate"/>, which only describes the current tank.
/// </summary>
public sealed record StintPlan
{
    /// <summary>Laps a brimmed tank covers (minus reserve). The length of a flat-out green stint.</summary>
    public int MaxLapsPerStint { get; init; }
    /// <summary>Minimum further fuel stops needed to reach the finish.</summary>
    public int StopsRemaining { get; init; }
    /// <summary>True when the finish is reachable on the fuel currently aboard (no more stops).</summary>
    public bool CanFinishOnCurrentFuel { get; init; }
    /// <summary>Total litres still to be taken on across all remaining stops (+reserve). Never negative.</summary>
    public double FuelToAddTotalLiters { get; init; }
    /// <summary>Total litres the rest of the race consumes (+reserve), regardless of stops.</summary>
    public double TotalFuelToFinishLiters { get; init; }
    /// <summary>Laps the current fuel load alone will cover.</summary>
    public double LapsOnCurrentFuel { get; init; }
}
