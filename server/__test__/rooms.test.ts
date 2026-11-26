// Pairing and game tests with fake connections (no network).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createRooms, type Conn, type RoomsOptions } from '../rooms.ts';
import { networkKey } from '../net.ts';
import * as numbers from '../../games/numbers/logic.ts';
import type { GameModule } from '../../games/types.ts';

type Sent = { type: string; [key: string]: any };

class FakeConn extends EventEmitter implements Conn {
  open = true;
  sent: Sent[] = [];
  closedWith: number | null = null;
  send(text: string): void {
    this.sent.push(JSON.parse(text));
  }
  close(code = 1000): void {
    if (!this.open) return;
    this.open = false;
    this.closedWith = code;
    queueMicrotask(() => this.emit('close'));
  }
  say(message: unknown): void {
    this.emit('message', typeof message === 'string' ? message : JSON.stringify(message));
  }
  last(type: string): Sent | undefined {
    return this.sent.findLast((m) => m.type === type);
  }
  count(type: string): number {
    return this.sent.filter((m) => m.type === type).length;
  }
}

// A table game made only to exercise seats, join/leave hooks and per-viewer state (ADR 0012). Players 2 to 3.
const duo: GameModule = {
  meta: { id: 'duo', name: 'Dupla', theme: 'board', players: { min: 2, max: 3 }, actions: ['poke'] },
  create: ({ players }) => ({ game: 'duo', seats: players, pokes: [] as number[], secret: 'hidden' }),
  reduce: (state, action, { player }) => (action.type === 'poke' ? { ...state, pokes: [...(state.pokes as number[]), player] } : state),
  join: (state, player) => ({ ...state, seats: [...(state.seats as number[]), player].sort() }),
  leave: (state, player) => ({ ...state, seats: (state.seats as number[]).filter((seat) => seat !== player) }),
  view: (state, viewer) => {
    const { secret, ...open } = state;
    return viewer === 'tv' ? state : open;
  },
};
const themes = { kids: 'Crianças', board: 'Tabuleiro' };

const setup = (options: Partial<RoomsOptions> = {}) => {
  // fixed rng: first-round target = 3 (max 5, rng(5) = 2)
  const rooms = createRooms({
    games: { numbers, duo },
    themes,
    showDrafts: true,
    rng: () => 2,
    makeQr: async () => '<svg/>',
    ...options,
  });
  const tv = (network = 'lan') => {
    const conn = new FakeConn();
    rooms.connectTv(conn, { network, baseUrl: 'http://tv.local:3000' });
    return conn;
  };
  const pad = (args: { roomId?: string; token?: string } = {}) => {
    const conn = new FakeConn();
    rooms.connectPad(conn, { network: 'lan', ...args });
    return conn;
  };
  return { rooms, tv, pad };
};
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
const roomOf = async (tv: FakeConn): Promise<Sent> => {
  await tick();
  return tv.last('room') as Sent;
};
const roomId = (url: string): string => new URL(url).searchParams.get('room') as string;
type Pad = FakeConn;
// a phone that asks to join and is accepted by the TV
const joined = (t: FakeConn, pad: (args?: { roomId?: string; token?: string }) => Pad, id: string, token?: string): Pad => {
  const p = pad({ roomId: id, ...(token ? { token } : {}) });
  if (!token) t.say({ type: 'accept', id: t.last('join_request')?.id });
  return p;
};
const start = (p: Pad, game = 'numbers', config?: unknown): void => p.say({ type: 'start', game, config });

test('network: private becomes lan, public stays by IP and IPv6 by /64', () => {
  assert.equal(networkKey('192.168.1.5'), 'lan');
  assert.equal(networkKey('::ffff:10.0.0.2'), 'lan');
  assert.equal(networkKey('::1'), 'lan');
  assert.equal(networkKey('fe80::1'), 'lan');
  assert.equal(networkKey('100.112.130.22'), 'lan');
  assert.equal(networkKey('172.32.0.1'), '172.32.0.1');
  assert.equal(networkKey('177.1.2.3'), '177.1.2.3');
  assert.equal(networkKey('2804:14d:1:2:aaaa::1'), networkKey('2804:14d:1:2:bbbb::9'));
  assert.notEqual(networkKey('2804:14d:1:3::1'), networkKey('2804:14d:1:2::1'));
});

