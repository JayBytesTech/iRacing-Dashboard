# 12 - Questions for Jay

Answering these will shape the first build sprint and prevent scope creep.

## Product direction

1. What working name do you want: `iRacing Engineer Dashboard`, `Mission Control`, `PitWall`, something else?
2. Is the first goal strictly private use with your friends, or do you want the repo structured publicly from day one?
3. Do you want this to feel more like a race engineer dashboard, a streamer overlay toolkit, or a team management tool first?
4. What are the top three views you personally want during an endurance race?

## Technical direction

5. Are you comfortable starting the agent in C#/.NET, or would you rather prototype in Python first?
6. Do you want the web dashboard to be local-only at first, or accessible remotely through Tailscale/cloud relay quickly?
7. Do you prefer a monorepo with agent + web app together?
8. Do you want Docker involved for the web app/backend, or should MVP be simple native installs?

## Dashboard behavior

9. Should the driver view be safe for an active driver to glance at, meaning very large/simple and minimal distractions?
10. Do you want spotter/team users to be able to add manual notes during a race?
11. Should dashboard layouts be shared across your friend group, or personal per user/device?
12. Which layout should be the default: endurance crew chief, spotter, or driver second monitor?

## Telemetry and data

13. Do you want to record every session by default, or only when a race starts?
14. Do you care about long-term driver analytics, or is live race support the first priority?
15. Should raw telemetry recording be supported, or only downsampled session summaries?
16. Do you want to store real driver names/user IDs locally, or mask by default?

## Endurance/race features

17. Which endurance races are your main targets first: Watkins 6h, Daytona 24, Sebring, Petit Le Mans, Bathurst, NEC, IMSA Endurance?
18. Do you need driver swap legality/minimum-drive-time tracking in MVP, or later?
19. Do you want tire-set tracking and pit-service planning in MVP, or later?
20. Do you want Discord alerts for fuel window/driver swap/pit events?

## Community/monetization

21. If this grows, would you rather open source it, sell a hosted service, or keep it as a private team tool?
22. Would you be okay with an open-core model: local app free/open, hosted relay/history paid?
23. Are OBS overlay widgets important enough to include in v1?
24. Do you want contributors to be able to create custom widgets/plugins?

## Design

25. Do you want the UI style to be motorsport broadcast, engineering dark-mode, or clean SaaS dashboard?
26. Any apps you want visual inspiration from? Examples: Racelab, Garage61, SimHub, Grafana, F1 timing screens, MoTeC, Crew Chief.
27. Should the UI prioritize dark mode only at first?
28. Do you want branding/team colors baked into the initial design?

## MVP decision questions

For the very first usable build, rank these in order:

- Relative
- Fuel-to-finish
- Track map
- Leaderboard
- Event timeline
- Stint timer
- Driver swap manager
- Pit rejoin estimator
- OBS overlay
- Post-race review
