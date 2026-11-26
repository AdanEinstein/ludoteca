// Game "Quantos tem?" (theme: kids). Pure logic, no I/O: (state, action) -> state (ADR 0001, 0006, 0012).
// Audience principles (ADR 0017): no clock, no score, no error screen. A wrong answer only dims that option and the TV counts the
// pieces again, slowly, as help. Every round has its own shape and color, so rounds feel different but never surprising.
import type { Action, GameMeta, Rng } from '../types.ts';

export const meta: GameMeta = {
  id: 'numbers',
  name: 'Quantos tem?',
  theme: 'kids',
  players: { min: 1, max: 1 },
  actions: ['choose', 'next', 'again'],
  options: [
    {
      id: 'max',
      label: 'Até quantos?',
      choices: [{ value: 3, label: 'Até 3' }, { value: 5, label: 'Até 5' }, { value: 9, label: 'Até 9' }],
      default: 5,
    },
    {
      id: 'sound',
      label: 'Som na TV',
      choices: [{ value: 'on', label: 'Com som' }, { value: 'off', label: 'Sem som' }],
      default: 'on',
    },
  ],
  styles: ['tv', 'pad'],
};

export const SHAPES = 4; // circle, rounded square, diamond, star (tv.css)

export type NumbersState = {
  game: 'numbers';
  round: number;
  max: number;
  target: number;
  shape: number;
  wrong: number[];
  solved: boolean;
  /** How many times the child asked to count again. The TV replays the counting whenever this changes. */
  replay: number;
  sound: boolean;
};

const DEFAULT_MAX = 5;
const MAX_LIMIT = 9;

// An index in [0, size) that is not `previous`, without a loop: draws among size-1 values and skips the previous one.
const otherThan = (previous: number, size: number, rng: Rng): number => {
  const n = rng(size - 1);
  return n >= previous ? n + 1 : n;
};

/** `rng(n)` returns an integer in [0, n). Injected, so the game is deterministic in tests. */
export function create({ rng, config = {} }: { rng: Rng; config?: { max?: unknown; sound?: unknown } }): NumbersState {
  const { max = DEFAULT_MAX, sound = 'on' } = config;
  const limit = typeof max === 'number' && Number.isInteger(max) && max >= 2 && max <= MAX_LIMIT ? max : DEFAULT_MAX;
  return { game: 'numbers', round: 1, max: limit, target: 1 + rng(limit), shape: rng(SHAPES), wrong: [], solved: false, replay: 0, sound: sound !== 'off' };
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
  if (action?.type === 'again') return { ...state, replay: state.replay + 1 };
  if (action?.type === 'next' && state.solved) {
    return {
      ...state,
      round: state.round + 1,
      target: 1 + otherThan(state.target - 1, state.max, rng),
      shape: otherThan(state.shape, SHAPES, rng),
      wrong: [],
      solved: false,
      replay: 0,
    };
  }
  return state;
}
