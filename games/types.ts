// Contract shared by the platform and every game (ADR 0006, extended by ADR 0012). Types only, so it is erased before reaching the browser.
export type Rng = (n: number) => number; // integer in [0, n)

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** `type` must be listed in `meta.actions`. `value` is any JSON the game understands (the game still validates it). */
export type Action = { type: string; value?: Json };

/** Full state, JSON-serializable. `game` is the game id, which also names the folder in `games/`. */
export type GameState = { game: string; [key: string]: unknown };

/** Who is looking: a seat number (a phone) or the TV. Used by `view` to hide information. */
export type Viewer = number | 'tv';

export type OptionValue = number | string;

/** A setting the adult picks before the game starts ("Até quantos?"). Labels are Portuguese UI text. */
export type GameOption = {
  id: string;
  label: string;
  choices: Array<{ value: OptionValue; label: string }>;
  default: OptionValue;
};

export type GameMeta = {
  id: string;
  name: string; // shown to the user, in Portuguese
  theme: string; // key of `themes` in games/index.ts: 'kids', 'board', ...
  players: { min: number; max: number };
  /** The only action types the platform lets through for this game. */
  actions: readonly string[];
  options?: readonly GameOption[];
  /** Which screens have a stylesheet in the game folder (`tv.css`, `pad.css`). The platform loads it only while the game runs. */
  styles?: ReadonlyArray<'tv' | 'pad'>;
  /** Work in progress: hidden from the catalog unless the server runs with LUDOTECA_DRAFTS=1. */
  draft?: boolean;
};

export type GameModule = {
  meta: GameMeta;
  /** `players` are the seats at the table when the game starts. `config` already holds a valid value for every option. */
  create(context: { rng: Rng; players: number[]; config: Record<string, OptionValue> }): GameState;
  /** Never mutates. Returns the SAME object when the action is invalid or out of turn. `player` is the seat that acted. */
  reduce(state: GameState, action: Action, context: { rng: Rng; player: number }): GameState;
  /** Optional: a seat sat down / left in the middle of the game. Default: nothing changes. */
  join?(state: GameState, player: number, context: { rng: Rng }): GameState;
  leave?(state: GameState, player: number, context: { rng: Rng }): GameState;
  /** Optional: what each viewer is allowed to see (hidden cards). Default: everybody sees the whole state. */
  view?(state: GameState, viewer: Viewer): GameState;
};
