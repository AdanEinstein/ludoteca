// End to end: real server, Node native WebSocket clients, HTTP with fetch.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import https from 'node:https';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp, createAppServer } from '../app.ts';

const server = createAppServer({ rng: () => 2, makeQr: async () => '<svg id="qr"/>', showDrafts: true });
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address() as net.AddressInfo;
const base = `http://127.0.0.1:${port}`;
after(() => server.close());

type Message = { type: string; [key: string]: any };

function client(pathAndQuery: string) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}${pathAndQuery}`);
  const inbox: Message[] = [];
  const waiting: Array<(m: Message) => void> = [];
  ws.onmessage = (e) => {
    const message = JSON.parse(String(e.data)) as Message;
    const next = waiting.shift();
    if (next) next(message);
    else inbox.push(message);
  };
  return {
    ws,
    next: () => new Promise<Message>((resolve) => {
      const queued = inbox.shift();
      if (queued) resolve(queued);
      else waiting.push(resolve);
    }),
    say: (message: unknown) => ws.send(JSON.stringify(message)),
    opened: new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = reject;
    }),
  };
}

test('pages and static files, with security headers', async () => {
  for (const url of ['/', '/pad', '/base.css', '/client.ts', '/tv.ts', '/vendor/preact.js', '/games/numbers/tv.ts', '/games/numbers/tv.css', '/games/numbers/pad.css', '/games/numbers/logic.ts',
    '/brand/ludoteca-horizontal.svg', '/favicon.svg', '/site.webmanifest', '/pad.webmanifest', '/sw.ts', '/logo.ts', '/pad-menu.ts', '/game-host.ts',
    '/games/numbers/logo.svg', '/games/numbers/audio.ts']) {
    const r = await fetch(base + url);
    assert.equal(r.status, 200, url);
    await r.arrayBuffer();
  }
  const r = await fetch(base + '/');
  assert.match(r.headers.get('content-security-policy') ?? '', /default-src 'self'/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.match(r.headers.get('content-type') ?? '', /text\/html/);
  await r.arrayBuffer();
});

test('.ts is served as JavaScript with the types removed', async () => {
  const r = await fetch(base + '/games/numbers/logic.ts');
  assert.match(r.headers.get('content-type') ?? '', /text\/javascript/);
  const code = await r.text();
  assert.doesNotMatch(code, /export type |: NumbersState|import type /);
  assert.match(code, /export function reduce/);
  // the stripped file is valid JavaScript for the browser: it can be imported as a module
  const module = await import(`data:text/javascript;base64,${Buffer.from(code.replace(/from '\.\.\/types\.ts'/g, "from 'data:text/javascript,'")).toString('base64')}`);
  assert.equal(typeof module.create, 'function');
});

test('does not serve tests, hidden files, outside the public folders, nor path traversal', async () => {
  for (const url of ['/games/numbers/__test__/logic.test.ts', '/games/__test__/contract.test.ts', '/__test__/sw.test.ts', '/server/__test__/rooms.test.ts', '/server/app.ts', '/package.json', '/.git/config', '/%2e%2e/package.json',
    '/..%2fpackage.json', '/games/%2e%2e/server/app.ts', '/games/numbers/', '/missing.js', '/vendor/other.js', '/node_modules/htm/package.json']) {
    const r = await fetch(base + url);
    assert.equal(r.status, 404, url);
    await r.arrayBuffer();
  }
  // raw path with ../ (fetch normalizes it, so go through a socket)
  const statusLine = await new Promise<string>((resolve) => {
    const socket = net.connect(port, '127.0.0.1', () => socket.write('GET /games/../package.json HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n'));
    socket.once('data', (d) => {
      resolve(d.toString().split('\r\n')[0] ?? '');
      socket.destroy();
    });
  });
  assert.match(statusLine, / 404 /);
});

test('only GET and HEAD', async () => {
  const r = await fetch(base + '/', { method: 'POST', body: 'x' });
  assert.equal(r.status, 405);
  await r.arrayBuffer();
});

test('full flow: TV, phone, accept, game, reconnect', async () => {
  const tv = client('/ws?tv');
  await tv.opened;
  const room = await tv.next();
  assert.equal(room.type, 'room');
  assert.equal(room.qr, '<svg id="qr"/>');
  assert.equal((await tv.next()).type, 'catalog');
  assert.match(room.url, new RegExp(`^http://127\\.0\\.0\\.1:${port}/pad\\?room=`));

  // the phone opens the list, sees the TV and joins
  const browse = client('/ws?browse');
  await browse.opened;
  const tvs = await browse.next();
  assert.ok(tvs.list.some((item: { name: string }) => item.name === room.name));
  browse.ws.close();

  const id = new URL(room.url).searchParams.get('room');
  const pad = client(`/ws?room=${id}`);
  await pad.opened;
  assert.equal((await pad.next()).type, 'waiting');
  const request = await tv.next();
  assert.equal(request.type, 'join_request');
  tv.say({ type: 'accept', id: request.id });
  const ok = await pad.next();
  assert.equal(ok.type, 'ok');
  assert.equal((await pad.next()).type, 'catalog');
  assert.equal((await pad.next()).state, null, 'the menu');
  assert.equal((await tv.next()).count, 1);

  pad.say({ type: 'start', game: 'numbers', config: { max: 5 } });
  assert.equal((await pad.next()).state.target, 3);
  assert.equal((await tv.next()).state.target, 3);

  pad.say({ type: 'action', action: { type: 'choose', value: 3 } });
  assert.equal((await tv.next()).state.solved, true);
  assert.equal((await pad.next()).state.solved, true);

  // reconnect with a token: joins without a new request
  pad.ws.close();
  assert.equal((await tv.next()).type, 'players');
  assert.equal((await tv.next()).type, 'left');
  const pad2 = client(`/ws?room=${id}&token=${ok.token}`);
  await pad2.opened;
  assert.equal((await pad2.next()).type, 'ok');
  assert.equal((await pad2.next()).type, 'catalog');
  assert.equal((await pad2.next()).state.solved, true);

  tv.ws.close();
  pad2.ws.close();
});

