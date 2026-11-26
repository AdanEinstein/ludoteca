// Starts the server. PORT (3000) and HOST (0.0.0.0) via environment variables. TRUST_PROXY=1 only behind a trusted proxy.
// Optional HTTPS (ADR 0014): TLS_CERT and TLS_KEY (file paths) turn on a second port, HTTPS_PORT (3443). The TV keeps using plain
// HTTP; the phone gets the HTTPS link in the QR code, which is what lets the pad be installed as an app.
import os from 'node:os';
import { readFileSync } from 'node:fs';
import { createApp } from './app.ts';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';
const { TLS_CERT, TLS_KEY } = process.env;
const httpsPort = TLS_CERT && TLS_KEY ? Number(process.env.HTTPS_PORT ?? 3443) : undefined;

const dev = process.env.LUDOTECA_DEV === '1'; // pnpm dev: hot reload, and games marked `draft` show up (ADR 0019)
const app = createApp({ httpsPort, dev, showDrafts: dev || undefined });
const lan = Object.values(os.networkInterfaces())
  .flatMap((addresses) => addresses ?? [])
  .filter((address) => address.family === 'IPv4' && !address.internal)
  .map((address) => address.address);

app.http.listen(port, host, () => {
  if (dev) console.log('Ludoteca dev: hot reload on (CSS swaps in place, other files reload the page).');
  for (const ip of lan) console.log(`Ludoteca: http://${ip}:${port}/  (TV)  |  /pad  (phone)`);
});
if (httpsPort && TLS_CERT && TLS_KEY) {
  app.https({ cert: readFileSync(TLS_CERT), key: readFileSync(TLS_KEY) }).listen(httpsPort, host, () => {
    for (const ip of lan) console.log(`Ludoteca (HTTPS, installable pad): https://${ip}:${httpsPort}/pad`);
  });
} else {
  console.log('HTTPS off: the pad works in the browser but cannot be installed as an app (see docs/pwa.md).');
}
