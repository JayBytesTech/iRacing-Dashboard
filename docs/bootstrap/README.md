# iRacing Engineer Dashboard Bootstrap Pack

Working name: **Mission Control for iRacing teams**  
Generated: 2026-06-20

This pack is intended to jumpstart a local-first web portal that reads live iRacing telemetry, normalizes it through a local agent, and displays configurable race-control dashboards for endurance teams, spotters, and sprint-race drivers.

## Recommended starting path

1. Create a monorepo with the structure in `05_technical_architecture.md`.
2. Build the local agent proof-of-life first: connect to IRSDK, read a small variable set, and publish a WebSocket message every 250 ms.
3. Build the first web dashboard page with only connection state, car status, relative, fuel, and a basic event log.
4. Add derived strategy calculations after the raw data loop is reliable.
5. Add layout customization only after the core widgets prove useful during an actual race.

## Included documents

| File | Purpose |
| --- | --- |
| `01_project_charter.md` | Vision, goals, non-goals, principles, target users, success metrics. |
| `02_product_requirements_mvp.md` | MVP requirements, personas, use cases, widget scope, acceptance criteria. |
| `03_telemetry_data_catalog.md` | Practical telemetry inventory and dynamic discovery plan. |
| `04_data_contracts.md` | WebSocket message contracts, normalized models, naming conventions. |
| `05_technical_architecture.md` | Local-first architecture, repo structure, data flow, storage approach. |
| `06_local_agent_spec.md` | Agent responsibilities, connection behavior, config, sampling, reliability. |
| `07_web_dashboard_spec.md` | Frontend app, widgets, layouts, dashboards, UI states. |
| `08_strategy_engine_spec.md` | Fuel, stint, gap, pit, traffic, and event calculations. |
| `09_backlog_user_stories.md` | Epics, stories, acceptance criteria, MVP sprint plan. |
| `10_open_source_and_monetization.md` | Community, licensing, support, cloud, and monetization plan. |
| `11_security_privacy_reliability.md` | Local network model, team sharing risk, data retention, reliability checklist. |
| `12_questions_for_jay.md` | Open questions to answer before the first build sprint. |
| `schemas/live_snapshot.schema.json` | Draft JSON schema for the main live WebSocket payload. |
| `schemas/event.schema.json` | Draft JSON schema for race-event timeline items. |
| `schemas/layout.schema.json` | Draft JSON schema for dashboard layouts. |

## Important implementation assumptions

- iRacing data should be treated as **dynamic and context-dependent**. Not every variable exists for every car, session type, replay state, or telemetry source.
- The agent should dynamically read available variables at runtime and publish a capability map.
- Track maps for other cars should start with lap-distance-based positioning. Do not assume true live X/Y coordinates for all competitors.
- Use raw telemetry for display, but keep strategy/alerts as separate derived data.
- Prioritize reliability and readability over visual polish during the first build.

## Suggested tech stack

- Agent: C#/.NET 8 or newer
- Web: Next.js + TypeScript + Tailwind + shadcn/ui
- Local transport: WebSocket first, HTTP status endpoint second
- Storage: SQLite for local MVP; PostgreSQL later if cloud/team history is added
- Charts: Recharts or lightweight-charts
- Layouts: react-grid-layout or a custom CSS grid after MVP

## External references

See `13_sources_and_reference_notes.md`.
