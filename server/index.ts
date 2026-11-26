// Starts the server. PORT (3000) and HOST (0.0.0.0) via environment variables. TRUST_PROXY=1 only behind a trusted proxy.
// Optional HTTPS (ADR 0014): TLS_CERT and TLS_KEY (file paths) turn on a second port, HTTPS_PORT (3443). The TV keeps using plain
// HTTP; the phone gets the HTTPS link in the QR code, which is what lets the pad be installed as an app.
// The `ludoteca` command (bin/ludoteca.js) sets LUDOTECA_CLI=1, which prints the QR code and hints, and LUDOTECA_OPEN=1, which also
// opens the TV page in this computer's browser (ADR 0026).
import os from 'node:os';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import QRCode from 'qrcode';
import { createApp } from './app.ts';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';
const { TLS_CERT, TLS_KEY } = process.env;
const httpsPort = TLS_CERT && TLS_KEY ? Number(process.env.HTTPS_PORT ?? 3443) : undefined;

const dev = process.env.LUDOTECA_DEV === '1'; // pnpm dev: hot reload, and games marked `draft` show up (ADR 0019)
const lan = Object.values(os.networkInterfaces())
  .flatMap((addresses) => addresses ?? [])
  .filter((address) => address.family === 'IPv4' && !address.internal)
  .map((address) => address.address)
  .sort((a, b) => Number(/^(192\.168|10)\./.test(b)) - Number(/^(192\.168|10)\./.test(a))); // home addresses first (Docker, VPN last)
const app = createApp({ httpsPort, dev, showDrafts: dev || undefined, lanHost: lan[0] });

/** Opens a page in the default browser; failure is not an error (headless machine, no browser). */
function openBrowser(url: string): void {
  const [command, ...args] =
    process.platform === 'win32' ? ['cmd', '/c', 'start', '', url] : [process.platform === 'darwin' ? 'open' : 'xdg-open', url];
  spawn(command, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
}

app.http.listen(port, host, async () => {
  if (dev) console.log('Ludoteca dev: hot reload on (CSS swaps in place, other files reload the page).');
  for (const ip of lan) console.log(`Ludoteca: http://${ip}:${port}/  (TV)  |  /pad  (phone)`);
  if (process.env.LUDOTECA_CLI !== '1') return;
  const pad = `http://${lan[0] ?? 'localhost'}:${port}/pad`;
  console.log(`\nNo celular (controle), leia o QR code ou abra ${pad}\n`);
  console.log(await QRCode.toString(pad, { type: 'terminal', small: true }));
  console.log(`Na TV, abra o navegador dela em http://${lan[0] ?? 'localhost'}:${port}/\nPara parar a Ludoteca: Ctrl+C.`);
  if (process.env.LUDOTECA_OPEN === '1') openBrowser(`http://localhost:${port}/`); // the QR on this page still carries the LAN address (lanHost)
});
if (httpsPort && TLS_CERT && TLS_KEY) {
  app.https({ cert: readFileSync(TLS_CERT), key: readFileSync(TLS_KEY) }).listen(httpsPort, host, () => {
    for (const ip of lan) console.log(`Ludoteca (HTTPS, installable pad): https://${ip}:${httpsPort}/pad`);
  });
} else {
  console.log('HTTPS off: the pad works in the browser but cannot be installed as an app (see docs/pwa.md).');
}
