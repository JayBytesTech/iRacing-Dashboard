using System.Text.Json.Serialization;

namespace IracingEngineer.Agent;

// Wire contracts shared with the web dashboard. The JSON Schemas in
// packages/telemetry-contracts are the source of truth; these records must stay in sync with them
// (eventually code-generated). lowerCamelCase is enforced via JsonSerializerOptions in Program.cs.

/// <summary>Standard message envelope wrapping every WebSocket message.</summary>
public record Envelope<T>(
    string Type,
    string SchemaVersion,
    long Sequence,
    string Timestamp,
    string Source,
    T Payload)
{
    public static Envelope<T> Create(string type, long sequence, T payload) =>
        new(type, "0.1.0", sequence, DateTimeOffset.UtcNow.ToString("o"), "agent", payload);
}

public record LiveSnapshot(
    ConnectionState Connection,
    SessionState Session,
    CarModel Player,
    IReadOnlyList<CarModel> Cars,
    object? Strategy,
    IReadOnlyList<object> Events,
    CoachingSnapshot? Coaching = null);

/// <summary>Driving-coach summary for the dashboard: consistency + the latest lap's delta to reference.</summary>
public record CoachingSnapshot(
    int? ReferenceLap,
    int LapCount,
    double? BestLapSec,
    double? MeanLapSec,
    double? StdDevSec,
    double? SpreadSec,
    LapDeltaSnapshot? LastLap);

public record LapDeltaSnapshot(
    int Lap,
    double FinalDeltaSec,
    IReadOnlyList<double> CumulativeDeltaSec,
    IReadOnlyList<LossZoneSnapshot> LossZones);

public record LossZoneSnapshot(double StartPct, double EndPct, double SecondsLost);

public record ConnectionState(bool IracingConnected, bool? IsOnTrack, bool? IsReplayPlaying, long DataAgeMs);

public record SessionState(
    string? SessionId,
    string? TrackName,
    string? SessionType,
    int? SessionNum,
    double? TimeRemainingSec,
    int? LapsRemaining,
    string? FlagState);

public record CarModel(
    int CarIdx,
    string? CarNumber = null,
    string? DriverName = null,
    string? TeamName = null,
    string? ClassName = null,
    int? Position = null,
    int? ClassPosition = null,
    int? Lap = null,
    int? LapCompleted = null,
    double? LapDistPct = null,
    double? SpeedKph = null,
    int? Gear = null,
    double? Rpm = null,
    double? FuelLevelLiters = null,
    bool? OnPitRoad = null,
    string? TrackSurface = null,
    bool? IsPlayer = null);
