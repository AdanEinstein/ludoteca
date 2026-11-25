// Rooms, pairing and game (ADR 0001, 0002). No network here: it takes "connections" with send/close/on/open,
// so it can be tested with fake connections. app.ts wires it to the WebSocket.
import { randomBytes } from 'node:crypto';
import type { GameModule, GameState, Rng } from '../games/types.ts';
import type { DenyReason, ToPad, ToTv, TvListItem } from './protocol.ts';

// Shown on the TV screen, so they stay in Portuguese (ADR 0008).
const TV_NAMES = ['Lua', 'Sol', 'Estrela', 'Nuvem', 'Mar', 'Pipa', 'Bola', 'Foguete'];
const ACTION_TYPES = new Set(['choose', 'next']);

const randomId = (bytes: number): string => randomBytes(bytes).toString('hex');

export interface Conn {
  readonly open: boolean;
  send(text: string): void;
  close(code?: number): void;
  on(event: string, listener: (...args: any[]) => void): unknown;
}
type Peer = Conn & { id: string };
type Browsing = Peer & { network: string };
type Room = {
  network: string;
  name: string;
  tv: Conn;
  controllers: Map<string, Peer>;
  pending: Map<string, Peer>;
  tokens: Set<string>;
  game: GameModule | null;
  state: GameState | null;
};

