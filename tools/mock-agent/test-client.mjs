// Dependency-free WebSocket client to verify the mock agent (or the real agent) speaks the
// contract. Connects, performs the RFC 6455 handshake, decodes a few text frames, and prints them.
//
// Usage:  node tools/mock-agent/test-client.mjs [ws://localhost:5174/live] [--frames 6]

import http from 'node:http';
import crypto from 'node:crypto';

const url = new URL(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'ws://localhost:5174/live');
const framesArgIdx = process.argv.indexOf('--frames');
const MAX_FRAMES = framesArgIdx > -1 ? Number(process.argv[framesArgIdx + 1]) : 6;

const key = crypto.randomBytes(16).toString('base64');
const req = http.request({
  hostname: url.hostname,
  port: url.port || 80,
  path: url.pathname,
  headers: {
    Connection: 'Upgrade',
    Upgrade: 'websocket',
    'Sec-WebSocket-Key': key,
    'Sec-WebSocket-Version': '13',
  },
});

let seen = 0;
req.on('upgrade', (res, socket) => {
  console.log(`[client] connected to ${url.href}\n`);
  let buf = Buffer.alloc(0);
  socket.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    // Minimal unmasked text-frame decoder (server frames are unmasked per RFC 6455).
    while (buf.length >= 2) {
      const len0 = buf[1] & 0x7f;
      let offset = 2;
      let len = len0;
      if (len0 === 126) {
        if (buf.length < 4) break;
        len = buf.readUInt16BE(2);
        offset = 4;
      } else if (len0 === 127) {
        if (buf.length < 10) break;
        len = Number(buf.readBigUInt64BE(2));
        offset = 10;
      }
      if (buf.length < offset + len) break;
      const payload = buf.subarray(offset, offset + len).toString('utf8');
      buf = buf.subarray(offset + len);
      try {
        const msg = JSON.parse(payload);
        if (msg.type === 'liveSnapshot') {
          const p = msg.player ?? msg.payload?.player;
          console.log(
            `seq ${msg.sequence}  ${msg.type}  lap=${p.lap} dist=${p.lapDistPct} ` +
              `speed=${p.speedKph}kph fuel=${p.fuelLevelLiters}L cars=${msg.payload.cars.length}`,
          );
          if (++seen >= MAX_FRAMES) {
            console.log(`\n[client] OK — received ${seen} liveSnapshot frames, contract looks valid.`);
            socket.end();
            process.exit(0);
          }
        } else {
          console.log(`seq ${msg.sequence}  ${msg.type}`);
        }
      } catch {
        console.log('[client] non-JSON frame:', payload.slice(0, 60));
      }
    }
  });
});
req.on('error', (e) => {
  console.error('[client] connection error:', e.message);
  process.exit(1);
});
req.end();