test('a message above 1 KB drops the connection', async () => {
  const tv = client('/ws?tv');
  await tv.opened;
  const code = new Promise<number>((resolve) => {
    tv.ws.onclose = (e) => resolve(e.code);
  });
  tv.ws.send('x'.repeat(2000));
  assert.equal(await code, 1009);
});

test('the pad is installable: manifest within its scope, icons served, service worker is JavaScript', async () => {
  const manifest = (await (await fetch(base + '/pad.webmanifest')).json()) as {
    start_url: string; scope: string; display: string; icons: Array<{ src: string; sizes: string; purpose: string }>;
  };
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.start_url.startsWith(manifest.scope), 'start_url is inside the scope');
  assert.ok(manifest.icons.some((i) => i.sizes === '192x192') && manifest.icons.some((i) => i.sizes === '512x512'));
  assert.ok(manifest.icons.some((i) => i.purpose === 'maskable'));
  for (const icon of manifest.icons) {
    const r = await fetch(base + icon.src);
    assert.equal(r.status, 200, icon.src);
    assert.equal(r.headers.get('content-type'), 'image/png');
    await r.arrayBuffer();
  }
  const sw = await fetch(base + '/sw.ts');
  assert.match(sw.headers.get('content-type') ?? '', /text\/javascript/);
  assert.doesNotMatch(await sw.text(), /\btype Event_\b/, 'types are stripped');
  const page = await (await fetch(base + '/pad')).text();
  assert.match(page, /rel="manifest" href="\/pad\.webmanifest"/);
});

test('with an HTTPS port the QR link points to it, and the HTTPS server answers with HSTS', { skip: (() => { try { execFileSync('openssl', ['version']); return false; } catch { return true; } })() }, async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ludoteca-tls-'));
  try {
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost', '-keyout', path.join(dir, 'k.pem'), '-out', path.join(dir, 'c.pem')], { stdio: 'ignore' });
    const app = createApp({ rng: () => 2, makeQr: async () => '<svg/>', httpsPort: 3443 });
    const secure = app.https({ cert: readFileSync(path.join(dir, 'c.pem')), key: readFileSync(path.join(dir, 'k.pem')) });
    await new Promise<void>((resolve) => app.http.listen(0, '127.0.0.1', resolve));
    await new Promise<void>((resolve) => secure.listen(0, '127.0.0.1', resolve));
    const httpPort = (app.http.address() as net.AddressInfo).port;
    const httpsPort = (secure.address() as net.AddressInfo).port;

    const tv = new WebSocket(`ws://127.0.0.1:${httpPort}/ws?tv`);
    const room = await new Promise<{ url: string }>((resolve) => {
      tv.onmessage = (e) => {
        const message = JSON.parse(String(e.data)) as { type: string; url: string };
        if (message.type === 'room') resolve(message);
      };
    });
    assert.match(room.url, /^https:\/\/127\.0\.0\.1:3443\/pad\?room=[0-9a-f]{10}$/, 'the phone is sent to HTTPS, the TV stayed on HTTP');
    tv.close();

    const headers = await new Promise<http_IncomingHeaders>((resolve, reject) => {
      https.get({ host: '127.0.0.1', port: httpsPort, path: '/pad', rejectUnauthorized: false }, (res) => {
        res.resume();
        resolve(res.headers);
      }).on('error', reject);
    });
    assert.match(String(headers['strict-transport-security']), /max-age=/);
    app.http.close();
    secure.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
type http_IncomingHeaders = import('node:http').IncomingHttpHeaders;
