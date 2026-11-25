// Contract shared by the platform and every game (ADR 0006). Types only, so it is erased before reaching the browser.
export type Rng = (n: number) => number; // integer in [0, n)

export type Action = { type: string; value?: number };

/** Public, JSON-serializable state. `game` is the game id, which also names the folder in `games/`. */
export type GameState = { game: string; [key: string]: unknown };

export type GameMeta = {
  id: string;
  name: string; // shown to the user, in Portuguese
  theme: string; // catalog filter: 'kids', 'board', ...
  players: { min: number; max: number };
};

export type GameModule = {
  meta: GameMeta;
  create(options: { rng: Rng } & Record<string, unknown>): GameState;
  /** Never mutates. Returns the SAME object when the action is invalid or out of turn. */
  reduce(state: GameState, action: Action, context: { rng: Rng }): GameState;
};
