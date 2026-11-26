// Hot reload for development only (ADR 0019). Native Node: `fs.watch` on the public folders and Server-Sent Events to the pages.
// A changed .css file is swapped in place (the game keeps running); any other file reloads the page. When the server itself
// restarts (`node --watch`), the page notices the broken connection and reloads when it comes back, so new server code shows up too.
// Never loaded unless LUDOTECA_DEV=1: in production the routes below do not exist.
import { watch, type FSWatcher } from 'node:fs';
import type http from 'node:http';
import path from 'node:path';

/** A folder on disk and the URL prefix it is served under (same idea as MOUNTS in app.ts). */
export type WatchDir = { dir: string; prefix: string };
export type Change = { kind: 'css' | 'reload'; path: string };

// Hidden files, folders starting with `_` (scratch space), tests and docs never reload the page.
const IGNORED = /(^|\/)[._]|\.test\.|\.md$/; // `_` also covers __test__ folders

const CLIENT = `// Ludoteca dev client (hot reload). Served only when the server runs in dev mode.
const source = new EventSource('/__dev/events');
let wasDown = false;
source.onerror = () => { wasDown = true; };
source.onopen = () => { if (wasDown) location.reload(); }; // the server restarted: load the new code
source.onmessage = (event) => {
  const change = JSON.parse(event.data);
  if (change.kind === 'css') {
    const links = [...document.querySelectorAll('link[rel=stylesheet]')].filter((link) => new URL(link.href).pathname === change.path);
    if (links.length === 0) return location.reload();
    for (const link of links) link.href = change.path + '?t=' + Date.now();
    console.log('[dev] css', change.path);
  } else {
    location.reload();
  }
};
`;

export function createDevReloader({ dirs, debounceMs = 80 }: { dirs: WatchDir[]; debounceMs?: number }) {
  const clients = new Set<http.ServerResponse>();
  const watchers: FSWatcher[] = [];
  const pending = new Map<string, Change['kind']>();
  let timer: NodeJS.Timeout | null = null;

  const send = (change: Change): void => {
    for (const client of clients) client.write(`data: ${JSON.stringify(change)}\n\n`);
  };
  // Changes that arrive together (an editor saving several files) become one message: a reload wins over CSS swaps.
  const flush = (): void => {
    timer = null;
    const changes = [...pending].map(([file, kind]): Change => ({ kind, path: file }));
    pending.clear();
    if (changes.some((change) => change.kind === 'reload')) send({ kind: 'reload', path: '' });
    else for (const change of changes) send(change);
  };
  const changed = (file: string): void => {
    pending.set(file, path.extname(file) === '.css' ? 'css' : 'reload');
    timer ??= setTimeout(flush, debounceMs);
  };

  for (const { dir, prefix } of dirs) {
    try {
      watchers.push(
        watch(dir, { recursive: true }, (_event, filename) => {
          if (!filename || IGNORED.test(filename.split(path.sep).join('/'))) return;
          changed(prefix + filename.split(path.sep).join('/'));
        }),
      );
    } catch {
      /* the folder does not exist: nothing to watch there */
    }
  }
  const keepAlive = setInterval(() => {
    for (const client of clients) client.write(': ping\n\n'); // proxies and browsers drop idle streams
  }, 15000);
  keepAlive.unref();

  return {
    /** Answers the two dev routes. Returns false for anything else, so the normal server handles it. */
    handle(req: http.IncomingMessage, res: http.ServerResponse): boolean {
      const { pathname } = new URL(req.url ?? '/', 'http://x');
      if (pathname === '/__dev/client.js') {
        res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(CLIENT);
        return true;
      }
      if (pathname === '/__dev/events') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
        res.write('retry: 500\n\n'); // reconnect fast after a server restart
        clients.add(res);
        req.on('close', () => clients.delete(res));
        return true;
      }
      return false;
    },
    /** Adds the dev client to an HTML page. */
    inject(html: string): string {
      const tag = '<script type="module" src="/__dev/client.js"></script>';
      return html.includes('</body>') ? html.replace('</body>', `  ${tag}\n</body>`) : html + tag;
    },
    close(): void {
      if (timer) clearTimeout(timer);
      clearInterval(keepAlive);
      for (const watcher of watchers) watcher.close();
      for (const client of clients) client.end();
      clients.clear();
    },
  };
}
