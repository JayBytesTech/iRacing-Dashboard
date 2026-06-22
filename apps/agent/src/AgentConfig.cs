using System.Text.Json;

namespace IracingEngineer.Agent;

/// <summary>Agent configuration. Mirrors agent.config.json in docs/bootstrap/06_local_agent_spec.md.</summary>
public record AgentConfig
{
    public ServerConfig Server { get; init; } = new();
    public TelemetryConfig Telemetry { get; init; } = new();
    public PrivacyConfig Privacy { get; init; } = new();

    public static AgentConfig Load(string path)
    {
        if (!File.Exists(path)) return new AgentConfig();
        var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        return JsonSerializer.Deserialize<AgentConfig>(File.ReadAllText(path), opts) ?? new AgentConfig();
    }
}

public record ServerConfig
{
    public string Host { get; init; } = "0.0.0.0";
    public int Port { get; init; } = 5174;
    public bool AllowLan { get; init; } = true;
}

public record TelemetryConfig
{
    public int UiSnapshotHz { get; init; } = 5;
    public bool RecordSession { get; init; } = false;

    /// <summary>"live" (Windows shared memory) or "ibt" (replay a recorded file, cross-platform).</summary>
    public string Mode { get; init; } = "ibt";

    /// <summary>Path to the .ibt file when Mode == "ibt".</summary>
    public string? IbtPath { get; init; }

    /// <summary>
    /// Replay speed for .ibt mode. 1 = real time; 10 = 10x (good for watching the dashboard animate);
    /// 0 or negative = as fast as possible (process the whole file in seconds, e.g. for analysis).
    /// </summary>
    public int IbtPlaybackSpeed { get; init; } = 10;
}

public record PrivacyConfig
{
    public bool MaskDriverNames { get; init; } = false;
    public bool StoreRawSessionInfo { get; init; } = false;
}
