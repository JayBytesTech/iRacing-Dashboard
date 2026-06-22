namespace IracingEngineer.Journal;

/// <summary>
/// One entry in the driver's journal: the auto-captured stats for a session plus the driver's own
/// notes. Pure data + the rules for editing/merging it. The agent persists these (SQLite) and builds
/// the auto fields from the strategy/coaching outputs; here we only define the shape and the safe ways
/// to mutate it (so a re-capture never clobbers notes, ratings are always sane, tags are tidy).
/// </summary>
public sealed record SessionRecord
{
    /// <summary>Stable id so re-capturing the same source updates rather than duplicates.</summary>
    public required string Id { get; init; }
    public DateTimeOffset CapturedAt { get; init; }

    // ---- auto-captured (overwritten on re-capture) ----
    public string? Track { get; init; }
    public string? TrackConfig { get; init; }
    public string? Car { get; init; }
    public string? SessionType { get; init; }
    public int Laps { get; init; }
    public int CleanLaps { get; init; }
    public double? BestLapSec { get; init; }
    public double? StdDevSec { get; init; }
    public double? FuelBurnPerLapLiters { get; init; }
    public int? Stops { get; init; }
    /// <summary>Where it came from, e.g. "ibt:watkinsglen…" or "live".</summary>
    public string? Source { get; init; }

    // ---- the journal (only changed by the driver) ----
    public string? Title { get; init; }
    public string? Notes { get; init; }
    /// <summary>1–5, or null for unrated.</summary>
    public int? Rating { get; init; }
    public IReadOnlyList<string> Tags { get; init; } = Array.Empty<string>();

    /// <summary>A sensible default title from the auto fields when the driver hasn't set one.</summary>
    public string DisplayTitle =>
        !string.IsNullOrWhiteSpace(Title) ? Title!
        : string.Join(" · ", new[] { Track, SessionType }.Where(s => !string.IsNullOrWhiteSpace(s)))
            is { Length: > 0 } t ? t
        : $"Session {CapturedAt:yyyy-MM-dd}";

    /// <summary>Apply a driver edit: only the journal fields change; rating is clamped, tags normalized.</summary>
    public SessionRecord WithEdit(JournalEdit edit) => this with
    {
        Title = Blank(edit.Title),
        Notes = Blank(edit.Notes),
        Rating = ClampRating(edit.Rating),
        Tags = NormalizeTags(edit.Tags),
    };

    /// <summary>
    /// For upsert: take this record's freshly-captured auto fields but keep <paramref name="existing"/>'s
    /// journal (title/notes/rating/tags) so re-running capture never destroys what the driver wrote.
    /// </summary>
    public SessionRecord PreservingJournalFrom(SessionRecord existing) => this with
    {
        Title = existing.Title,
        Notes = existing.Notes,
        Rating = existing.Rating,
        Tags = existing.Tags,
        // Keep the original capture time so the entry doesn't jump around on re-capture.
        CapturedAt = existing.CapturedAt,
    };

    public static int? ClampRating(int? rating) =>
        rating is { } r ? Math.Clamp(r, 1, 5) : null;

    /// <summary>Trim, lowercase, drop blanks, de-duplicate (order preserved).</summary>
    public static IReadOnlyList<string> NormalizeTags(IEnumerable<string>? tags)
    {
        if (tags is null) return Array.Empty<string>();
        var seen = new HashSet<string>();
        var result = new List<string>();
        foreach (var raw in tags)
        {
            var t = raw?.Trim().ToLowerInvariant();
            if (string.IsNullOrEmpty(t)) continue;
            if (seen.Add(t)) result.Add(t);
        }
        return result;
    }

    private static string? Blank(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();
}

/// <summary>The driver-editable subset of a <see cref="SessionRecord"/>.</summary>
public sealed record JournalEdit
{
    public string? Title { get; init; }
    public string? Notes { get; init; }
    public int? Rating { get; init; }
    public IReadOnlyList<string>? Tags { get; init; }
}
