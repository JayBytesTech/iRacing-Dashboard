// Dependency-free mock agent: a stand-in for apps/agent during milestone 0.
//
// It speaks the SAME contract the real C# agent will (packages/telemetry-contracts):
//   - hello        on connect
//   - capabilities on connect
//   - liveSnapshot at ~5 Hz
//   - heartbeat    at 1 Hz
//
// It implements a minimal RFC 6455 WebSocket server using only Node built-ins so it runs with
// zero `npm install`. This exists purely to prove the pipe (agent -> ws -> dashboard) on Linux
// before the real telemetry agent or iRacing exist. Swap it for apps/agent later; the web client
// does not change.
//
// Usage:  node tools/mock-agent/mock-agent.mjs [--port 5174] [--hz 5]

import http from 'node:http';
import crypto from 'node:crypto';

const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, arr) => (a.startsWith('--') ? [a.slice(2), arr[i + 1]] : [null, null])),
);
const PORT = Number(args.port ?? 5174);
const HZ = Number(args.hz ?? 5);
const SCHEMA_VERSION = '0.1.0';
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'; // RFC 6455 magic string

// ---- Synthetic but contract-shaped session state ---------------------------------------------
// A simple endurance-ish loop: fuel burns down, the car laps the track, a couple of AI cars move.
const startedAt = Date.now();
let sequence = 0;
const TOTAL_LAPS = 30;
const BURN_PER_LAP = 2.65;
// Start a few laps into a stint so the fuel estimate is already populated (a fresh start would sit in
// the "gathering clean laps" state for ~2 laps). Fuel reflects laps already burned.
const START_LAP = 6;
const player = { carIdx: 12, fuel: 60.0 - (START_LAP - 1) * BURN_PER_LAP, lap: START_LAP, lapDistPct: 0.0, lapTimeSec: 105 };
const others = [
  { carIdx: 7, className: 'GT3', offset: 0.18, lap: 1 },
  { carIdx: 22, className: 'GTP', offset: 0.55, lap: 1 },
  { carIdx: 3, className: 'GT3', offset: 0.82, lap: 1 },
];

function tick(dtSec) {
  const lapFrac = dtSec / player.lapTimeSec;
  player.lapDistPct += lapFrac;
  if (player.lapDistPct >= 1) {
    player.lapDistPct -= 1;
    player.lap += 1;
    player.fuel = Math.max(0, player.fuel - BURN_PER_LAP);
  }
  for (const c of others) {
    c.lapDistPct = (player.lapDistPct + c.offset) % 1;
  }
}

function car(carIdx, extra) {
  return {
    carIdx,
    carNumber: String(carIdx),
    driverName: null, // mock keeps PII empty on purpose
    className: 'GT3',
    onPitRoad: false,
    isPlayer: false,
    ...extra,
  };
}

// A simplified stand-in for the real C# FuelModel output, in the same contract shape, so the
// dashboard's FuelWidget has live data to render before the real agent exists.
function fuelEstimate() {
  const lapsToGo = Math.max(0, TOTAL_LAPS - player.lap);
  const lapsAboard = player.fuel / BURN_PER_LAP;
  const toFinish = lapsToGo * BURN_PER_LAP;
  const delta = player.fuel - toFinish;
  const toAdd = Math.max(0, toFinish - player.fuel);
  const headroom = lapsAboard - lapsToGo;
  const status =
    lapsAboard < 2 ? 'Critical' : headroom < 0 ? 'PitRequired' : headroom < 1 ? 'Marginal' : 'Safe';
  const sample = Math.min(player.lap - 1, 8);
  // Mirror the real FuelModel: with no clean laps there is no estimate at all (status Unknown).
  if (sample < 1) {
    return {
      fuelBurnPerLapLiters: null,
      sampleLapCount: 0,
      estimatedLapsRemaining: null,
      raceLapsToGo: lapsToGo,
      fuelToFinishLiters: null,
      fuelDeltaToFinishLiters: null,
      fuelToAddAtNextStopLiters: null,
      pitWindowOpen: false,
      confidence: 'Low',
      status: 'Unknown',
    };
  }
  const confidence = sample >= 6 ? 'High' : sample >= 3 ? 'Medium' : 'Low';
  return {
    fuelBurnPerLapLiters: BURN_PER_LAP,
    sampleLapCount: Math.max(0, sample),
    estimatedLapsRemaining: Number(lapsAboard.toFixed(2)),
    raceLapsToGo: lapsToGo,
    fuelToFinishLiters: Number(toFinish.toFixed(2)),
    fuelDeltaToFinishLiters: Number(delta.toFixed(2)),
    fuelToAddAtNextStopLiters: Number(toAdd.toFixed(2)),
    pitWindowOpen: lapsAboard < lapsToGo,
    confidence,
    status,
  };
}

