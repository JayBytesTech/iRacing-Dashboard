using IracingEngineer.Journal;
using Xunit;

namespace IracingEngineer.Journal.Tests;

public class SessionRecordTests
{
    private static SessionRecord Rec(string id = "ibt:x") => new()
    {
        Id = id,
        CapturedAt = new DateTimeOffset(2026, 6, 19, 21, 0, 0, TimeSpan.Zero),
        Track = "Watkins Glen",
        SessionType = "Race",
    };

    // ---- tag normalization ----------------------------------------------------------------------

    [Fact]
    public void NormalizeTags_trims_lowercases_dedupes_and_drops_blanks()
    {
        var tags = SessionRecord.NormalizeTags(new[] { "  Wet ", "wet", "Esses", "", "  ", "ENDURO" });
        Assert.Equal(new[] { "wet", "esses", "enduro" }, tags);
    }

    [Fact]
    public void NormalizeTags_handles_null()
    {
        Assert.Empty(SessionRecord.NormalizeTags(null));
    }

    // ---- rating clamp ---------------------------------------------------------------------------

    [Theory]
    [InlineData(0, 1)]
    [InlineData(3, 3)]
    [InlineData(9, 5)]
    public void ClampRating_keeps_it_in_1_to_5(int input, int expected)
    {
        Assert.Equal(expected, SessionRecord.ClampRating(input));
    }

    [Fact]
    public void ClampRating_passes_null_through()
    {
        Assert.Null(SessionRecord.ClampRating(null));
    }

    // ---- WithEdit -------------------------------------------------------------------------------

    [Fact]
    public void WithEdit_only_changes_journal_fields_and_sanitizes()
    {
        var edited = Rec().WithEdit(new JournalEdit
        {
            Title = "  Night enduro  ",
            Notes = "Understeer in T5",
            Rating = 7,
            Tags = new[] { "Enduro", "enduro", " wet " },
        });

        Assert.Equal("Night enduro", edited.Title);
        Assert.Equal("Understeer in T5", edited.Notes);
        Assert.Equal(5, edited.Rating);
        Assert.Equal(new[] { "enduro", "wet" }, edited.Tags);
        // Auto fields untouched.
        Assert.Equal("Watkins Glen", edited.Track);
        Assert.Equal("Race", edited.SessionType);
    }

    [Fact]
    public void WithEdit_blank_strings_become_null()
    {
        var edited = Rec().WithEdit(new JournalEdit { Title = "   ", Notes = "" });
        Assert.Null(edited.Title);
        Assert.Null(edited.Notes);
    }

    // ---- DisplayTitle ---------------------------------------------------------------------------

    [Fact]
    public void DisplayTitle_prefers_the_drivers_title()
    {
        Assert.Equal("My title", (Rec() with { Title = "My title" }).DisplayTitle);
    }

    [Fact]
    public void DisplayTitle_falls_back_to_track_and_type()
    {
        Assert.Equal("Watkins Glen · Race", Rec().DisplayTitle);
    }

    [Fact]
    public void DisplayTitle_falls_back_to_the_date_when_nothing_else()
    {
        var bare = new SessionRecord { Id = "x", CapturedAt = new DateTimeOffset(2026, 6, 19, 0, 0, 0, TimeSpan.Zero) };
        Assert.Equal("Session 2026-06-19", bare.DisplayTitle);
    }

    // ---- PreservingJournalFrom (upsert merge) ---------------------------------------------------

    [Fact]
    public void PreservingJournalFrom_keeps_notes_but_takes_fresh_stats()
    {
        var existing = Rec() with
        {
            Title = "Keep me",
            Notes = "My notes",
            Rating = 4,
            Tags = new[] { "wet" },
            BestLapSec = 107.0,
            CapturedAt = new DateTimeOffset(2026, 6, 19, 21, 0, 0, TimeSpan.Zero),
        };
        var recaptured = Rec() with
        {
            BestLapSec = 106.18, // improved stat from a re-run
            CapturedAt = new DateTimeOffset(2026, 6, 22, 10, 0, 0, TimeSpan.Zero),
        };

        var merged = recaptured.PreservingJournalFrom(existing);

        Assert.Equal(106.18, merged.BestLapSec);             // fresh auto field
        Assert.Equal("Keep me", merged.Title);               // preserved journal
        Assert.Equal("My notes", merged.Notes);
        Assert.Equal(4, merged.Rating);
        Assert.Equal(new[] { "wet" }, merged.Tags);
        Assert.Equal(existing.CapturedAt, merged.CapturedAt); // original capture time
    }
}
