using System.Globalization;
using YamlDotNet.Serialization;

namespace IracingEngineer.TelemetryCore.SessionInfo;

/// <summary>
/// Parses the raw iRacing SessionInfo YAML string into <see cref="SessionInfoData"/>.
///
/// Design rules (per docs/bootstrap): this MUST be defensive — a malformed YAML payload returns null
/// rather than throwing, so the agent's telemetry loop is never taken down by a parse error. iRacing's
/// "YAML" is mostly standard but quirky; unmatched/extra fields are ignored.
/// </summary>
public static class SessionInfoParser
{
    private static readonly IDeserializer Deserializer = new DeserializerBuilder()
        .IgnoreUnmatchedProperties()
        .Build();

    /// <param name="yaml">Raw SessionInfo YAML string.</param>
    /// <param name="currentSessionNum">
    /// The active session number (from telemetry <c>SessionNum</c>). If null, the last session in the
    /// list is used — for a typical weekend that's the race.
    /// </param>
    public static SessionInfoData? Parse(string? yaml, int? currentSessionNum = null)
    {
        if (string.IsNullOrWhiteSpace(yaml)) return null;

        RawRoot? raw;
        try
        {
            raw = Deserializer.Deserialize<RawRoot>(yaml);
        }
        catch
        {
            return null; // never crash the agent on bad YAML
        }
        if (raw is null) return null;

        var session = SelectSession(raw.SessionInfo?.Sessions, currentSessionNum);
        var laps = ParseLapCount(session?.SessionLaps);
        var timeSec = ParseSeconds(session?.SessionTime);

        return new SessionInfoData
        {
            TrackDisplayName = raw.WeekendInfo?.TrackDisplayName ?? raw.WeekendInfo?.TrackName,
            TrackConfigName = NullIfBlankOrNone(raw.WeekendInfo?.TrackConfigName),
            TrackLengthKm = ParseKm(raw.WeekendInfo?.TrackLength),
            PlayerCarIdx = raw.DriverInfo?.DriverCarIdx,
            CurrentSessionNum = session?.SessionNum,
            SessionType = session?.SessionType,
            IsLapLimited = laps is > 0,
            SessionTotalLaps = laps,
            SessionTotalTimeSec = timeSec,
            Drivers = (raw.DriverInfo?.Drivers ?? new()).Select(MapDriver).ToList(),
        };
    }

    private static RawSession? SelectSession(List<RawSession>? sessions, int? currentSessionNum)
    {
        if (sessions is null || sessions.Count == 0) return null;
        if (currentSessionNum is { } num)
        {
            var match = sessions.FirstOrDefault(s => s.SessionNum == num);
            if (match is not null) return match;
        }
        return sessions[^1];
    }

    private static SessionDriver MapDriver(RawDriver d) => new(
        CarIdx: d.CarIdx,
        CarNumber: NullIfBlank(d.CarNumber),
        DriverName: NullIfBlank(d.UserName),
        TeamName: NullIfBlank(d.TeamName),
        ClassName: NullIfBlank(d.CarClassShortName),
        ClassId: d.CarClassID == 0 ? null : d.CarClassID,
        IsPaceCar: d.CarIsPaceCar == 1);

    // ---- value parsing -----------------------------------------------------------------------

    /// <summary>"unlimited" → null; "50" → 50. (iRacing reports SessionLaps as a string.)</summary>
    private static int? ParseLapCount(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        return int.TryParse(raw.Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var n) ? n : null;
    }

    /// <summary>"unlimited" → null; "7200.0000 sec" → 7200.0.</summary>
    private static double? ParseSeconds(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var token = raw.Trim().Split(' ')[0];
        return double.TryParse(token, NumberStyles.Float, CultureInfo.InvariantCulture, out var s) ? s : null;
    }

    /// <summary>"5.43 km" → 5.43.</summary>
    private static double? ParseKm(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var token = raw.Trim().Split(' ')[0];
        return double.TryParse(token, NumberStyles.Float, CultureInfo.InvariantCulture, out var km) ? km : null;
    }

    private static string? NullIfBlank(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    private static string? NullIfBlankOrNone(string? s) =>
        NullIfBlank(s) is { } v && !v.Equals("none", StringComparison.OrdinalIgnoreCase) ? v : null;

    // ---- raw YAML shapes (PascalCase matches iRacing keys; extras are ignored) ----------------

    private sealed class RawRoot
    {
        public RawWeekendInfo? WeekendInfo { get; set; }
        public RawDriverInfo? DriverInfo { get; set; }
        public RawSessionInfo? SessionInfo { get; set; }
    }

    private sealed class RawWeekendInfo
    {
        public string? TrackName { get; set; }
        public string? TrackDisplayName { get; set; }
        public string? TrackConfigName { get; set; }
        public string? TrackLength { get; set; }
    }

    private sealed class RawDriverInfo
    {
        public int DriverCarIdx { get; set; }
        public List<RawDriver>? Drivers { get; set; }
    }

    private sealed class RawDriver
    {
        public int CarIdx { get; set; }
        public string? UserName { get; set; }
        public string? TeamName { get; set; }
        public string? CarNumber { get; set; }
        public string? CarClassShortName { get; set; }
        public int CarClassID { get; set; }
        public int CarIsPaceCar { get; set; }
    }

    private sealed class RawSessionInfo
    {
        public List<RawSession>? Sessions { get; set; }
    }

    private sealed class RawSession
    {
        public int SessionNum { get; set; }
        public string? SessionType { get; set; }
        public string? SessionLaps { get; set; }
        public string? SessionTime { get; set; }
    }
}