function snapshotPayload() {
  const speedKph = 150 + 60 * Math.sin(player.lapDistPct * Math.PI * 4); // fake corners/straights
  const rpm = 5000 + 3000 * Math.abs(Math.sin(player.lapDistPct * Math.PI * 4));
  return {
    connection: { iracingConnected: true, isOnTrack: true, isReplayPlaying: true, dataAgeMs: 20 },
    session: {
      sessionId: `mock-${startedAt}`,
      trackName: 'Watkins Glen International (mock)',
      sessionType: 'Race',
      sessionNum: 0,
      timeRemainingSec: null,
      lapsRemaining: Math.max(0, TOTAL_LAPS - player.lap),
      flagState: 'green',
    },
    player: car(player.carIdx, {
      isPlayer: true,
      className: 'GT3',
      position: 8,
      classPosition: 4,
      lap: player.lap,
      lapCompleted: player.lap - 1,
      lapDistPct: Number(player.lapDistPct.toFixed(4)),
      speedKph: Number(speedKph.toFixed(1)),
      gear: Math.min(6, Math.max(1, Math.round(speedKph / 35))),
      rpm: Number(rpm.toFixed(0)),
      fuelLevelLiters: Number(player.fuel.toFixed(2)),
    }),
    cars: others.map((c) =>
      car(c.carIdx, { className: c.className, lap: player.lap, lapDistPct: Number(c.lapDistPct.toFixed(4)) }),
    ),
    strategy: { fuel: fuelEstimate() },
    events: [],
  };
}

function envelope(type, payload) {
  return JSON.stringify({
    type,
    schemaVersion: SCHEMA_VERSION,
    sequence: sequence++,
    timestamp: new Date().toISOString(),
    source: 'mock-agent',
    payload,
  });
}

// ---- Minimal WebSocket framing (text frames, server->client, unmasked) -----------------------
function encodeTextFrame(str) {
  const data = Buffer.from(str, 'utf8');
  const len = data.length;
  let header;
  if (len < 126) {
    header = Buffer.from([0x81, len]);
  } else if (len < 65536) {
    header = Buffer.from([0x81, 126, (len >> 8) & 0xff, len & 0xff]);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, data]);
}

const clients = new Set();

const server = http.createServer((req, res) => {
  // Plain HTTP status endpoint mirrors the real agent's GET /status contract.
  if (req.url === '/status') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        agentVersion: 'mock-0.1.0',
        agentStartedAt: new Date(startedAt).toISOString(),
        iracingConnected: true,
        sessionActive: true,
        clientsConnected: clients.size,
        recording: false,
      }),
    );
    return;
  }
  res.writeHead(404).end('iRacing Engineer mock agent. Connect to ws://<host>:' + PORT + '/live');
});

server.on('upgrade', (req, socket) => {
  if (req.url !== '/live') {
    socket.destroy();
    return;
  }
  const key = req.headers['sec-websocket-key'];
  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
  );
  clients.add(socket);
  console.log(`[mock-agent] client connected (${clients.size} total)`);

  socket.write(encodeTextFrame(envelope('hello', { agentVersion: 'mock-0.1.0', serverTime: new Date().toISOString() })));
  socket.write(
    encodeTextFrame(
      envelope('capabilities', {
        telemetryTickRate: 60,
        variables: { Speed: { available: true }, FuelLevel: { available: true } },
        sessionInfoSections: ['WeekendInfo', 'DriverInfo', 'SessionInfo'],
      }),
    ),
  );

  socket.on('close', () => {
    clients.delete(socket);
    console.log(`[mock-agent] client disconnected (${clients.size} total)`);
  });
  socket.on('error', () => clients.delete(socket));
});

function broadcast(frame) {
  const buf = encodeTextFrame(frame);
  for (const s of clients) {
    if (!s.destroyed) s.write(buf);
  }
}

let last = Date.now();
setInterval(() => {
  const now = Date.now();
  tick((now - last) / 1000);
  last = now;
  broadcast(envelope('liveSnapshot', snapshotPayload()));
}, 1000 / HZ);

setInterval(() => broadcast(envelope('heartbeat', { clients: clients.size })), 1000);

server.listen(PORT, () => {
  console.log(`[mock-agent] ws://localhost:${PORT}/live  (snapshots @ ${HZ} Hz, status @ /status)`);
});
