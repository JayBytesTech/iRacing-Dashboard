namespace IracingEngineer.Agent;

/// <summary>
/// Batch-import mode: <c>dotnet run -- import &lt;dir&gt;</c>. Finds every <c>*.ibt</c> under a folder and
/// runs each through the same analyze+save pipeline as <c>analyze --save</c>, quietly — one summary line
/// per file. This backfills the driver's journal from existing telemetry so the trend views have history
/// to chart, without replaying each file by hand.
/// </summary>
public static class ImportCommand
{
    public static async Task<int> Run(AgentConfig config, string? dir)
    {
        if (string.IsNullOrWhiteSpace(dir))
        {
            Console.Error.WriteLine("import: pass a folder, e.g. `dotnet run -- import ../../docs/demo-telemetry`.");
            return 1;
        }
        if (!Directory.Exists(dir))
        {
            Console.Error.WriteLine($"import: folder not found: {dir}");
            return 1;
        }

        var files = Directory.EnumerateFiles(dir, "*.ibt", SearchOption.AllDirectories)
            .OrderBy(f => f, StringComparer.OrdinalIgnoreCase)
            .ToList();
        if (files.Count == 0)
        {
            Console.WriteLine($"import: no .ibt files under {Path.GetFullPath(dir)}");
            return 0;
        }

        Console.WriteLine($"import: {files.Count} file(s) under {Path.GetFullPath(dir)} -> journal at {Path.GetFullPath(config.Journal.DbPath)}");
        var sw = System.Diagnostics.Stopwatch.StartNew();
        int ok = 0, failed = 0;
        foreach (var file in files)
        {
            try
            {
                var rc = await AnalyzeCommand.Run(config, file, save: true, quiet: true);
                if (rc == 0) ok++; else failed++;
            }
            catch (Exception ex)
            {
                failed++;
                Console.WriteLine($"  ✗ {Path.GetFileName(file),-52}  {ex.Message}");
            }
        }
        sw.Stop();
        Console.WriteLine($"import: done — {ok} imported, {failed} failed in {sw.Elapsed.TotalSeconds:F1}s.");
        return failed == 0 ? 0 : 1;
    }
}
