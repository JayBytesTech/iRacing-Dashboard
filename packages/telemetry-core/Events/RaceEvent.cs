namespace IracingEngineer.TelemetryCore.Events;

/// <summary>What happened. Kept deliberately small for v0 — the things derivable from the player's own
/// telemetry stream (so they work from an `.ibt` too, not just live).</summary>
public enum RaceEventKind
{
    /// <summary>Crossed onto pit road (entered the pit lane).</summary>
    PitEntry,
    /// <summary>Crossed off pit road (rejoined the track).</summary>
    PitExit,
    /// <summary>The player's incident count went up (the "x" count iRacing tracks).</summary>
    Incident,
}

/// <summary>
/// One thing that happened during a session, located in session time + lap. Source-agnostic and
/// immutable — the agent maps these straight onto the dashboard's event timeline and the journal.
/// </summary>
/// <param name="SessionTimeMs">Session time (ms) the event was detected at.</param>
/// <param name="Lap">The player's lap number when it happened (null if unknown).</param>
/// <param name="Kind">What kind of event.</param>
/// <param name="Detail">Short human-readable detail, e.g. "+2x" for an incident or null.</param>
public sealed record RaceEvent(long SessionTimeMs, int? Lap, RaceEventKind Kind, string? Detail = null);
