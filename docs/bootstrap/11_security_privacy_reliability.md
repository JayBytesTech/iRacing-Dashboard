# 11 - Security, Privacy, and Reliability

## Security model for MVP

The MVP runs on a trusted local network.

Assumptions:

- User controls the race PC.
- LAN viewers are trusted friends/devices.
- No internet-exposed port by default.
- No authentication in first private MVP unless cloud/remote sharing is added.

## Risks

| Risk | Mitigation |
| --- | --- |
| Exposing agent to public internet | Bind to LAN only; warn user; no UPnP; document firewall. |
| Untrusted viewer sees names/user IDs | Privacy settings to mask driver names and avoid storing raw IDs. |
| Dashboard shows stale data | Heartbeat and aggressive stale-state UI. |
| Agent crash during race | Defensive parsing, null handling, logging, reconnect loop. |
| SessionInfo YAML parse failure | Keep telemetry loop separate from YAML parser. |
| Cloud relay leak later | Auth, team permissions, TLS, expiring share links. |

## Privacy principles

- Local-first by default.
- Store minimal data.
- Make recording optional.
- Allow deleting session history.
- Avoid storing raw SessionInfo unless debug mode is enabled.
- Mask driver names/user IDs when sharing screenshots or public links.

## Data retention defaults

MVP local defaults:

- Keep session summaries until deleted.
- Keep downsampled telemetry only when recording is enabled.
- Keep raw debug logs for 7 days or size-limited rotation.
- Do not upload anything by default.

## Reliability checklist

Agent:

- Reconnects to iRacing.
- Handles missing variables.
- Handles YAML parse errors.
- Handles multiple dashboard clients.
- Does not block telemetry reads while parsing YAML.
- Logs errors without flooding.

Dashboard:

- Reconnects WebSocket.
- Shows stale data.
- Does not crash on unknown/missing fields.
- Saves layout/settings locally.
- Has a debug page.

Network:

- Clearly displays local dashboard URL.
- Clearly displays LAN dashboard URL.
- Warns if firewall likely blocks access.

## Pre-race checklist

- Agent running.
- iRacing connected.
- Dashboard connected from crew device.
- Correct car/session detected.
- Fuel widget has enough clean-lap samples.
- Event timeline recording enabled.
- Device sleep disabled on crew tablet/laptop.

## During-race recovery checklist

If dashboard freezes:

1. Check stale banner.
2. Refresh browser.
3. Confirm agent status endpoint.
4. Restart agent only if needed.
5. Verify iRacing still connected.
6. Resume recording if disabled.

## Future cloud security checklist

- OAuth or magic-link auth.
- Team roles: owner/admin/member/viewer.
- Expiring share links.
- TLS everywhere.
- Audit log for team access.
- Rate limiting.
- Data export/delete.
- Clear privacy policy.
