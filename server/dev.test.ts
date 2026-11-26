// Hot reload (dev only, ADR 0019): real watcher on a temp folder, real HTTP, and the app wiring.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createDevReloader } from './dev.ts';
import { createAppServer } from './app.ts';

const tick = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

/** Opens the event stream and collects what arrives. */
async function listen(base: string) {
  const messages: Array<{ kind: string; path: string }> = [];
  const controller = new AbortController();
  const response = await fetch(base + '/__dev/events', { signal: controller.signal });
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  void (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) return;
        for (const match of decoder.decode(value).matchAll(/^data: (.*)$/gm)) messages.push(JSON.parse(match[1] as string));
      }
    } catch {
      /* aborted */
    }
  })();
  return { messages, response, stop: () => controller.abort() };
}

test('a changed .css is a css message with its URL; any other file is a reload; tests, docs and hidden files are ignored', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ludoteca-dev-'));
  mkdirSync(path.join(dir, 'game'));
  mkdirSync(path.join(dir, '_scratch'));
  const reloader = createDevReloader({ dirs: [{ dir, prefix: '/x/' }], debounceMs: 30 });
  const server = http.createServer((req, res) => {
    if (!reloader.handle(req, res)) res.writeHead(404).end();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as net.AddressInfo).port}`;
  try {
    const stream = await listen(base);
    assert.equal(stream.response.headers.get('content-type'), 'text/event-stream');
    await tick(100);

    writeFileSync(path.join(dir, 'game', 'tv.css'), 'a{}');
    await tick();
    assert.deepEqual(stream.messages, [{ kind: 'css', path: '/x/game/tv.css' }]);

    writeFileSync(path.join(dir, 'game', 'tv.ts'), 'export {}');
    await tick();
    assert.deepEqual(stream.messages.at(-1), { kind: 'reload', path: '' });
    const count = stream.messages.length;

    for (const ignored of ['a.test.ts', 'NOTES.md', '.hidden', '_scratch/a.js']) writeFileSync(path.join(dir, ignored), 'x');
    await tick();
    assert.equal(stream.messages.length, count, 'ignored files send nothing');

    // changes that arrive together become one message, and a reload wins over a css swap
    writeFileSync(path.join(dir, 'a.css'), 'a{}');
    writeFileSync(path.join(dir, 'b.ts'), 'export {}');
    await tick();
    assert.deepEqual(stream.messages.slice(count), [{ kind: 'reload', path: '' }]);
    stream.stop();
  } finally {
    reloader.close();
    server.close();
    server.closeAllConnections();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('inject adds the dev client before </body>, once, and the client is served', async () => {
  const reloader = createDevReloader({ dirs: [] });
  const html = reloader.inject('<html><body><main></main></body></html>');
  assert.match(html, /<script type="module" src="\/__dev\/client\.js"><\/script>\n<\/body>/);
  assert.equal(html.match(/__dev\/client\.js/g)?.length, 1);
  assert.match(reloader.inject('<p>no body tag</p>'), /client\.js/);
  reloader.close();
});

test('the app serves the dev client and injects it only when dev is on; in production those routes do not exist', async () => {
  for (const dev of [true, false]) {
    const server = createAppServer({ dev, watchDirs: [], makeQr: async () => '<svg/>' });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${(server.address() as net.AddressInfo).port}`;
    try {
      const page = await (await fetch(base + '/pad')).text();
      const client = await fetch(base + '/__dev/client.js');
      const events = await fetch(base + '/__dev/events', { signal: AbortSignal.timeout(300) }).then((r) => r.status, () => 'none');
      if (dev) {
        assert.match(page, /__dev\/client\.js/);
        assert.equal(client.status, 200);
        assert.match(await client.text(), /EventSource\('\/__dev\/events'\)/);
        assert.equal(events, 200);
      } else {
        assert.doesNotMatch(page, /__dev/);
        assert.equal(client.status, 404);
        await client.arrayBuffer();
        assert.equal(events, 404);
      }
    } finally {
      server.close();
      server.closeAllConnections();
    }
  }
});
