# Sample sessions

Committed telemetry fixtures used for replay-driven development (no live iRacing required).

## How to capture an `.ibt`

iRacing writes a `.ibt` telemetry file per session when telemetry recording is enabled
(`Options → Misc → "save telemetry"`, or press the telemetry toggle). Files land in
`Documents/iRacing/telemetry/`. Copy one here and point `agent.config.json` → `telemetry.ibtPath` at it.

## Privacy

`.ibt` / SessionInfo can contain **real driver names and iRacing customer IDs**. Before committing a
fixture, prefer sessions without sensitive PII, or rely on `privacy.maskDriverNames`. `.ibt` files
are git-ignored by default except files explicitly added under this folder — add fixtures
deliberately, not in bulk.
