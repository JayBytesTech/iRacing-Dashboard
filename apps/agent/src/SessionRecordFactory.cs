using IracingEngineer.Coaching;
using IracingEngineer.Journal;
using IracingEngineer.Strategy.Fuel;
using IracingEngineer.TelemetryCore.Events;
using IracingEngineer.TelemetryCore.SessionInfo;

namespace IracingEngineer.Agent;

/// <summary>
/// Assembles a journal <see cref="SessionRecord"/> (auto fields only — notes stay blank) from the
/// accumulated trackers + session info. Shared by both capture paths so they produce identical records:
/// the offline <c>analyze --save</c> and the live agent's session-end auto-capture.
/// </summary>
public static class SessionRecordFactory
{
    public static SessionRecord Build(
        string id,
        string? source,
        DateTimeOffset capturedAt,
        SessionInfoData? session,
        FuelStrategyTracker fuelTracker,
        LapTraceRecorder traceRecorder,
        EventDetector? events = null)
    {
        var clean = FuelModel.CleanLaps(fuelTracker.Laps);
        var consistency = CoachingModel.Consistency(traceRecorder.Traces);
        var fuel = fuelTracker.Current;

        int? stops = null;
        if (fuel is { FuelBurnPerLapLiters: { } burn, RaceLapsToGo: { } toGo, EstimatedLapsRemaining: { } aboard }
            && session?.UsableFuelLiters is { } tank)
        {
            stops = StintPlanner.Plan(burn, aboard * burn, tank, toGo)?.StopsRemaining;
        }

        string? car = session?.PlayerCarIdx is { } idx && session.DriversByCarIdx.TryGetValue(idx, out var d)
            ? d.CarScreenName
            : null;

        return new SessionRecord
        {
            Id = id,
            CapturedAt = capturedAt,
            Track = session?.TrackDisplayName,
            TrackConfig = session?.TrackConfigName,
            Car = car,
            SessionType = session?.SessionType,
            Laps = fuelTracker.Laps.Count,
            CleanLaps = clean.Count,
            BestLapSec = consistency?.BestLapSec,
            StdDevSec = consistency?.StdDevSec,
            FuelBurnPerLapLiters = fuel.FuelBurnPerLapLiters,
            Stops = stops,
            PitStops = events?.PitStops,
            Incidents = events?.Incidents,
            Source = source,
        };
    }
}
