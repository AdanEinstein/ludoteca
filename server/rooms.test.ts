// Pairing and game tests with fake connections (no network).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createRooms, type Conn, type RoomsOptions } from './rooms.ts';
import { networkKey } from './net.ts';
import * as numbers from '../games/numbers/logic.ts';

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

const setup = (options: Partial<RoomsOptions> = {}) => {
  // fixed rng: first-round target = 3 (max 5, rng(5) = 2)
  const rooms = createRooms({
    games: { numbers },
    defaultGame: 'numbers',
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

test('joining: wait, the TV sees the request, accepts, and both get the initial state', async () => {
  const { tv, pad } = setup();
  const t = tv();
  const p = pad({ roomId: roomId((await roomOf(t)).url) });
  assert.ok(p.last('waiting'));
  const request = t.last('join_request') as Sent;
  assert.ok(request);
  t.say({ type: 'accept', id: request.id });
  assert.ok(p.last('ok')?.token);
  assert.equal(p.last('state')?.state.target, 3);
  assert.equal(t.last('state')?.state.game, 'numbers');
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
  const before = t.sent.length;
  const garbage: unknown[] = ['junk', '[]', '{"type":"action"}', { type: 'action', action: { type: 'delete' } },
    { type: 'action', action: { type: 'choose', value: '3' } }, { type: 'action', action: { type: 'next' } },
    { type: 'action', action: { type: 'choose', value: 99 } }];
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
