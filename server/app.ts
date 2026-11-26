// Ludoteca HTTP + WebSocket server. Only native Node modules, plus `qrcode` (ADR 0004).
// Serves .ts files to the browser with the types stripped on the fly (ADR 0010) and Preact from node_modules (ADR 0009).
import http from 'node:http';
import https from 'node:https';
import { TLSSocket } from 'node:tls';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { randomInt } from 'node:crypto';
import { stripTypeScriptTypes } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { attachWebSocket } from './ws.ts';
import { createRooms } from './rooms.ts';
import { networkKey } from './net.ts';
import { games, themes } from '../games/index.ts';
import type { Rng } from '../games/types.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// URL prefix -> folder. The first one that has the file answers. Only these directories are public.
const MOUNTS: Array<[string, string]> = [['/games/', 'games'], ['/brand/', 'brand/final'], ['/', 'public'], ['/', 'brand/final/web']];
const PAGES: Record<string, string> = { '/': '/tv.html', '/pad': '/pad.html' };
// The single file from node_modules that is public: Preact + hooks + htm in one ES module.
const VENDOR: Record<string, string> = { '/vendor/preact.js': 'node_modules/htm/preact/standalone.module.js' };
const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.ts': 'text/javascript; charset=utf-8', // served with types stripped
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.webmanifest': 'application/manifest+json',
};
// No inline anything: everything comes from 'self'. The WebSocket is same-host. The QR SVG comes from the server and uses attributes only.
const CSP =
  "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; " +
  "base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

async function resolveFile(urlPath: string): Promise<string | null> {
  const vendor = VENDOR[urlPath];
  if (vendor) return path.join(ROOT, vendor);
  const relative = PAGES[urlPath] ?? urlPath;
  let decoded: string;
  try {
    decoded = decodeURIComponent(relative);
  } catch {
    return null;
  }
  if (decoded.includes('\0') || /\.test\.|(^|\/)\./.test(decoded)) return null; // tests and hidden files
  if (!CONTENT_TYPES[path.extname(decoded)]) return null;
  for (const [prefix, folder] of MOUNTS) {
    if (!decoded.startsWith(prefix)) continue;
    const base = path.join(ROOT, folder);
    const absolute = path.resolve(base, '.' + path.sep + decoded.slice(prefix.length));
    if (!absolute.startsWith(base + path.sep)) continue; // escapes the folder: ignore (path traversal)
    try {
      if ((await stat(absolute)).isFile()) return absolute;
    } catch {
      /* try the next mount */
    }
  }
  return null;
}

// .ts -> JavaScript for the browser. Types become spaces, so error line numbers stay right. Cached by modification time.
const stripped = new Map<string, { mtimeMs: number; code: string }>();
async function browserCode(file: string): Promise<string> {
  const { mtimeMs } = await stat(file);
  const hit = stripped.get(file);
  if (hit && hit.mtimeMs === mtimeMs) return hit.code;
  const code = stripTypeScriptTypes(await readFile(file, 'utf8'), { mode: 'strip' });
  stripped.set(file, { mtimeMs, code });
  return code;
}

export type AppOptions = {
  rng?: Rng;
  makeQr?: (url: string) => Promise<string>;
  showDrafts?: boolean;
  /** Port of the HTTPS server, when there is one. The QR code then points the phone to it, so the pad can be installed (ADR 0014). */
  httpsPort?: number;
};

export type Tls = { cert: string | Buffer; key: string | Buffer };

/** One app (rooms, routes, WebSocket) that can be served over plain HTTP (the TV) and, optionally, over HTTPS (the phone). */
export function createApp({
  rng = (n) => randomInt(n),
  makeQr = (url) => QRCode.toString(url, { type: 'svg', margin: 2 }),
  showDrafts = Boolean(process.env.LUDOTECA_DRAFTS), // games marked `draft` only show up with LUDOTECA_DRAFTS=1 (pnpm dev)
  httpsPort,
}: AppOptions = {}) {
  const rooms = createRooms({ games, themes, showDrafts, rng, makeQr });
  const trustProxy = Boolean(process.env.TRUST_PROXY);
  const networkOf = (req: http.IncomingMessage): string =>
    networkKey(trustProxy ? String(req.headers['x-forwarded-for'] ?? '').split(',')[0]?.trim() : req.socket.remoteAddress);

  const listener: http.RequestListener = async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', CSP);
    if (req.socket instanceof TLSSocket) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      return void res.end();
    }
    const file = await resolveFile(new URL(req.url ?? '/', 'http://x').pathname);
    if (!file) {
      res.writeHead(404);
      return void res.end();
    }
    const extension = path.extname(file);
    res.writeHead(200, { 'Content-Type': CONTENT_TYPES[extension] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    if (req.method === 'HEAD') return void res.end();
    if (extension === '.ts') return void res.end(await browserCode(file));
    createReadStream(file).pipe(res);
  };

  // Only accepts WebSocket on /ws and from the site itself (blocks third-party pages opening connections).
  const verify = (req: http.IncomingMessage): boolean => {
    if (new URL(req.url ?? '/', 'http://x').pathname !== '/ws') return false;
    if (!req.headers.origin) return true;
    try {
      return new URL(req.headers.origin).host === req.headers.host;
    } catch {
      return false;
    }
  };
  // The phone's link (QR): HTTPS when there is a secure server, so the pad can register its service worker and be installed.
  const baseUrl = (req: http.IncomingMessage): string =>
    httpsPort ? `https://${String(req.headers.host ?? '').replace(/:\d+$/, '')}:${httpsPort}` : `http://${req.headers.host}`;
  const wire = <S extends http.Server | https.Server>(server: S): S => {
    attachWebSocket(
      server,
      (conn, req) => {
        const query = new URL(req.url ?? '/', 'http://x').searchParams;
        const network = networkOf(req);
        if (query.has('tv')) rooms.connectTv(conn, { network, baseUrl: baseUrl(req) });
        else rooms.connectPad(conn, { network, roomId: query.get('room'), token: query.get('token') });
      },
      { maxPayload: 1024, verify },
    );
    return server;
  };

  return {
    http: wire(http.createServer(listener)),
    https: (tls: Tls): https.Server => wire(https.createServer(tls, listener)),
  };
}

/** Plain HTTP server only (what the tests and the TV use). */
export const createAppServer = (options: AppOptions = {}): http.Server => createApp(options).http;
