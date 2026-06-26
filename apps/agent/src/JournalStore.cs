using System.Text.Json;
using Microsoft.Data.Sqlite;
using IracingEngineer.Journal;

namespace IracingEngineer.Agent;

/// <summary>
/// SQLite-backed persistence for the driver's journal (default <c>data/journal.db</c>). The only place
/// that touches storage; all the merge/sanitize rules live in the pure <see cref="SessionRecord"/>.
/// Cross-process safe (the offline <c>analyze --save</c> writer and the running agent's HTTP API share
/// the file) via SQLite's own locking. Synchronous — the store is local and tiny.
/// </summary>
public sealed class JournalStore
{
    private readonly string _connectionString;

    public JournalStore(string dbPath)
    {
        var dir = Path.GetDirectoryName(Path.GetFullPath(dbPath));
        if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
        _connectionString = new SqliteConnectionStringBuilder { DataSource = dbPath }.ToString();
        EnsureSchema();
    }

    private SqliteConnection Open()
    {
        var c = new SqliteConnection(_connectionString);
        c.Open();
        using var pragma = c.CreateCommand();
        // WAL is durable across hard kills (a forced window-close or power loss can't leave a torn
        // main DB), and lets the HTTP read connection and the capture write connection coexist
        // without "database is locked". busy_timeout waits briefly instead of throwing on contention.
        pragma.CommandText = "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA busy_timeout=5000;";
        pragma.ExecuteNonQuery();
        return c;
    }

