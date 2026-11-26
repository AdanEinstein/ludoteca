// WebSocket messages (ADR 0001, 0002, 0012): one JSON object per message, discriminated by `type`. Types only.
import type { Action, GameMeta, GameState, OptionValue } from '../games/types.ts';

export type TvListItem = { id: string; name: string };
export type DenyReason = 'room_gone' | 'rejected' | 'full';
/** Why `start` was ignored: the table has too few / too many controllers for that game. */
export type NoticeReason = 'too_few' | 'too_many';

/** What the menu needs to know about a game (no server-only fields). */
export type CatalogGame = Pick<GameMeta, 'id' | 'name' | 'theme' | 'players' | 'options' | 'styles'>;
export type Catalog = { themes: Array<{ id: string; name: string }>; games: CatalogGame[] };

/** Server -> TV. `state: null` means "no game running: show the menu". */
export type ToTv =
  | { type: 'room'; url: string; qr: string; name: string }
  | { type: 'catalog'; catalog: Catalog }
  | { type: 'players'; count: number }
  | { type: 'join_request'; id: string }
  | { type: 'left'; id: string }
  | { type: 'state'; state: GameState | null };

/** Server -> phone. */
export type ToPad =
  | { type: 'tvs'; list: TvListItem[] }
  | { type: 'waiting' }
  | { type: 'ok'; token: string; name: string } // name: the TV's name ("Lua"), shown in the pad header
  | { type: 'catalog'; catalog: Catalog }
  | { type: 'denied'; reason: DenyReason }
  | { type: 'notice'; reason: NoticeReason }
  | { type: 'state'; state: GameState | null };

/** TV -> server. `exit` (the remote's Back key) goes back to the menu. */
export type FromTv = { type: 'accept' | 'reject'; id: string } | { type: 'exit' };

/** Phone -> server. */
export type FromPad =
  | { type: 'action'; action: Action }
  | { type: 'start'; game: string; config?: Record<string, OptionValue> }
  | { type: 'exit' };
