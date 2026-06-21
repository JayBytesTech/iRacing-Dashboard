using IracingEngineer.TelemetryCore.SessionInfo;
using Xunit;

namespace IracingEngineer.TelemetryCore.Tests;

public class SessionInfoParserTests
{
    // A trimmed but structurally realistic iRacing SessionInfo YAML: a practice + a lap-limited race,
    // a pace car, the player team car, and a rival in a different class.
    private const string LapRaceYaml = """
        ---
        WeekendInfo:
         TrackName: watkinsglen full
         TrackDisplayName: Watkins Glen International
         TrackConfigName: Boot
         TrackLength: 5.43 km
         NumCarClasses: 2
        DriverInfo:
         DriverCarIdx: 12
         Drivers:
         - CarIdx: 0
           UserName: Pace Car
           TeamName:
           CarNumber: "0"
           CarClassShortName:
           CarClassID: 0
           CarIsPaceCar: 1
         - CarIdx: 12
           UserName: Jay Tester
           TeamName: JayBytes Racing
           CarNumber: "42"
           CarClassShortName: GT3
           CarClassID: 2708
           CarIsPaceCar: 0
         - CarIdx: 7
           UserName: Rival Driver
           TeamName: Rival Team
           CarNumber: "7"
           CarClassShortName: GTP
           CarClassID: 4011
           CarIsPaceCar: 0
        SessionInfo:
         Sessions:
         - SessionNum: 0
           SessionType: Practice
           SessionLaps: unlimited
           SessionTime: unlimited
         - SessionNum: 1
           SessionType: Race
           SessionLaps: 50
           SessionTime: unlimited
        """;

    private const string TimedRaceYaml = """
        ---
        WeekendInfo:
         TrackDisplayName: Sebring International Raceway
         TrackLength: 6.02 km
        DriverInfo:
         DriverCarIdx: 3
         Drivers:
         - CarIdx: 3
           UserName: Jay Tester
           CarNumber: "3"
           CarClassShortName: GT3
           CarClassID: 2708
           CarIsPaceCar: 0
        SessionInfo:
         Sessions:
         - SessionNum: 0
           SessionType: Race
           SessionLaps: unlimited
           SessionTime: 7200.0000 sec
        """;

    [Fact]
    public void Parse_extracts_track_and_player_car()
    {
        var data = SessionInfoParser.Parse(LapRaceYaml);
        Assert.NotNull(data);
        Assert.Equal("Watkins Glen International", data!.TrackDisplayName);
        Assert.Equal("Boot", data.TrackConfigName);
        Assert.Equal(5.43, data.TrackLengthKm);
        Assert.Equal(12, data.PlayerCarIdx);
    }

    [Fact]
    public void Parse_selects_the_last_session_by_default()
    {
        var data = SessionInfoParser.Parse(LapRaceYaml);
        Assert.Equal("Race", data!.SessionType);
        Assert.Equal(1, data.CurrentSessionNum);
    }

    [Fact]
    public void Parse_selects_the_active_session_when_given_a_session_number()
    {
        var data = SessionInfoParser.Parse(LapRaceYaml, currentSessionNum: 0);
        Assert.Equal("Practice", data!.SessionType);
        Assert.False(data.IsLapLimited);
    }

    [Fact]
    public void Parse_detects_a_lap_limited_race()
    {
        var data = SessionInfoParser.Parse(LapRaceYaml);
        Assert.True(data!.IsLapLimited);
        Assert.Equal(50, data.SessionTotalLaps);
        Assert.Null(data.SessionTotalTimeSec);
    }

    [Fact]
    public void Parse_detects_a_time_limited_race_and_reads_seconds()
    {
        var data = SessionInfoParser.Parse(TimedRaceYaml);
        Assert.False(data!.IsLapLimited);
        Assert.Null(data.SessionTotalLaps);
        Assert.Equal(7200.0, data.SessionTotalTimeSec);
    }

    [Fact]
    public void Parse_reads_the_full_driver_roster_with_classes()
    {
        var data = SessionInfoParser.Parse(LapRaceYaml);
        Assert.Equal(3, data!.Drivers.Count);

        var player = data.DriversByCarIdx[12];
        Assert.Equal("Jay Tester", player.DriverName);
        Assert.Equal("JayBytes Racing", player.TeamName);
        Assert.Equal("42", player.CarNumber);
        Assert.Equal("GT3", player.ClassName);
        Assert.Equal(2708, player.ClassId);
        Assert.False(player.IsPaceCar);
    }

    [Fact]
    public void Parse_flags_the_pace_car_and_blanks_its_empty_fields()
    {
        var data = SessionInfoParser.Parse(LapRaceYaml);
        var pace = data!.DriversByCarIdx[0];
        Assert.True(pace.IsPaceCar);
        Assert.Null(pace.TeamName);   // empty YAML value normalizes to null
        Assert.Null(pace.ClassName);
        Assert.Null(pace.ClassId);    // CarClassID 0 -> null
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("this: is: not: valid: yaml: : :")]
    [InlineData("just a scalar")]
    public void Parse_never_throws_on_bad_input(string? badYaml)
    {
        var ex = Record.Exception(() => SessionInfoParser.Parse(badYaml));
        Assert.Null(ex); // returns null or a benign object, but must not crash the agent
    }
}
