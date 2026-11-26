// Rooms, pairing, menu and game (ADR 0001, 0002, 0012). No network here: it takes "connections" with send/close/on/open,
// so it can be tested with fake connections. app.ts wires it to the WebSocket.
import { randomBytes } from 'node:crypto';
import type { Action, GameModule, GameState, OptionValue, Rng, Viewer } from '../games/types.ts';
import type { Catalog, DenyReason, ToPad, ToTv, TvListItem } from './protocol.ts';

// Shown on the TV screen, so they stay in Portuguese (ADR 0008).
const TV_NAMES = ['Lua', 'Sol', 'Estrela', 'Nuvem', 'Mar', 'Pipa', 'Bola', 'Foguete'];

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
  seats: Map<string, number>; // controller id -> seat, only while connected
  tokens: Map<string, number>; // token -> the seat it had, so a reconnection sits in the same place
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

// Only lets through what the running game declared in `meta.actions`, with a plain shape. The reducer still validates the content.
const cleanAction = (game: GameModule, action: unknown): Action | null => {
  if (!action || typeof action !== 'object') return null;
  const { type, value } = action as { type?: unknown; value?: Action['value'] };
  if (typeof type !== 'string' || !game.meta.actions.includes(type)) return null;
  return value === undefined ? { type } : { type, value };
};

// Every option gets a valid value: the one asked for if it is among the choices, otherwise the default.
const sanitizeConfig = (game: GameModule, raw: unknown): Record<string, OptionValue> => {
  const given = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(
    (game.meta.options ?? []).map((option) => [option.id, option.choices.some((choice) => choice.value === given[option.id]) ? (given[option.id] as OptionValue) : option.default]),
  );
};

export type RoomsOptions = {
  games: Record<string, GameModule>;
  themes: Record<string, string>;
  showDrafts?: boolean;
  rng: Rng;
  makeQr: (url: string) => Promise<string>;
  maxControllers?: number;
  maxPending?: number;
  maxMessagesPerSecond?: number;
};

