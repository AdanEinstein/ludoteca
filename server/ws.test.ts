// Native WebSocket tests. Real client = Node's global WebSocket; hostile cases = raw frames over node:net.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { randomBytes } from 'node:crypto';
import { attachWebSocket, type AttachOptions } from './ws.ts';

async function start(options: AttachOptions = {}) {
  const server = http.createServer((_req, res) => res.end('http'));
  const received: string[] = [];
  attachWebSocket(
    server,
    (conn) => {
      conn.on('message', (message: string) => {
        received.push(message);
        conn.send(`echo:${message}`);
      });
    },
    options,
  );
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { port: (server.address() as net.AddressInfo).port, received, stop: () => server.close() };
}

function maskedFrame(opcode: number, payload: Buffer = Buffer.alloc(0), { fin = true, mask = true } = {}): Buffer {
  const n = payload.length;
  const flags = (fin ? 0x80 : 0) | opcode;
  const head = n < 126 ? [flags, (mask ? 0x80 : 0) | n] : [flags, (mask ? 0x80 : 0) | 126, n >> 8, n & 255];
  const key = randomBytes(4);
  const body = mask ? Buffer.from(payload.map((v, i) => v ^ (key[i & 3] as number))) : payload;
  return Buffer.concat([Buffer.from(head), mask ? key : Buffer.alloc(0), body]);
}

type RawFrame = { opcode: number; payload: Buffer };

/** Opens a raw socket, does the handshake and returns helpers to send frames and read server frames. */
function raw(port: number, extraHeaders = ''): Promise<{
  handshake: string;
  send: (...args: Parameters<typeof maskedFrame>) => void;
  next: () => Promise<RawFrame>;
  end: () => void;
}> {
  return new Promise((resolve) => {
    const socket = net.connect(port, '127.0.0.1');
    let buffer = Buffer.alloc(0);
    let handshake: string | null = null;
    const waiters: Array<(frame: RawFrame) => void> = [];
    const api = {
      get handshake() {
        return handshake ?? '';
      },
      send: (...args: Parameters<typeof maskedFrame>) => void socket.write(maskedFrame(...args)),
      next: () =>
        new Promise<RawFrame>((res) => {
          waiters.push(res);
          drain();
        }),
      end: () => void socket.destroy(),
    };
    const drain = (): void => {
      if (handshake === null) {
        const i = buffer.indexOf('\r\n\r\n');
        if (i < 0) return;
        handshake = buffer.subarray(0, i).toString();
        buffer = buffer.subarray(i + 4);
        resolve(api);
      }
      while (waiters.length && buffer.length >= 2) {
        let n = (buffer[1] as number) & 0x7f;
        let offset = 2;
        if (n === 126) {
          if (buffer.length < 4) return;
          n = buffer.readUInt16BE(2);
          offset = 4;
        }
        if (buffer.length < offset + n) return;
        const frame = { opcode: (buffer[0] as number) & 0x0f, payload: buffer.subarray(offset, offset + n) };
        buffer = buffer.subarray(offset + n);
        waiters.shift()?.(frame);
      }
    };
    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      drain();
    });
    socket.write(
      `GET /ws HTTP/1.1\r\nHost: x\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${randomBytes(16).toString('base64')}\r\nSec-WebSocket-Version: 13\r\n${extraHeaders}\r\n`,
    );
  });
}

const closeCode = (frame: RawFrame): number => {
  assert.equal(frame.opcode, 0x8);
  return frame.payload.readUInt16BE(0);
};

test('echo with Node native WebSocket client', async () => {
  const s = await start();
  const ws = new WebSocket(`ws://127.0.0.1:${s.port}/ws`);
  const reply = await new Promise<unknown>((resolve, reject) => {
    ws.onopen = () => ws.send('olá ✓');
    ws.onmessage = (e) => resolve(e.data);
    ws.onerror = reject;
  });
  assert.equal(reply, 'echo:olá ✓');
  ws.close();
  s.stop();
});

test('a fragmented message is reassembled', async () => {
  const s = await start();
  const c = await raw(s.port);
  c.send(0x1, Buffer.from('par'), { fin: false });
  c.send(0x0, Buffer.from('t1'), { fin: true });
  assert.equal((await c.next()).payload.toString(), 'echo:part1');
  c.end();
  s.stop();
});

test('ping gets a pong with the same payload', async () => {
  const s = await start();
  const c = await raw(s.port);
  c.send(0x9, Buffer.from('hi'));
  const frame = await c.next();
  assert.equal(frame.opcode, 0xa);
  assert.equal(frame.payload.toString(), 'hi');
  c.end();
  s.stop();
});

test('an unmasked client frame closes with 1002', async () => {
  const s = await start();
  const c = await raw(s.port);
  c.send(0x1, Buffer.from('x'), { mask: false });
  assert.equal(closeCode(await c.next()), 1002);
  s.stop();
});

test('binary closes with 1003 and invalid UTF-8 with 1007', async () => {
  const s = await start();
  const a = await raw(s.port);
  a.send(0x2, Buffer.from([1, 2, 3]));
  assert.equal(closeCode(await a.next()), 1003);
  const b = await raw(s.port);
  b.send(0x1, Buffer.from([0xff, 0xfe]));
  assert.equal(closeCode(await b.next()), 1007);
  s.stop();
});

test('a message above the maximum closes with 1009 and never reaches the app', async () => {
  const s = await start({ maxPayload: 64 });
  const ws = new WebSocket(`ws://127.0.0.1:${s.port}/ws`);
  const code = await new Promise<number>((resolve) => {
    ws.onopen = () => ws.send('x'.repeat(500));
    ws.onclose = (e) => resolve(e.code);
  });
  assert.equal(code, 1009);
  assert.equal(s.received.length, 0);
  s.stop();
});

test('an invalid handshake answers 400 and verify=false answers 403', async () => {
  const s = await start({ verify: (req) => req.headers.origin !== 'http://evil.example' });
  const withoutKey = await new Promise<string>((resolve) => {
    const socket = net.connect(s.port, '127.0.0.1', () =>
      socket.write('GET /ws HTTP/1.1\r\nHost: x\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\n\r\n'),
    );
    socket.once('data', (d) => {
      resolve(d.toString().split('\r\n')[0] ?? '');
      socket.destroy();
    });
  });
  assert.match(withoutKey, /400/);

  const refused = await raw(s.port, 'Origin: http://evil.example\r\n');
  assert.match(refused.handshake, /403/); // refused before any frame
  s.stop();
});

test('plain HTTP keeps working on the same server', async () => {
  const s = await start();
  assert.equal(await (await fetch(`http://127.0.0.1:${s.port}/`)).text(), 'http');
  s.stop();
});