test('the TV receives its name, link and QR code', async () => {
  const { tv } = setup();
  const room = await roomOf(tv());
  assert.equal(room.name, 'Lua');
  assert.match(room.url, /^http:\/\/tv\.local:3000\/pad\?room=[0-9a-f]{10}$/);
  assert.equal(room.qr, '<svg/>');
});

test('list mode: the phone sees the network TVs and the list follows joins and leaves', async () => {
  const { tv, pad } = setup();
  const tv1 = tv();
  const browsing = pad();
  assert.equal(browsing.last('tvs')?.list.length, 1);
  const tv2 = tv();
  const list = browsing.last('tvs')?.list as Array<{ name: string }>;
  assert.equal(list.length, 2);
  assert.notEqual(list[0]?.name, list[1]?.name, 'names do not repeat');
  tv2.close();
  await tick();
  assert.equal(browsing.last('tvs')?.list.length, 1);
  tv1.close();
});

test('a TV on another network does not show up', () => {
  const { tv, pad } = setup();
  tv('177.1.2.3');
  assert.deepEqual(pad().last('tvs')?.list, []);
});

test('joining: wait, the TV sees the request, accepts; both land on the menu with the catalog', async () => {
  const { tv, pad } = setup();
  const t = tv();
  const p = pad({ roomId: roomId((await roomOf(t)).url) });
  assert.ok(p.last('waiting'));
  const request = t.last('join_request') as Sent;
  assert.ok(request);
  t.say({ type: 'accept', id: request.id });
  assert.ok(p.last('ok')?.token);
  assert.equal(p.last('state')?.state, null, 'no game yet: the menu');
  assert.deepEqual(p.last('catalog')?.catalog.themes, [{ id: 'kids', name: 'Crianças' }, { id: 'board', name: 'Tabuleiro' }]);
  assert.equal(t.last('players')?.count, 1);
  assert.ok(t.last('catalog'), 'the TV gets the catalog too');
});

test('draft games stay out of the catalog and cannot be started unless drafts are shown', async () => {
  const wip: GameModule = { ...duo, meta: { ...duo.meta, id: 'wip', name: 'Em obras', theme: 'kids', players: { min: 1, max: 1 }, draft: true } };
  const hidden = setup({ games: { numbers, wip }, showDrafts: false });
  const t = hidden.tv();
  const p = joined(t, hidden.pad, roomId((await roomOf(t)).url));
  assert.deepEqual(p.last('catalog')?.catalog.games.map((g: { id: string }) => g.id), ['numbers']);
  start(p, 'wip');
  assert.equal(p.sent.filter((m) => m.type === 'state' && m.state).length, 0, 'a draft cannot be started');

  const shown = setup({ games: { numbers, wip }, showDrafts: true });
  const t2 = shown.tv();
  const p2 = joined(t2, shown.pad, roomId((await roomOf(t2)).url));
  assert.deepEqual(p2.last('catalog')?.catalog.games.map((g: { id: string }) => g.id), ['numbers', 'wip']);
});

test('a pending request cannot play; rejecting closes the connection', async () => {
  const { tv, pad } = setup();
  const t = tv();
  const p = pad({ roomId: roomId((await roomOf(t)).url) });
  p.say({ type: 'action', action: { type: 'choose', value: 3 } });
  assert.equal(t.last('state'), undefined, 'nothing reaches the TV');
  t.say({ type: 'reject', id: t.last('join_request')?.id });
  assert.equal(p.last('denied')?.reason, 'rejected');
  assert.equal(p.closedWith, 1000);
});

test('playing: wrong, right, next; the TV and the controller see the same state', async () => {
  const { tv, pad } = setup();
  const t = tv();
  const p = pad({ roomId: roomId((await roomOf(t)).url) });
  t.say({ type: 'accept', id: t.last('join_request')?.id });
  start(p);
  assert.equal(t.last('state')?.state.game, 'numbers');
  assert.equal(p.last('state')?.state.target, 3);

  p.say({ type: 'action', action: { type: 'choose', value: 1 } });
  assert.deepEqual(t.last('state')?.state.wrong, [1]);
  p.say({ type: 'action', action: { type: 'choose', value: 3 } });
  assert.equal(t.last('state')?.state.solved, true);
  assert.deepEqual(p.last('state')?.state, t.last('state')?.state);
  p.say({ type: 'action', action: { type: 'next' } });
  assert.equal(t.last('state')?.state.round, 2);
});

