# Web dashboard

Next.js + TypeScript live dashboard. Runs anywhere (it's just a WebSocket client) — including this
Linux dev box.

## Run against the mock agent (no .NET / no iRacing needed)

```bash
# terminal 1 — start the stand-in agent (dependency-free)
node ../../tools/mock-agent/mock-agent.mjs

# terminal 2
npm install
npm run dev          # http://localhost:3000
```

You should see the connection banner turn green and Fuel / Speed / Lap update live.

## Point at a real agent

Set the agent URL (e.g. the Windows sim PC on your LAN):

```bash
NEXT_PUBLIC_AGENT_URL="ws://192.168.1.50:5174/live" npm run dev
```

Later this moves into `/settings` per the dashboard spec.
