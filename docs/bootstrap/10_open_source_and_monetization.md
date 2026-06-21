# 10 - Open Source and Monetization Plan

## Strategic recommendation

Build private/local-first first. Do not monetize until the tool is genuinely useful for your own endurance races.

Then choose one of three paths:

1. Fully open source.
2. Open core with paid cloud features.
3. Private product with free local version.

## Recommended model if it grows

**Open core + optional hosted services.**

Free/open-source:

- Local agent
- Local dashboard
- Basic widgets
- Local session history
- Community track maps
- Plugin/widget SDK

Paid/hosted optional:

- Cloud relay for remote crew
- Team workspaces
- Cloud session history
- Private sharing links
- OBS overlay hosting
- Discord notifications
- Long-term analytics
- Priority support

## Licensing options

### MIT

Pros:

- Very community friendly.
- Easy adoption.
- Commercial reuse allowed.

Cons:

- Others can commercialize your work without contributing back.

### GPL/AGPL

Pros:

- Stronger open-source reciprocity.
- Better if you want modifications to remain open.

Cons:

- Lower commercial adoption.
- Some contributors/users avoid it.

### Dual license

Pros:

- Community version plus commercial path.

Cons:

- More administrative complexity.

## My recommendation

For your first public version:

- Use **MIT** if your main goal is community adoption.
- Use **AGPL** if your main concern is preventing hosted clones from taking without contributing.
- Keep cloud code separate if you want open core later.

## Contribution model

Add:

- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- Issue templates
- Feature request templates
- Telemetry variable dump contribution guide
- Track map contribution guide
- Widget contribution guide

## Community-friendly features

- Export/import dashboard layouts.
- Community widget marketplace later.
- Community SVG track maps.
- Telemetry capability reports by car/track/session.
- Open JSON contracts.
- Example recorded session file for development without iRacing.

## Monetization ideas

### Hosted team relay

Remote crew chief can join without VPN/Tailscale/LAN.

### Race history cloud

Long-term team analytics and session comparison.

### OBS overlays

Hosted browser-source overlays for streamers.

### Team plan

Private team workspace, layouts, cloud history, driver profiles.

### Supporter tier

For open-source users who want to support development.

## Monetization cautions

- Avoid gating basic local race-critical features too early.
- Avoid anything that feels like pay-to-win.
- Do not collect more personal/race data than needed.
- Make data export/delete easy.
- Keep local-only mode strong.
