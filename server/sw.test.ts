// The service worker script runs in a simulated worker scope (no browser): precache, network first, offline fallback, what it ignores.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

type Listener = (event: any) => void;

function boot(options: { online: boolean }) {
  const listeners = new Map<string, Listener>();
  const stores = new Map<string, Map<string, Response>>();
  const deleted: string[] = [];
  const cache = (name: string) => {
    const store = stores.get(name) ?? new Map<string, Response>();
    stores.set(name, store);
    return {
      addAll: async (urls: string[]) => urls.forEach((u) => store.set(new URL(u, 'https://x').href, new Response('shell:' + u))),
      put: async (request: Request, response: Response) => void store.set(request.url, response),
    };
  };
  let skipped = false;
  let claimed = false;
  const scope: Record<string, unknown> = {
    skipWaiting: async () => void (skipped = true),
    clients: { claim: async () => void (claimed = true) },
    addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
  };
  const sandbox = {
    self: scope,
    location: { origin: 'https://x' },
    caches: {
      open: async (name: string) => cache(name),
      keys: async () => [...stores.keys()],
      delete: async (name: string) => (deleted.push(name), stores.delete(name)),
      match: async (request: Request | string) => {
        const key = typeof request === 'string' ? new URL(request, 'https://x').href : request.url;
        for (const store of stores.values()) if (store.has(key)) return store.get(key)!.clone();
        return undefined;
      },
    },
    fetch: async (request: Request) => {
      if (!options.online) throw new TypeError('offline');
      return new Response('network:' + new URL(request.url).pathname);
    },
    Response, URL,
  };
  const code = stripTypeScriptTypes(readFileSync(new URL('../public/sw.ts', import.meta.url), 'utf8'), { mode: 'strip' });
  vm.runInNewContext(code, sandbox);
  const fire = async (type: string, request?: Request) => {
    let promise: Promise<unknown> | undefined;
    let answered: Promise<Response> | undefined;
    listeners.get(type)?.({ request, waitUntil: (p: Promise<unknown>) => (promise = p), respondWith: (p: Promise<Response>) => (answered = p) });
    await promise;
    return answered ? await answered : null;
  };
  return { fire, stores, deleted, state: () => ({ skipped, claimed }) };
}

const get = (path: string) => new Request('https://x' + path);

test('install precaches the pad shell and activates right away', async () => {
  const sw = boot({ online: true });
  await sw.fire('install');
  const [store] = [...sw.stores.values()];
  assert.ok(store?.has('https://x/pad') && store.has('https://x/pad.ts') && store.has('https://x/vendor/preact.js'));
  assert.equal(sw.state().skipped, true);
});

test('activate drops caches from older versions and takes control', async () => {
  const sw = boot({ online: true });
  sw.stores.set('ludoteca-pad-0', new Map());
  await sw.fire('install');
  await sw.fire('activate');
  assert.deepEqual(sw.deleted, ['ludoteca-pad-0']);
  assert.equal(sw.state().claimed, true);
});

test('online: the network wins (never an old game) and the answer is cached for later', async () => {
  const sw = boot({ online: true });
  await sw.fire('install');
  const response = await sw.fire('fetch', get('/games/numbers/pad.ts'));
  assert.equal(await response?.text(), 'network:/games/numbers/pad.ts');
  assert.ok([...sw.stores.values()][0]?.has('https://x/games/numbers/pad.ts'));
});

test('offline: cached files still open, and a page navigation falls back to the pad shell', async () => {
  const sw = boot({ online: false });
  await sw.fire('install');
  assert.equal(await (await sw.fire('fetch', get('/base.css')))?.text(), 'shell:/base.css');
  const navigation = new Request('https://x/pad?room=abc');
  Object.defineProperty(navigation, 'mode', { value: 'navigate' });
  assert.equal(await (await sw.fire('fetch', navigation))?.text(), 'shell:/pad');
  assert.equal((await sw.fire('fetch', get('/never-cached.png')))?.type, 'error');
});

test('it does not touch the WebSocket, other origins or non-GET requests', async () => {
  const sw = boot({ online: true });
  await sw.fire('install');
  assert.equal(await sw.fire('fetch', get('/ws')), null);
  assert.equal(await sw.fire('fetch', new Request('https://other.example/a.js')), null);
  assert.equal(await sw.fire('fetch', new Request('https://x/pad', { method: 'POST', body: 'x' })), null);
});
