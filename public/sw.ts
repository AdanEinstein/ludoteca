// Service worker of the phone controller (ADR 0014). Network first: the games change often and we never want to serve an old game
// by accident. When the network is down, the shell opens from the cache (and shows "Reconectando…" until the server is back).
// It never touches the WebSocket (`/ws`), which is not HTTP.
type Event_ = { waitUntil(promise: Promise<unknown>): void; respondWith?(response: Promise<Response>): void; request: Request };
const scope = self as unknown as {
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
  addEventListener(type: string, listener: (event: Event_) => void): void;
};

const CACHE = 'ludoteca-pad-1'; // bump to drop everything cached by an older version
const SHELL = ['/pad', '/pad.ts', '/client.ts', '/game-host.ts', '/pad-menu.ts', '/storage.ts', '/logo.ts', '/base.css', '/pad.css', '/vendor/preact.js', '/pad.webmanifest', '/icon-192.png'];

scope.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => scope.skipWaiting()));
});

scope.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
      .then(() => scope.clients.claim()),
  );
});

scope.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== location.origin || url.pathname === '/ws') return; // not ours: the browser handles it
  event.respondWith?.(
    fetch(request).then(
      (response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      },
      // offline: the same request from the cache; a page navigation falls back to the pad shell
      () => caches.match(request).then((hit) => hit ?? (request.mode === 'navigate' ? caches.match('/pad') : undefined)).then((hit) => hit ?? Response.error()),
    ),
  );
});
