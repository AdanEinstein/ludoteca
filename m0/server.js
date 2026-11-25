// M0: pareamento iniciado pelo celular + 1 OK na TV. Descartável, fora das regras astryx de propósito.
// Fluxo A (principal): celular abre /pad, vê as TVs da mesma rede, toca numa (ou entra direto se só há uma).
// Fluxo B (atalho de 1ª vez): celular escaneia o QR da TV, que traz ?r=<sala>.
// Nos dois, a TV precisa aceitar com OK; depois o token guardado no celular reconecta sozinho.
// ponytail: sala vive só enquanto a TV está conectada (recarregar a TV = sala nova), sem rate limit,
// sem zod. M3 adiciona validação de esquema e limite de taxa.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const QRCode = require('qrcode');
const netKey = require('./net');

const PORT = process.env.PORT || 3000;
const MAX_PADS = 8;
const MAX_PENDING = 3;
const NAMES = ['Lua', 'Sol', 'Estrela', 'Nuvem', 'Mar', 'Pipa', 'Bola', 'Foguete'];
const pages = { '/': 'tv.html', '/pad': 'pad.html' };
const rid = (bytes) => crypto.randomBytes(bytes).toString('hex');
const rooms = new Map(); // roomId -> { net, name, tv, pads: Map(id -> ws), pending: Map(id -> ws), tokens: Set }
const browsers = new Set(); // celulares olhando a lista de TVs

const send = (ws, m) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); };
const parse = (d) => { try { const m = JSON.parse(d); return m && typeof m === 'object' ? m : null; } catch { return null; } };
const deny = (ws) => { send(ws, { t: 'no' }); ws.close(); };
// TRUST_PROXY=1 só atrás de proxy confiável, senão x-forwarded-for é forjável.
const clientNet = (req) => netKey(process.env.TRUST_PROXY
  ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : req.socket.remoteAddress);

const tvsOf = (net) => [...rooms].filter(([, r]) => r.net === net).map(([r, room]) => ({ r, name: room.name }));
const pushList = (net) => {
  const list = tvsOf(net);
  for (const b of browsers) if (b.net === net) send(b, { t: 'tvs', list });
};

const server = http.createServer((req, res) => {
  const f = pages[req.url.split('?')[0]];
  console.log(`GET ${req.url} de ${req.socket.remoteAddress}`);
  if (!f) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  fs.createReadStream(path.join(__dirname, f)).pipe(res);
});

const wss = new WebSocketServer({ server, maxPayload: 1024 });
wss.on('connection', (ws, req) => {
  const q = new URL(req.url, 'http://x').searchParams;
  ws.id = rid(3);
  ws.net = clientNet(req);
  if (q.has('tv')) onTv(ws, req);
  else onPad(ws, q.get('r'), q.get('k'));
});

function onTv(ws, req) {
  const roomId = rid(5);
  const taken = tvsOf(ws.net).map((t) => t.name);
  const name = NAMES.find((n) => !taken.includes(n)) || `TV ${taken.length + 1}`;
  const room = { net: ws.net, name, tv: ws, pads: new Map(), pending: new Map(), tokens: new Set() };
  rooms.set(roomId, room);
  pushList(ws.net);

  ws.on('message', (d) => {
    const m = parse(d);
    if (!m) return;
    const p = room.pending.get(m.id);
    if (m.t === 'accept' && p) {
      room.pending.delete(m.id);
      if (room.pads.size >= MAX_PADS) return deny(p);
      const token = rid(16);
      room.tokens.add(token);
      room.pads.set(p.id, p);
      send(p, { t: 'ok', token });
    } else if (m.t === 'reject' && p) {
      room.pending.delete(m.id);
      deny(p);
    } else if (m.t === 'ack' && typeof m.ts === 'number') {
      send(room.pads.get(m.id), { t: 'ack', ts: m.ts });
    }
  });
  ws.on('close', () => {
    rooms.delete(roomId);
    pushList(ws.net);
    for (const p of [...room.pads.values(), ...room.pending.values()]) deny(p);
  });

  const url = `http://${req.headers.host}/pad?r=${roomId}`;
  QRCode.toString(url, { type: 'svg', margin: 2, color: { dark: '#000000', light: '#ffffff' } })
    .then((qr) => send(ws, { t: 'room', url, qr, name }));
}

function onPad(ws, roomId, token) {
  ws.on('message', (d) => {
    const m = parse(d);
    // só quem já foi aceito consegue tocar
    if (m && m.t === 'tap' && typeof m.ts === 'number' && ws.room && ws.room.pads.get(ws.id) === ws) {
      send(ws.room.tv, { t: 'tap', id: ws.id, ts: m.ts });
    }
  });
  ws.on('close', () => {
    browsers.delete(ws);
    if (!ws.room) return;
    ws.room.pending.delete(ws.id);
    ws.room.pads.delete(ws.id);
    send(ws.room.tv, { t: 'left', id: ws.id });
  });

  if (!roomId) { // modo lista: celular só vê as TVs da própria rede
    browsers.add(ws);
    return send(ws, { t: 'tvs', list: tvsOf(ws.net) });
  }
  const room = rooms.get(roomId);
  if (!room) return deny(ws);
  ws.room = room;

  if (token && room.tokens.has(token)) {
    if (room.pads.size >= MAX_PADS) return deny(ws);
    room.pads.set(ws.id, ws);
    send(ws, { t: 'ok', token });
  } else if (room.pending.size >= MAX_PENDING) {
    deny(ws);
  } else {
    room.pending.set(ws.id, ws);
    send(ws, { t: 'wait' });
    send(room.tv, { t: 'join', id: ws.id });
  }
}

server.listen(PORT, '0.0.0.0', () => {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list) {
      if (i.family === 'IPv4' && !i.internal) console.log(`TV: http://${i.address}:${PORT}/`);
    }
  }
});
