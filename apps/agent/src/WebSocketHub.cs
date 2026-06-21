using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace IracingEngineer.Agent;

/// <summary>
/// Tracks connected dashboard clients and broadcasts JSON envelopes. Clients may connect/disconnect
/// freely (refresh, reconnect) without affecting the telemetry loop — a core reliability requirement.
/// </summary>
public sealed class WebSocketHub
{
    private readonly ConcurrentDictionary<Guid, WebSocket> _clients = new();
    private readonly JsonSerializerOptions _json;
    private long _sequence;

    public WebSocketHub(JsonSerializerOptions json) => _json = json;

    public int ClientCount => _clients.Count;

    /// <summary>Handle one client for its whole lifetime. Returns when the socket closes.</summary>
    public async Task HandleClientAsync(WebSocket socket, CancellationToken ct)
    {
        var id = Guid.NewGuid();
        _clients[id] = socket;
        try
        {
            var buffer = new byte[1024];
            // We don't expect inbound messages yet; drain until the client closes.
            while (socket.State == WebSocketState.Open && !ct.IsCancellationRequested)
            {
                var result = await socket.ReceiveAsync(buffer, ct);
                if (result.MessageType == WebSocketMessageType.Close) break;
            }
        }
        catch (OperationCanceledException) { }
        catch (WebSocketException) { }
        finally
        {
            _clients.TryRemove(id, out _);
        }
    }

    public Task BroadcastAsync<T>(string type, T payload, CancellationToken ct)
    {
        var envelope = Envelope<T>.Create(type, Interlocked.Increment(ref _sequence), payload);
        var bytes = JsonSerializer.SerializeToUtf8Bytes(envelope, _json);
        return BroadcastRawAsync(bytes, ct);
    }

    private async Task BroadcastRawAsync(byte[] bytes, CancellationToken ct)
    {
        foreach (var (id, socket) in _clients)
        {
            if (socket.State != WebSocketState.Open) continue;
            try
            {
                await socket.SendAsync(bytes, WebSocketMessageType.Text, endOfMessage: true, ct);
            }
            catch
            {
                _clients.TryRemove(id, out _); // drop broken clients; never let one client stall the loop
            }
        }
    }
}
