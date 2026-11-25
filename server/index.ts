// Starts the server. PORT (3000) and HOST (0.0.0.0) via environment variables. TRUST_PROXY=1 only behind a trusted proxy.
import os from 'node:os';
import { createAppServer } from './app.ts';

const port = Number(process.env.PORT ?? 3000);
createAppServer().listen(port, process.env.HOST ?? '0.0.0.0', () => {
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) console.log(`Ludoteca: http://${address.address}:${port}/  (TV)  |  /pad  (phone)`);
    }
  }
});
