using IracingEngineer.TelemetryCore.Events;

namespace IracingEngineer.Agent;

// Wire contract for the *full* analysis of one journal session — the data behind the in-browser
// session detail view. Computed once at capture time (see SessionDetailFactory) and stored as a JSON
// blob alongside the SessionRecord so the detail view is instant and survives the source .ibt being
// deleted. lowerCamelCase + enums-as-names via SessionDetailFactory's serializer options.

/// <summary>Everything the session-detail page renders: a fuel/stint retrospective, the driving-coach
/// summary (worst lap vs reference), the per-lap consistency table, and the event timeline.</summary>
public record SessionDetail(
    string? TrackName,
    string? TrackConfig,
    string? Car,
    string? SessionType,
    int Laps,
    int CleanLaps,
    FuelDetail? Fuel,
    CoachingSnapshot? Coaching,
    LapInputs? Inputs,
    IReadOnlyList<LapGapEntry> LapGaps,
    IReadOnlyList<RaceEvent> Events);

/// <summary>Throttle &amp; brake channels (bin-averaged 0..1, aligned bin-for-bin) for the worst
/// representative lap and the reference lap — so the coach view can overlay them and show *why* time was
/// lost (braked early/hard, lifted mid-corner). Null when there's no worst lap to compare.</summary>
public record LapInputs(
    int ReferenceLap,
    int Lap,
    IReadOnlyList<double> RefThrottle,
    IReadOnlyList<double> RefBrake,
    IReadOnlyList<double> LapThrottle,
    IReadOnlyList<double> LapBrake);

/// <summary>Retrospective fuel view: burn statistics over clean laps plus a per-stint breakdown.</summary>
public record FuelDetail(
    double? BurnPerLapMeanLiters,
    double? BurnPerLapStdevLiters,
    double? FastestLapSec,
    double? MedianLapSec,
    int CleanLaps,
    int TotalLaps,
    IReadOnlyList<StintSummary> Stints);

/// <summary>One stint (split at pit-road laps): lap range and average clean-lap burn.</summary>
public record StintSummary(int StintNo, int FromLap, int ToLap, int Laps, int CleanLaps, double? AvgBurnLiters);

/// <summary>One representative lap's gap to the driver's best — the consistency table.</summary>
public record LapGapEntry(int Lap, double LapTimeSec, double GapToBestSec);
