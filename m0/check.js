// Smoke test do pareamento e do relay. Rode com o servidor de pé (pnpm m0).
const WebSocket = require('ws');
const assert = require('assert');
const port = process.env.PORT || 3000;

function client(qs) {
  const ws = new WebSocket(`ws://localhost:${port}/ws?${qs}`);
  const inbox = [], waiting = [];
  ws.on('message', (d) => { const m = JSON.parse(d); waiting.length ? waiting.shift()(m) : inbox.push(m); });
  ws.next = () => new Promise((res) => (inbox.length ? res(inbox.shift()) : waiting.push(res)));
  ws.say = (m) => ws.send(JSON.stringify(m));
  return ws;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

setTimeout(() => { console.error('FALHOU: timeout'); process.exit(1); }, 5000);

(async () => {
  const tv = client('tv');
  const room = await tv.next();
  assert.equal(room.t, 'room');
  assert(room.qr.startsWith('<svg'));
  const r = new URL(room.url).searchParams.get('r');

  // agrupamento por rede
  const netKey = require('./net');
  assert.equal(netKey('192.168.1.5'), 'lan');
  assert.equal(netKey('::ffff:10.0.0.2'), 'lan');
  assert.equal(netKey('::1'), 'lan');
  assert.equal(netKey('fe80::1'), 'lan');
  assert.equal(netKey('100.112.130.22'), 'lan');
  assert.equal(netKey('172.32.0.1'), '172.32.0.1', '172.32 é público');
  assert.equal(netKey('177.1.2.3'), '177.1.2.3');
  assert.equal(netKey('2804:14d:1:2:aaaa::1'), netKey('2804:14d:1:2:bbbb::9'), 'mesmo /64 = mesma casa');
  assert.notEqual(netKey('2804:14d:1:3::1'), netKey('2804:14d:1:2::1'));

  // modo lista: celular vê a TV, e a lista se atualiza quando outra TV entra/sai
  const browse = client('browse');
  const l1 = await browse.next();
  assert.equal(l1.t, 'tvs');
  assert(l1.list.some((x) => x.r === r && x.name === room.name));
  const tv2 = client('tv');
  const room2 = await tv2.next();
  assert.notEqual(room2.name, room.name, 'nomes de TV não podem repetir');
  assert.equal((await browse.next()).list.length, l1.list.length + 1);
  tv2.close();
  assert.equal((await browse.next()).list.length, l1.list.length);

  assert.equal((await client('r=inexistente').next()).t, 'no', 'sala inexistente deve negar');

  // pad novo: espera, TV vê o pedido, aceita, pad recebe token
  const pad = client(`r=${r}`);
  assert.equal((await pad.next()).t, 'wait');
  const join = await tv.next();
  assert.equal(join.t, 'join');
  tv.say({ t: 'accept', id: join.id });
  const ok = await pad.next();
  assert.equal(ok.t, 'ok');
  assert(ok.token);

  // toque -> TV -> ack -> pad
  pad.say({ t: 'tap', ts: 42 });
  const tap = await tv.next();
  assert.equal(tap.t, 'tap');
  assert.equal(tap.ts, 42);
  tv.say({ t: 'ack', id: tap.id, ts: 42 });
  assert.deepEqual(await pad.next(), { t: 'ack', ts: 42 });

  // reconexão com token: entra sem novo aceite
  pad.close();
  assert.equal((await tv.next()).t, 'left');
  const pad2 = client(`r=${r}&k=${ok.token}`);
  assert.equal((await pad2.next()).t, 'ok');

  // pad pendente não consegue tocar, e recusa fecha a conexão
  const pad3 = client(`r=${r}`);
  assert.equal((await pad3.next()).t, 'wait');
  const join3 = await tv.next();
  assert.equal(join3.t, 'join', 'pad com token não deve gerar novo pedido');
  pad3.say({ t: 'tap', ts: 1 });
  await sleep(50);
  tv.say({ t: 'reject', id: join3.id });
  assert.equal((await pad3.next()).t, 'no');
  assert.equal((await tv.next()).t, 'left', 'toque de pad pendente não pode chegar na TV');

  console.log('OK: rede, lista de TVs, pareamento, aceite, toque, reconexão com token, recusa');
  process.exit(0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(1); });
