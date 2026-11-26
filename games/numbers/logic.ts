// Game "Quantos tem?" (theme: kids). Pure logic, no I/O: (state, action) -> state (ADR 0001, 0006).
// Audience principles (ADR 0009): no clock, no score, no error screen. A wrong answer only dims that option.
import type { Action, GameMeta, Rng } from '../types.ts';

export const meta: GameMeta = {
  id: 'numbers',
  name: 'Quantos tem?',
  theme: 'kids',
  players: { min: 1, max: 1 },
  actions: ['choose', 'next'],
  options: [
    {
      id: 'max',
      label: 'Até quantos?',
      choices: [{ value: 3, label: 'Até 3' }, { value: 5, label: 'Até 5' }, { value: 9, label: 'Até 9' }],
      default: 5,
    },
  ],
  styles: ['tv', 'pad'],
  draft: true, // test bench for the platform contract (ADR 0012); the first real game replaces it
};

export type NumbersState = {
  game: 'numbers';
  round: number;
  max: number;
  target: number;
  wrong: number[];
  solved: boolean;
};

const DEFAULT_MAX = 5;
const MAX_LIMIT = 9;

// Picks among the max-1 values that are not the previous one, without a loop: skips the previous if the draw lands on it or above.
const pickTarget = (max: number, previous: number, rng: Rng): number => {
  const n = 1 + rng(max - 1);
  return n >= previous ? n + 1 : n;
};

/** `rng(n)` returns an integer in [0, n). Injected, so the game is deterministic in tests. */
export function create({ rng, config = {} }: { rng: Rng; config?: { max?: unknown } }): NumbersState {
  const { max = DEFAULT_MAX } = config;
  const limit = typeof max === 'number' && Number.isInteger(max) && max >= 2 && max <= MAX_LIMIT ? max : DEFAULT_MAX;
  return { game: 'numbers', round: 1, max: limit, target: 1 + rng(limit), wrong: [], solved: false };
}

/** An invalid or out-of-turn action returns the SAME object (the caller uses that to know nothing changed). */
export function reduce(state: NumbersState, action: Action, { rng }: { rng: Rng }): NumbersState {
  if (action?.type === 'choose') {
    const value = action.value;
    if (state.solved || typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > state.max || state.wrong.includes(value)) {
      return state;
    }
    if (value === state.target) return { ...state, solved: true };
    return { ...state, wrong: [...state.wrong, value] };
  }
  if (action?.type === 'next' && state.solved) {
    return { ...state, round: state.round + 1, target: pickTarget(state.max, state.target, rng), wrong: [], solved: false };
  }
  return state;
}