test('invalid and no-op actions do not produce a new state', async () => {
  const { tv, pad } = setup();
  const t = tv();
  const p = pad({ roomId: roomId((await roomOf(t)).url) });
  t.say({ type: 'accept', id: t.last('join_request')?.id });
  start(p);
  const before = t.sent.length;
  const garbage: unknown[] = ['junk', '[]', '{"type":"action"}', { type: 'action', action: { type: 'delete' } },
    { type: 'action', action: { type: 'poke' } }, // valid for another game, not declared by this one
    { type: 'action', action: { type: 'choose', value: '3' } }, { type: 'action', action: { type: 'next' } },
    { type: 'action', action: { type: 'choose', value: 99 } }, { type: 'start', game: 'numbers' }, { type: 'start', game: 'nope' }];
  for (const message of garbage) p.say(message);
  assert.equal(t.sent.length, before);
});

test('a token reconnects without a new request and gets the state right away', async () => {
  const { tv, pad } = setup();
  const t = tv();
  const id = roomId((await roomOf(t)).url);
  const p = pad({ roomId: id });
  t.say({ type: 'accept', id: t.last('join_request')?.id });
  const token = p.last('ok')?.token as string;
  start(p);
  p.say({ type: 'action', action: { type: 'choose', value: 1 } });
  p.close();
  await tick();
  assert.ok(t.last('left'));

  const requestsBefore = t.count('join_request');
  const p2 = pad({ roomId: id, token });
  assert.equal(p2.last('ok')?.token, token);
  assert.deepEqual(p2.last('state')?.state.wrong, [1], 'continues where it stopped');
  assert.equal(t.count('join_request'), requestsBefore, 'no new request');
});

test('a wrong token or an unknown room is denied', async () => {
  const { tv, pad } = setup();
  const t = tv();
  const id = roomId((await roomOf(t)).url);
  assert.equal(pad({ roomId: 'nope' }).last('denied')?.reason, 'room_gone');
  const p = pad({ roomId: id, token: 'forged' });
  assert.ok(p.last('waiting'), 'an invalid token becomes a normal request');
  assert.equal(p.last('ok'), undefined);
});

test('limits: pending requests and controllers per room', async () => {
  const { tv, pad } = setup({ maxPending: 2, maxControllers: 1 });
  const t = tv();
  const id = roomId((await roomOf(t)).url);
  const a = pad({ roomId: id });
  const b = pad({ roomId: id });
  const c = pad({ roomId: id });
  assert.equal(c.last('denied')?.reason, 'full', 'the third pending request is denied');
  t.say({ type: 'accept', id: t.sent.find((m) => m.type === 'join_request')?.id });
  assert.ok(a.last('ok'));
  t.say({ type: 'accept', id: t.last('join_request')?.id });
  assert.equal(b.last('denied')?.reason, 'full', 'above the controller maximum is denied');
});

test('when the TV closes: the room leaves the list and controllers are dismissed', async () => {
  const { tv, pad } = setup();
  const t = tv();
  const p = pad({ roomId: roomId((await roomOf(t)).url) });
  t.say({ type: 'accept', id: t.last('join_request')?.id });
  t.close();
  await tick();
  assert.equal(p.last('denied')?.reason, 'room_gone');
  assert.equal(pad().last('tvs')?.list.length, 0);
});

test('a message burst closes the connection with 1008', async () => {
  const { tv, pad } = setup({ maxMessagesPerSecond: 5 });
  const t = tv();
  const p = pad({ roomId: roomId((await roomOf(t)).url) });
  for (let i = 0; i < 20; i++) p.say('{}');
  assert.equal(p.closedWith, 1008);
});

