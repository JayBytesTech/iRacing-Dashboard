using IracingEngineer.Agent;
using IracingEngineer.Journal;
using IracingEngineer.TelemetryCore.Events;
using Xunit;

namespace IracingEngineer.Agent.Tests;

/// <summary>
/// Exercises the cross-session "best ever here" comparison logic against a real (temp-file) JournalStore:
/// which session it picks to compare against, the alone / no-detail / not-found states, and that it never
/// compares across different cars at the same track. Builds SessionDetail blobs directly — no sim, no .ibt.
/// </summary>
public class SessionCompareTests : IDisposable
{
    private readonly string _dbPath = Path.Combine(Path.GetTempPath(), $"journaltest-{Guid.NewGuid():N}.db");
    private readonly JournalStore _store;

    public SessionCompareTests() => _store = new JournalStore(_dbPath);

    public void Dispose()
    {
        if (File.Exists(_dbPath)) File.Delete(_dbPath);
    }

    // A session whose best lap is driven by a uniform speed: faster speed → lower lap time.
    private void Seed(string id, string track, string? car, double bestLapSec, double speedMps, DateTimeOffset at)
    {
        var rec = new SessionRecord
        {
            Id = id,
            CapturedAt = at,
            Track = track,
            TrackConfig = "Full",
            Car = car,
            SessionType = "Practice",
            Laps = 10,
            CleanLaps = 8,
            BestLapSec = bestLapSec,
        };
        var n = 50;
        var detail = new SessionDetail(
            TrackName: track,
            TrackConfig: "Full",
            Car: car,
            SessionType: "Practice",
            Laps: 10,
            CleanLaps: 8,
            Fuel: null,
            Coaching: null,
            Inputs: null,
            Reference: new ReferenceTrace(5, bestLapSec, 5000.0,
                SpeedMps: Enumerable.Repeat(speedMps, n).ToList(),
                Throttle: Enumerable.Repeat(0.8, n).ToList(),
                Brake: Enumerable.Repeat(0.1, n).ToList()),
            PaceLaps: Array.Empty<PaceLap>(),
            LapGaps: Array.Empty<LapGapEntry>(),
            Events: Array.Empty<RaceEvent>());
        _store.Upsert(rec, SessionDetailFactory.Serialize(detail));
    }

    [Fact]
    public void Unknown_id_is_not_found()
    {
        Assert.Equal("notFound", SessionCompare.Build(_store, "nope").Status);
    }

    [Fact]
    public void A_session_without_a_stored_reference_reports_no_detail()
    {
        // Upsert a record with no detail blob.
        _store.Upsert(new SessionRecord { Id = "x", Track = "VIR", Car = "Porsche", BestLapSec = 100 });
        Assert.Equal("noDetail", SessionCompare.Build(_store, "x").Status);
    }

    [Fact]
    public void The_only_session_at_a_track_is_alone()
    {
        Seed("a", "VIR", "Porsche", bestLapSec: 100, speedMps: 55, at: Now);
        Assert.Equal("alone", SessionCompare.Build(_store, "a").Status);
    }

    [Fact]
    public void Compares_against_the_fastest_other_session_in_the_group()
    {
        Seed("slow", "VIR", "Porsche", bestLapSec: 102, speedMps: 54, at: Now);
        Seed("pb", "VIR", "Porsche", bestLapSec: 98, speedMps: 58, at: Now.AddDays(1));
        Seed("mid", "VIR", "Porsche", bestLapSec: 100, speedMps: 56, at: Now.AddDays(2));

        var result = SessionCompare.Build(_store, "slow");
        Assert.Equal("ok", result.Status);
        var c = result.Comparison!;
        Assert.Equal("pb", c.TargetId);          // the fastest other, not just any
        Assert.False(c.ThisIsBest);
        Assert.True(c.FinalDeltaSec > 0);         // this session is slower than its best
        Assert.Equal(5, c.ThisLap);
    }

    [Fact]
    public void The_fastest_session_is_flagged_as_the_best_and_compared_to_second()
    {
        Seed("pb", "VIR", "Porsche", bestLapSec: 98, speedMps: 58, at: Now);
        Seed("slow", "VIR", "Porsche", bestLapSec: 102, speedMps: 54, at: Now.AddDays(1));

        var result = SessionCompare.Build(_store, "pb");
        Assert.Equal("ok", result.Status);
        var c = result.Comparison!;
        Assert.Equal("slow", c.TargetId);   // the best-other is the 2nd-fastest
        Assert.True(c.ThisIsBest);
        Assert.True(c.FinalDeltaSec < 0);   // this session is faster than the one it's compared to
    }

    [Fact]
    public void Never_compares_across_different_cars_at_the_same_track()
    {
        Seed("ferrari", "VIR", "Ferrari 296 GT3", bestLapSec: 100, speedMps: 56, at: Now);
        Seed("porsche", "VIR", "Porsche 911 GT3 R", bestLapSec: 99, speedMps: 57, at: Now.AddDays(1));

        // Different car → different group → each is alone despite sharing the track.
        Assert.Equal("alone", SessionCompare.Build(_store, "ferrari").Status);
        Assert.Equal("alone", SessionCompare.Build(_store, "porsche").Status);
    }

    private static DateTimeOffset Now => new(2026, 6, 1, 12, 0, 0, TimeSpan.Zero);
}
