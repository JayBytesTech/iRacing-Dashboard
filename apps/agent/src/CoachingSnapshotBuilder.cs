using IracingEngineer.Coaching;

namespace IracingEngineer.Agent;

/// <summary>
/// Projects the pure <see cref="CoachingModel"/> outputs onto the wire <see cref="CoachingSnapshot"/>
/// the dashboard consumes. Summarizes consistency and compares the most recent completed lap against
/// the driver's reference lap so the UI can draw a delta trace + time-loss zones.
/// </summary>
public static class CoachingSnapshotBuilder
{
    public static CoachingSnapshot? Build(IReadOnlyList<LapTrace> traces, double trackLengthMeters)
    {
        var consistency = CoachingModel.Consistency(traces);
        var reference = CoachingModel.ReferenceLap(traces);
        if (consistency is null || reference is null) return null;

        // Coach the most recent representative lap (the one the driver just finished).
        LapDeltaSnapshot? lastLap = null;
        var latest = traces.LastOrDefault(CoachingModel.IsRepresentative);
        if (latest is not null && trackLengthMeters > 0)
        {
            var d = CoachingModel.CompareToReference(latest, reference, trackLengthMeters);
            lastLap = new LapDeltaSnapshot(
                d.Lap, d.FinalDeltaSec, d.CumulativeDeltaSec,
                d.TopLossZones.Select(z => new LossZoneSnapshot(z.StartPct, z.EndPct, z.SecondsLost)).ToList());
        }

        return new CoachingSnapshot(
            ReferenceLap: reference.Lap,
            LapCount: consistency.LapCount,
            BestLapSec: consistency.BestLapSec,
            MeanLapSec: consistency.MeanLapSec,
            StdDevSec: consistency.StdDevSec,
            SpreadSec: consistency.SpreadSec,
            LastLap: lastLap);
    }
}