const parseMessage = (data: string): Record<string, unknown> | null => {
  try {
    const message: unknown = JSON.parse(data);
    return message && typeof message === 'object' && !Array.isArray(message) ? (message as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

// Only lets through what every game knows how to handle, with simple types. The reducer still validates the content.
const isValidAction = (action: unknown): action is { type: string; value?: number } => {
  if (!action || typeof action !== 'object') return false;
  const { type, value } = action as { type?: unknown; value?: unknown };
  return typeof type === 'string' && ACTION_TYPES.has(type) && (value === undefined || Number.isInteger(value));
};

export type RoomsOptions = {
  games: Record<string, GameModule>;
  defaultGame: string;
  rng: Rng;
  makeQr: (url: string) => Promise<string>;
  maxControllers?: number;
  maxPending?: number;
  maxMessagesPerSecond?: number;
};

export function createRooms({
  games,
  defaultGame,
  rng,
  makeQr,
  maxControllers = 8,
  maxPending = 3,
  maxMessagesPerSecond = 30,
}: RoomsOptions) {
  const rooms = new Map<string, Room>(); // roomId -> room
  const browsing = new Set<Browsing>(); // phones looking at the TV list

  const sendTo = (conn: Conn | undefined, message: ToTv | ToPad): void => {
    if (conn?.open) conn.send(JSON.stringify(message));
  };
  // reason: 'room_gone' (no longer exists), 'rejected' (the TV said no) or 'full' (controller/request limit)
  const deny = (conn: Conn, reason: DenyReason): void => {
    sendTo(conn, { type: 'denied', reason });
    conn.close(1000);
  };
  const tvsOn = (network: string): TvListItem[] =>
    [...rooms].filter(([, room]) => room.network === network).map(([id, room]) => ({ id, name: room.name }));
  const pushList = (network: string): void => {
    const list = tvsOn(network);
    for (const phone of browsing) if (phone.network === network) sendTo(phone, { type: 'tvs', list });
  };
  const broadcast = (room: Room): void => {
    if (!room.state) return;
    const message: ToTv & ToPad = { type: 'state', state: room.state };
    sendTo(room.tv, message);
    for (const controller of room.controllers.values()) sendTo(controller, message);
  };
  // Per-connection limit: above it the connection is closed (1008). Protects the server from bursts.
  const rateLimiter = (): (() => boolean) => {
    let windowStart = Date.now();
    let count = 0;
    return () => {
      const now = Date.now();
      if (now - windowStart >= 1000) {
        windowStart = now;
        count = 0;
      }
      return ++count <= maxMessagesPerSecond;
    };
  };

  function startGame(room: Room): GameState {
    if (!room.game || !room.state) {
      const game = games[defaultGame];
      if (!game) throw new Error(`unknown game: ${defaultGame}`);
      room.game = game;
      room.state = game.create({ rng });
    }
    return room.state;
  }

  function admit(room: Room, phone: Peer, token: string): void {
    room.controllers.set(phone.id, phone);
    sendTo(phone, { type: 'ok', token });
    const state = startGame(room);
    sendTo(phone, { type: 'state', state });
    sendTo(room.tv, { type: 'state', state });
  }

  function accept(room: Room, phone: Peer): void {
    room.pending.delete(phone.id);
    if (room.controllers.size >= maxControllers) return deny(phone, 'full');
    const token = randomId(16);
    room.tokens.add(token);
    admit(room, phone, token);
  }

  /** TV: creates the room. `network` groups who is in the same home (net.ts). `baseUrl` becomes the QR link. */
  function connectTv(conn: Conn, { network, baseUrl }: { network: string; baseUrl: string }): void {
    const roomId = randomId(5);
    const used = tvsOn(network).map((tv) => tv.name);
    const name = TV_NAMES.find((candidate) => !used.includes(candidate)) ?? `TV ${used.length + 1}`;
    const room: Room = { network, name, tv: conn, controllers: new Map(), pending: new Map(), tokens: new Set(), game: null, state: null };
    rooms.set(roomId, room);
    pushList(network);

    const allowed = rateLimiter();
    conn.on('message', (data: string) => {
      if (!allowed()) return conn.close(1008);
      const message = parseMessage(data);
      const id = message?.id;
      const phone = typeof id === 'string' ? room.pending.get(id) : undefined;
      if (!phone) return;
      if (message?.type === 'accept') accept(room, phone);
      else if (message?.type === 'reject') {
        room.pending.delete(phone.id);
        deny(phone, 'rejected');
      }
    });
    conn.on('close', () => {
      rooms.delete(roomId);
      pushList(network);
      for (const phone of [...room.controllers.values(), ...room.pending.values()]) deny(phone, 'room_gone');
    });

    const url = `${baseUrl}/pad?room=${roomId}`;
    makeQr(url)
      .catch(() => '')
      .then((qr) => sendTo(conn, { type: 'room', url, qr, name }));
  }

  /** Phone: without `roomId` it only lists the network's TVs; with `roomId` it asks to join (a valid token skips the accept). */
  function connectPad(conn: Conn, { network, roomId, token }: { network: string; roomId?: string | null; token?: string | null }): void {
    const phone: Peer = Object.assign(conn, { id: randomId(3) });
    let room: Room | undefined;
    const allowed = rateLimiter();

    conn.on('message', (data: string) => {
      if (!allowed()) return conn.close(1008);
      const message = parseMessage(data);
      // only an accepted phone can play
      if (message?.type === 'action' && room?.game && room.state && room.controllers.get(phone.id) === phone && isValidAction(message.action)) {
        const next = room.game.reduce(room.state, message.action, { rng });
        if (next !== room.state) {
          room.state = next;
          broadcast(room);
        }
      }
    });
    conn.on('close', () => {
      browsing.delete(phone as Browsing);
      if (!room) return;
      room.pending.delete(phone.id);
      room.controllers.delete(phone.id);
      sendTo(room.tv, { type: 'left', id: phone.id });
    });

    if (!roomId) {
      // list mode: the phone only sees the TVs on its own network
      browsing.add(Object.assign(phone, { network }));
      return sendTo(phone, { type: 'tvs', list: tvsOn(network) });
    }
    room = rooms.get(roomId);
    if (!room) return deny(phone, 'room_gone');

    if (token && room.tokens.has(token)) {
      if (room.controllers.size >= maxControllers) return deny(phone, 'full');
      admit(room, phone, token);
    } else if (room.pending.size >= maxPending) {
      deny(phone, 'full');
    } else {
      room.pending.set(phone.id, phone);
      sendTo(phone, { type: 'waiting' });
      sendTo(room.tv, { type: 'join_request', id: phone.id });
    }
  }

  return { connectTv, connectPad };
}
