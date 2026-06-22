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
const TOTAL_LAPS = 120;        // enduro-length so the tank-aware stint plan has stops to show
const BURN_PER_LAP = 2.65;
const USABLE_TANK = 60;        // usable litres (stand-in for SessionInfo DriverCarFuelMaxLtr × maxFill)
// Start a few laps into a stint so the fuel estimate is already populated (a fresh start would sit in
// the "gathering clean laps" state for ~2 laps). Fuel reflects laps already burned.
const START_LAP = 6;
const player = { carIdx: 12, fuel: 60.0 - (START_LAP - 1) * BURN_PER_LAP, lap: START_LAP, lapDistPct: 0.0, lapTimeSec: 105 };
// A small multi-class field. `offset` places each car relative to the player on track (in lap
// fraction; +ahead/-behind); `lapOffset` lets a car be a lap up/down to exercise lapped traffic.
// Names are fabricated (not real PII) so the leaderboard looks realistic.
const others = [
  { carIdx: 22, num: '22', name: 'A. Rossi',   team: 'Vapor GTP',        cls: 'GTP', clsId: 4011, pos: 1, clsPos: 1, lapTime: 92.1,  best: 91.4,  offset: 0.40,  lapOffset: 0,  pit: false },
  { carIdx: 5,  num: '5',  name: 'K. Tanaka',  team: 'Nishi Motorsport', cls: 'GTP', clsId: 4011, pos: 2, clsPos: 2, lapTime: 92.6,  best: 91.9,  offset: 0.63,  lapOffset: 0,  pit: false },
  { carIdx: 7,  num: '7',  name: 'M. Delgado', team: 'Crest GT',         cls: 'GT3', clsId: 2708, pos: 4, clsPos: 2, lapTime: 105.5, best: 105.0, offset: 0.05,  lapOffset: 0,  pit: false },
  { carIdx: 3,  num: '3',  name: 'L. Berg',    team: 'Northpoint',       cls: 'GT3', clsId: 2708, pos: 5, clsPos: 3, lapTime: 105.9, best: 105.3, offset: -0.04, lapOffset: 0,  pit: false },
  { carIdx: 11, num: '11', name: 'S. Okafor',  team: 'Vantage',          cls: 'GT3', clsId: 2708, pos: 6, clsPos: 4, lapTime: 106.3, best: 105.6, offset: 0.78,  lapOffset: 0,  pit: true  },
  { carIdx: 9,  num: '9',  name: 'D. Morel',   team: 'Ardent',           cls: 'GT3', clsId: 2708, pos: 7, clsPos: 5, lapTime: 106.1, best: 105.5, offset: -0.18, lapOffset: -1, pit: false },
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
    c.lapDistPct = (player.lapDistPct + c.offset + 1) % 1; // +1 keeps negative offsets in [0,1)
  }
}
tick(0); // seed each car's starting track position

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

// Stand-in for the C# StintPlanner: tank-aware whole-race plan (stops + stint length). Same math as
// packages/strategy-engine/Fuel/StintPlanner.cs so the dashboard has an enduro plan to render.
function stintPlan(fe) {
  if (!fe || fe.fuelBurnPerLapLiters == null || fe.raceLapsToGo == null) return null;
  const burn = fe.fuelBurnPerLapLiters;
  if (burn <= 0 || USABLE_TANK <= 0 || fe.raceLapsToGo < 0) return null;
  const totalToFinish = fe.raceLapsToGo * burn;
  const deficit = totalToFinish - player.fuel;
  const stops = deficit <= 0 ? 0 : Math.ceil(deficit / USABLE_TANK);
  return {
    maxLapsPerStint: Math.floor(USABLE_TANK / burn),
    stopsRemaining: stops,
    canFinishOnCurrentFuel: stops === 0,
    fuelToAddTotalLiters: Number(Math.max(0, deficit).toFixed(2)),
    totalFuelToFinishLiters: Number(totalToFinish.toFixed(2)),
    lapsOnCurrentFuel: Number((player.fuel / burn).toFixed(2)),
  };
}

// Stand-in for the C# CoachingSnapshotBuilder: consistency + the latest lap's delta-to-reference with
// time-loss zones, in the same contract shape, so the dashboard CoachingWidget + track-map overlay
// have data to render. The delta curve ramps through the two loss zones.
function coaching() {
  const bins = 50;
  const zones = [
    { startPct: 0.33, endPct: 0.45, secondsLost: 0.9 }, // a slow mid-lap complex
    { startPct: 0.7, endPct: 0.78, secondsLost: 0.5 },  // a missed apex late in the lap
  ];
  const cumulative = [];
  let acc = 0;
  for (let i = 0; i < bins; i++) {
    const pct = i / bins;
    for (const z of zones) {
      if (pct >= z.startPct && pct < z.endPct) acc += z.secondsLost / ((z.endPct - z.startPct) * bins);
    }
    cumulative.push(Number(acc.toFixed(3)));
  }
  return {
    referenceLap: Math.max(1, player.lap - 4),
    lapCount: Math.max(1, player.lap - 1),
    bestLapSec: 104.8,
    meanLapSec: 105.2,
    stdDevSec: 0.31,
    spreadSec: 0.9,
    lastLap: {
      lap: Math.max(1, player.lap - 1),
      finalDeltaSec: Number(acc.toFixed(2)),
      cumulativeDeltaSec: cumulative,
      lossZones: zones,
    },
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
      carNumber: '42',
      driverName: 'You',
      teamName: 'JayBytes Racing',
      className: 'GT3',
      classId: 2708,
      position: 3,
      classPosition: 1,
      lap: player.lap,
      lapCompleted: player.lap - 1,
      lapDistPct: Number(player.lapDistPct.toFixed(4)),
      lastLapTimeSec: 105.2,
      bestLapTimeSec: 104.8,
      estTimeToCurrentLocationSec: Number((player.lapDistPct * player.lapTimeSec).toFixed(2)),
      speedKph: Number(speedKph.toFixed(1)),
      gear: Math.min(6, Math.max(1, Math.round(speedKph / 35))),
      rpm: Number(rpm.toFixed(0)),
      fuelLevelLiters: Number(player.fuel.toFixed(2)),
    }),
    cars: others.map((c) =>
      car(c.carIdx, {
        carNumber: c.num,
        driverName: c.name,
        teamName: c.team,
        className: c.cls,
        classId: c.clsId,
        position: c.pos,
        classPosition: c.clsPos,
        lap: player.lap + c.lapOffset,
        lapCompleted: player.lap + c.lapOffset - 1,
        lapDistPct: Number(c.lapDistPct.toFixed(4)),
        lastLapTimeSec: c.lapTime,
        bestLapTimeSec: c.best,
        // iRacing's CarIdxEstTime is on a single common track-time basis (so cars are comparable),
        // NOT each car's personal lap time — use the player's lap as that reference so the relative
        // gap wraps correctly at S/F instead of flipping sign for cars near the line.
        estTimeToCurrentLocationSec: Number((c.lapDistPct * player.lapTimeSec).toFixed(2)),
        onPitRoad: c.pit,
      }),
    ),
    strategy: (() => { const fuel = fuelEstimate(); return { fuel, stintPlan: stintPlan(fuel) }; })(),
    coaching: coaching(),
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
