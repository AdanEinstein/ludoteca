// WebSocket messages (ADR 0001, 0002): one JSON object per message, discriminated by `type`. Types only.
import type { Action, GameState } from '../games/types.ts';

export type TvListItem = { id: string; name: string };
export type DenyReason = 'room_gone' | 'rejected' | 'full';

/** Server -> TV. */
export type ToTv =
  | { type: 'room'; url: string; qr: string; name: string }
  | { type: 'join_request'; id: string }
  | { type: 'left'; id: string }
  | { type: 'state'; state: GameState };

/** Server -> phone. */
export type ToPad =
  | { type: 'tvs'; list: TvListItem[] }
  | { type: 'waiting' }
  | { type: 'ok'; token: string }
  | { type: 'denied'; reason: DenyReason }
  | { type: 'state'; state: GameState };

/** TV -> server. */
export type FromTv = { type: 'accept' | 'reject'; id: string };

/** Phone -> server. */
export type FromPad = { type: 'action'; action: Action };
