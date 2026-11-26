#!/usr/bin/env node
// The `ludoteca` command (npx github:AdanEinstein/ludoteca). Plain JavaScript on purpose: Node refuses to strip types from .ts files
// under node_modules, which is where npx puts the package. So when we are there, we first copy the app to a temp folder (ADR 0026).
import { cpSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Ludoteca: jogos na TV, com o celular de controle.

Uso: ludoteca [--port 3000] [--no-open]

  --port, -p   porta do servidor (padrão 3000; com 80 o endereço da TV fica só o IP)
  --no-open    não abre o navegador deste computador`);
  process.exit(0);
}
if (Number(process.versions.node.split('.')[0]) < 26) {
  console.error(`A Ludoteca precisa do Node 26 ou mais novo (este é o ${process.versions.node}). Baixe em https://nodejs.org`);
  process.exit(1);
}

const flag = args.findIndex((a) => a === '--port' || a === '-p');
if (flag >= 0 && args[flag + 1]) process.env.PORT = args[flag + 1];
process.env.LUDOTECA_CLI = '1';
if (!args.includes('--no-open')) process.env.LUDOTECA_OPEN = '1';

let app = root;
if (root.split(path.sep).includes('node_modules')) {
  app = mkdtempSync(path.join(tmpdir(), 'ludoteca-'));
  for (const dir of ['server', 'games', 'public', 'brand/final']) {
    cpSync(path.join(root, dir), path.join(app, dir), { recursive: true, filter: (file) => !file.includes('__test__') });
  }
  cpSync(path.join(root, 'package.json'), path.join(app, 'package.json'));
  symlinkSync(path.dirname(root), path.join(app, 'node_modules'), 'junction'); // qrcode and htm, installed next to us
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => process.exit());
  process.on('exit', () => rmSync(app, { recursive: true, force: true }));
}
await import(pathToFileURL(path.join(app, 'server', 'index.ts')).href);