    private void EnsureSchema()
    {
        using var c = Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                capturedAt TEXT NOT NULL,
                track TEXT, trackConfig TEXT, car TEXT, sessionType TEXT,
                laps INTEGER NOT NULL, cleanLaps INTEGER NOT NULL,
                bestLapSec REAL, stdDevSec REAL, fuelBurnPerLapLiters REAL, stops INTEGER,
                source TEXT,
                title TEXT, notes TEXT, rating INTEGER, tags TEXT
            );
            """;
        cmd.ExecuteNonQuery();

        // Migrations: add columns introduced after the first schema so existing journal DBs keep working.
        AddColumnIfMissing(c, "pitStops", "INTEGER");
        AddColumnIfMissing(c, "incidents", "INTEGER");
        // Full analysis blob (fuel/coach/timeline) computed at capture time for the detail view.
        AddColumnIfMissing(c, "detail", "TEXT");
    }

    private static void AddColumnIfMissing(SqliteConnection c, string column, string type)
    {
        using (var check = c.CreateCommand())
        {
            check.CommandText = "SELECT COUNT(*) FROM pragma_table_info('sessions') WHERE name = $name;";
            check.Parameters.AddWithValue("$name", column);
            if (Convert.ToInt64(check.ExecuteScalar()) > 0) return;
        }
        using var alter = c.CreateCommand();
        alter.CommandText = $"ALTER TABLE sessions ADD COLUMN {column} {type};";
        alter.ExecuteNonQuery();
    }

    /// <summary>
    /// Insert or update. Re-capturing the same id refreshes the auto fields (including the analysis
    /// <paramref name="detailJson"/>) but keeps the driver's journal. Detail is auto-derived, so it is
    /// always overwritten by a re-capture.
    /// </summary>
    public SessionRecord Upsert(SessionRecord incoming, string? detailJson = null)
    {
        var existing = Get(incoming.Id);
        var rec = existing is null ? incoming : incoming.PreservingJournalFrom(existing);

        using var c = Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = """
            INSERT OR REPLACE INTO sessions
                (id, capturedAt, track, trackConfig, car, sessionType, laps, cleanLaps,
                 bestLapSec, stdDevSec, fuelBurnPerLapLiters, stops, pitStops, incidents, source, detail, title, notes, rating, tags)
            VALUES
                ($id, $capturedAt, $track, $trackConfig, $car, $sessionType, $laps, $cleanLaps,
                 $bestLapSec, $stdDevSec, $fuelBurnPerLapLiters, $stops, $pitStops, $incidents, $source, $detail, $title, $notes, $rating, $tags);
            """;
        Bind(cmd, rec);
        cmd.Parameters.AddWithValue("$detail", (object?)detailJson ?? DBNull.Value);
        cmd.ExecuteNonQuery();
        return rec;
    }

    /// <summary>The stored analysis JSON for a session (raw, already lowerCamelCase), or null if none.</summary>
    public string? GetDetail(string id)
    {
        using var c = Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT detail FROM sessions WHERE id = $id;";
        cmd.Parameters.AddWithValue("$id", id);
        var result = cmd.ExecuteScalar();
        return result is null or DBNull ? null : (string)result;
    }

    public IReadOnlyList<SessionRecord> List()
    {
        using var c = Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT * FROM sessions ORDER BY capturedAt DESC;";
        using var r = cmd.ExecuteReader();
        var list = new List<SessionRecord>();
        while (r.Read()) list.Add(Read(r));
        return list;
    }

    public SessionRecord? Get(string id)
    {
        using var c = Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT * FROM sessions WHERE id = $id;";
        cmd.Parameters.AddWithValue("$id", id);
        using var r = cmd.ExecuteReader();
        return r.Read() ? Read(r) : null;
    }

    /// <summary>Apply a driver edit (journal fields only) and persist. Null if the id is unknown.</summary>
    public SessionRecord? SaveEdit(string id, JournalEdit edit)
    {
        var existing = Get(id);
        if (existing is null) return null;
        var updated = existing.WithEdit(edit);

        using var c = Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "UPDATE sessions SET title=$title, notes=$notes, rating=$rating, tags=$tags WHERE id=$id;";
        cmd.Parameters.AddWithValue("$id", id);
        cmd.Parameters.AddWithValue("$title", (object?)updated.Title ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$notes", (object?)updated.Notes ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$rating", (object?)updated.Rating ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$tags", JsonSerializer.Serialize(updated.Tags));
        cmd.ExecuteNonQuery();
        return updated;
    }

    // --- mapping -------------------------------------------------------------------------------

    private static void Bind(SqliteCommand cmd, SessionRecord r)
    {
        cmd.Parameters.AddWithValue("$id", r.Id);
        cmd.Parameters.AddWithValue("$capturedAt", r.CapturedAt.ToString("o"));
        cmd.Parameters.AddWithValue("$track", (object?)r.Track ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$trackConfig", (object?)r.TrackConfig ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$car", (object?)r.Car ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$sessionType", (object?)r.SessionType ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$laps", r.Laps);
        cmd.Parameters.AddWithValue("$cleanLaps", r.CleanLaps);
        cmd.Parameters.AddWithValue("$bestLapSec", (object?)r.BestLapSec ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$stdDevSec", (object?)r.StdDevSec ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$fuelBurnPerLapLiters", (object?)r.FuelBurnPerLapLiters ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$stops", (object?)r.Stops ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$pitStops", (object?)r.PitStops ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$incidents", (object?)r.Incidents ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$source", (object?)r.Source ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$title", (object?)r.Title ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$notes", (object?)r.Notes ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$rating", (object?)r.Rating ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$tags", JsonSerializer.Serialize(r.Tags));
    }

    private static SessionRecord Read(SqliteDataReader r)
    {
        string? S(string col) => r[col] is DBNull ? null : (string)r[col];
        double? D(string col) => r[col] is DBNull ? null : Convert.ToDouble(r[col]);
        int? I(string col) => r[col] is DBNull ? null : Convert.ToInt32(r[col]);
        var tagsJson = S("tags");
        var tags = string.IsNullOrEmpty(tagsJson)
            ? Array.Empty<string>()
            : JsonSerializer.Deserialize<string[]>(tagsJson) ?? Array.Empty<string>();

        return new SessionRecord
        {
            Id = (string)r["id"],
            CapturedAt = DateTimeOffset.Parse(S("capturedAt")!),
            Track = S("track"),
            TrackConfig = S("trackConfig"),
            Car = S("car"),
            SessionType = S("sessionType"),
            Laps = I(