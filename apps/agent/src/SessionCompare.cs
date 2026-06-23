using IracingEngineer.Coaching;

namespace IracingEngineer.Agent;

/// <summary>
/// Cross-session "best ever here" comparison. Computed at *view* time (not capture) because the best lap
/// at a track changes as new sessions land. Picks the fastest *other* session at the same track+config+car
/// that has a stored reference-lap trace, then runs the same tested <see cref="CoachingModel.CompareToReference"/>
/// the live coach uses — so the detail view can show where this session's best lap gains/loses vs your PB.
/// </summary>
public static class SessionCompare
{
    public static CompareResult Build(JournalStore store, string id)
    {
        var rec = store.Get(id);
        if (rec is null) return new CompareResult("notFound", null);

        var detail = Load(store, id);
        if (detail?.Reference is not { } thisRef || thisRef.TrackLengthMeters <= 0)
            return new CompareResult("noDetail", null);

        // Fastest *other* session at the same track+config+car that has a usable reference trace.
        var candidates = store.List()
            .Where(r => r.Id != id && r.BestLapSec is not null && SameGroup(r, rec))
            .OrderBy(r => r.BestLapSec);

        foreach (var cand in candidates)
        {
            if (Load(store, cand.Id)?.Reference is not { } targetRef || targetRef.TrackLengthMeters <= 0) continue;

            var trackMeters = thisRef.TrackLengthMeters;
            var delta = CoachingModel.CompareToReference(ToLapTrace(thisRef), ToLapTrace(targetRef), trackMeters);

            var thisIsBest = rec.BestLapSec is { } b && cand.BestLapSec is { } tb && b <= tb;
            var inputs = new LapInputs(
                ReferenceLap: targetRef.Lap,
                Lap: thisRef.Lap,
                RefThrottle: targetRef.Throttle,
                RefBrake: targetRef.Brake,
                LapThrottle: thisRef.Throttle,
                LapBrake: thisRef.Brake);

            var comparison = new SessionComparison(
                TargetId: cand.Id,
                TargetCapturedAt: cand.CapturedAt.ToString("o"),
                TargetTitle: cand.DisplayTitle,
                ThisBestLapSec: rec.BestLapSec,
                TargetBestLapSec: cand.BestLapSec,
                ThisLap: thisRef.Lap,
                TargetLap: targetRef.Lap,
                FinalDeltaSec: delta.FinalDeltaSec,
                CumulativeDeltaSec: delta.CumulativeDeltaSec,
                LossZones: delta.TopLossZones.Select(z => new LossZoneSnapshot(z.StartPct, z.EndPct, z.SecondsLost)).ToList(),
                Inputs: inputs,
                ThisIsBest: thisIsBest);

            return new CompareResult("ok", comparison);
        }

        return new CompareResult("alone", null);
    }

    private static SessionDetail? Load(JournalStore store, string id) =>
        store.GetDetail(id) is { } json ? SessionDetailFactory.Deserialize(json) : null;

    private static bool SameGroup(IracingEngineer.Journal.SessionRecord a, IracingEngineer.Journal.SessionRecord b) =>
        a.Track == b.Track && a.TrackConfig == b.TrackConfig && a.Car == b.Car;

    private static LapTrace ToLapTrace(ReferenceTrace r) =>
        new(r.Lap, r.LapTimeSec, r.SpeedMps, r.Throttle, r.Brake);
}

/// <summary>Result envelope: Status is "ok" | "alone" (no other session here) | "noDetail" | "notFound".</summary>
public record CompareResult(string Status, SessionComparison? Comparison);

/// <summary>This session's best lap measured against the fastest other session at the same track+config+car.</summary>
public record SessionComparison(
    string TargetId,
    string? TargetCapturedAt,
    string? TargetTitle,
    double? ThisBestLapSec,
    double? TargetBestLapSec,
    int ThisLap,
    int TargetLap,
    double FinalDeltaSec,
    IReadOnlyList<double> CumulativeDeltaSec,
    IReadOnlyList<LossZoneSnapshot> LossZones,
    LapInputs Inputs,
    bool ThisIsBest);