test('start: options are sanitized (a value outside the choices becomes the default)', async () => {
  const { tv, pad } = setup();
  const t = tv();
  const p = joined(t, pad, roomId((await roomOf(t)).url));
  start(p, 'numbers', { max: 7 });
  assert.equal(p.last('state')?.state.max, 5, 'invalid choice: default');
  p.say({ type: 'exit' });
  start(p, 'numbers', { max: 9, extra: 'ignored' });
  assert.equal(p.last('state')?.state.max, 9);
  p.say({ type: 'exit' });
  start(p, 'numbers', 'junk');
  assert.equal(p.last('state')?.state.max, 5);
});

test('while a game runs, start is ignored; exit (phone or TV Back) returns both to the menu', async () => {
  const { tv, pad } = setup();
  const t = tv();
  const p = joined(t, pad, roomId((await roomOf(t)).url));
  start(p);
  const playing = t.last('state')?.state;
  start(p, 'duo');
  assert.equal(t.last('state')?.state, playing, 'already playing: nothing changes');
  p.say({ type: 'exit' });
  assert.equal(t.last('state')?.state, null);
  assert.equal(p.last('state')?.state, null);
  start(p);
  t.say({ type: 'exit' });
  assert.equal(t.last('state')?.state, null, 'Back on the TV');
  assert.equal(p.last('state')?.state, null);
  const count = p.count('state');
  p.say({ type: 'exit' });
  assert.equal(p.count('state'), count, 'exit on the menu does nothing');
});

test('a pending phone cannot start or exit a game', async () => {
  const { tv, pad } = setup();
  const t = tv();
  const id = roomId((await roomOf(t)).url);
  const waiting = pad({ roomId: id });
  start(waiting);
  waiting.say({ type: 'exit' });
  assert.equal(t.count('state'), 0);
});

test('table size: too few / too many controllers get a notice and the menu stays', async () => {
  const { tv, pad } = setup();
  const t = tv();
  const id = roomId((await roomOf(t)).url);
  const a = joined(t, pad, id);
  start(a, 'duo'); // needs 2
  assert.equal(a.last('notice')?.reason, 'too_few');
  assert.equal(a.last('state')?.state, null);
  const b = joined(t, pad, id);
  start(b, 'numbers'); // 1 player only
  assert.equal(b.last('notice')?.reason, 'too_many');
  start(b, 'duo');
  assert.equal(a.last('state')?.state.game, 'duo');
});

test('a running game caps the table: a controller above players.max is denied', async () => {
  const { tv, pad } = setup();
  const t = tv();
  const id = roomId((await roomOf(t)).url);
  const [a, b] = [joined(t, pad, id), joined(t, pad, id)];
  start(a, 'duo');
  const c = joined(t, pad, id);
  assert.ok(c.last('ok'), 'three fit');
  const d = joined(t, pad, id);
  assert.equal(d.last('denied')?.reason, 'full', 'duo takes at most 3');
  assert.ok(b.open);
});

test('seats: each controller gets one, the game receives them and a reconnection keeps its seat', async () => {
  const { tv, pad } = setup();
  const t = tv();
  const id = roomId((await roomOf(t)).url);
  const a = joined(t, pad, id);
  const b = joined(t, pad, id);
  const c = joined(t, pad, id);
  start(a, 'duo');
  assert.deepEqual(t.last('state')?.state.seats, [0, 1, 2]);

  b.say({ type: 'action', action: { type: 'poke' } });
  assert.deepEqual(t.last('state')?.state.pokes, [1], 'reduce received the seat of the sender');

  const token = b.last('ok')?.token as string;
  b.close();
  await tick();
  assert.deepEqual(t.last('state')?.state.seats, [0, 2], 'leave hook');
  const b2 = joined(t, pad, id, token);
  assert.deepEqual(t.last('state')?.state.seats, [0, 1, 2], 'join hook, same seat as before');
  b2.say({ type: 'action', action: { type: 'poke' } });
  assert.deepEqual(t.last('state')?.state.pokes, [1, 1]);
  assert.ok(c.open);
});

test('view: the TV and each phone can see different things', async () => {
  const { tv, pad } = setup();
  const t = tv();
  const id = roomId((await roomOf(t)).url);
  const a = joined(t, pad, id);
  joined(t, pad, id);
  start(a, 'duo');
  assert.equal(t.last('state')?.state.secret, 'hidden');
  assert.equal(a.last('state')?.state.secret, undefined);
  assert.equal(a.last('state')?.state.game, 'duo');
});