export function createRooms({
  games,
  themes,
  showDrafts = false,
  rng,
  makeQr,
  maxControllers = 8,
  maxPending = 3,
  maxMessagesPerSecond = 30,
}: RoomsOptions) {
  const visible = Object.fromEntries(Object.entries(games).filter(([, game]) => showDrafts || !game.meta.draft));
  const catalog: Catalog = {
    games: Object.values(visible).map(({ meta: { id, name, theme, players, options, styles } }) => ({ id, name, theme, players, options, styles })),
    themes: Object.entries(themes)
      .filter(([id]) => Object.values(visible).some((game) => game.meta.theme === id))
      .map(([id, name]) => ({ id, name })),
  };
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
  // What a viewer may see: the game can hide information per seat (`view`). `null` = no game running (menu).
  const project = (room: Room, viewer: Viewer): GameState | null => (!room.state ? null : room.game?.view ? room.game.view(room.state, viewer) : room.state);
  const sendState = (room: Room, conn: Conn, viewer: Viewer): void => sendTo(conn, { type: 'state', state: project(room, viewer) });
  const broadcast = (room: Room): void => {
    sendState(room, room.tv, 'tv');
    for (const [id, controller] of room.controllers) sendState(room, controller, room.seats.get(id) as number);
  };
  const setState = (room: Room, next: GameState | null): void => {
    if (next === room.state) return; // same object: nothing changed, nothing to send
    room.state = next;
    broadcast(room);
  };
  const tellPlayers = (room: Room): void => sendTo(room.tv, { type: 'players', count: room.controllers.size });
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

  // A running game limits the table (`players.max`); the menu only has the platform limit.
  const capacity = (room: Room): number => Math.min(maxControllers, room.game?.meta.players.max ?? maxControllers);
  const freeSeat = (room: Room, preferred?: number): number => {
    const used = new Set(room.seats.values());
    if (preferred !== undefined && !used.has(preferred)) return preferred;
    let seat = 0;
    while (used.has(seat)) seat++;
    return seat;
  };

  function admit(room: Room, phone: Peer, token: string): void {
    const seat = freeSeat(room, room.tokens.get(token));
    room.controllers.set(phone.id, phone);
    room.seats.set(phone.id, seat);
    room.tokens.set(token, seat);
    sendTo(phone, { type: 'ok', token, name: room.name });
    sendTo(phone, { type: 'catalog', catalog });
    tellPlayers(room);
    const joined = room.game && room.state ? room.game.join?.(room.state, seat, { rng }) : undefined;
    if (joined && joined !== room.state) setState(room, joined);
    else sendState(room, phone, seat);
  }

  function accept(room: Room, phone: Peer): void {
    room.pending.delete(phone.id);
    if (room.controllers.size >= capacity(room)) return deny(phone, 'full');
    const token = randomId(16);
    admit(room, phone, token);
  }

  /** Menu -> game. Only from the menu (leave the running game first), and only with a table the game accepts. */
  function start(room: Room, phone: Peer, message: Record<string, unknown>): void {
    if (room.state) return;
    const game = typeof message.game === 'string' ? visible[message.game] : undefined;
    if (!game) return;
    const seated = room.controllers.size;
    if (seated < game.meta.players.min) return sendTo(phone, { type: 'notice', reason: 'too_few' });
    if (seated > game.meta.players.max) return sendTo(phone, { type: 'notice', reason: 'too_many' });
    room.game = game;
    const players = [...room.seats.values()].sort((a, b) => a - b);
    setState(room, game.create({ rng, players, config: sanitizeConfig(game, message.config) }));
  }

  /** Game -> menu. */
  function exit(room: Room): void {
    if (!room.state) return;
    room.game = null;
    setState(room, null);
  }

  /** TV: creates the room. `network` groups who is in the same home (net.ts). `baseUrl` becomes the QR link. */
  function connectTv(conn: Conn, { network, baseUrl }: { network: string; baseUrl: string }): void {
    const roomId = randomId(5);
    const used = tvsOn(network).map((tv) => tv.name);
    const name = TV_NAMES.find((candidate) => !used.includes(candidate)) ?? `TV ${used.length + 1}`;
    const room: Room = {
      network, name, tv: conn, controllers: new Map(), pending: new Map(), seats: new Map(), tokens: new Map(), game: null, state: null,
    };
    rooms.set(roomId, room);
    pushList(network);

    const allowed = rateLimiter();
    conn.on('message', (data: string) => {
      if (!allowed()) return conn.close(1008);
      const message = parseMessage(data);
      if (message?.type === 'exit') return exit(room); // Back on the remote
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
      .then((qr) => {
        sendTo(conn, { type: 'room', url, qr, name });
        sendTo(conn, { type: 'catalog', catalog });
      });
  }

  /** Phone: without `roomId` it only lists the network's TVs; with `roomId` it asks to join (a valid token skips the accept). */
  function connectPad(conn: Conn, { network, roomId, token }: { network: string; roomId?: string | null; token?: string | null }): void {
    const phone: Peer = Object.assign(conn, { id: randomId(3) });
    let room: Room | undefined;
    const allowed = rateLimiter();

    conn.on('message', (data: string) => {
      if (!allowed()) return conn.close(1008);
      const message = parseMessage(data);
      const seat = room?.seats.get(phone.id);
      // only an accepted phone can play
      if (!message || !room || seat === undefined || room.controllers.get(phone.id) !== phone) return;
      if (message.type === 'action' && room.game && room.state) {
        const action = cleanAction(room.game, message.action);
        if (action) setState(room, room.game.reduce(room.state, action, { rng, player: seat }));
      } else if (message.type === 'start') start(room, phone, message);
      else if (message.type === 'exit') exit(room);
    });
    conn.on('close', () => {
      browsing.delete(phone as Browsing);
      if (!room) return;
      room.pending.delete(phone.id);
      const seat = room.seats.get(phone.id);
      room.seats.delete(phone.id);
      if (room.controllers.delete(phone.id)) {
        tellPlayers(room);
        if (seat !== undefined && room.game && room.state) setState(room, room.game.leave?.(room.state, seat, { rng }) ?? room.state);
      }
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
      if (room.controllers.size >= capacity(room)) return deny(phone, 'full');
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
