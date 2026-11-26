// Game "Vamos contar!" (theme: kids). Pure logic, no I/O: (state, action) -> state (ADR 0001, 0006, 0012).
// Counting never ends: the child steps forward and back with two arrows. No clock, no score, no error screen (ADR 0017).
import type { Action, GameMeta } from '../types.ts';

export const meta: GameMeta = {
  id: 'count',
  name: 'Vamos contar!',
  theme: 'kids',
  players: { min: 1, max: 1 },
  actions: ['next', 'prev'],
  options: [
    {
      id: 'sound',
      label: 'Som na TV',
      choices: [{ value: 'on', label: 'Com som' }, { value: 'off', label: 'Sem som' }],
      default: 'on',
    },
  ],
  styles: ['tv', 'pad'],
};

export type CountState = {
  game: 'count';
  n: number;
  /** Direction of the last step: 1 forward, -1 back. Tells the screens which way the number slides in. */
  dir: 1 | -1;
  /** Valid steps taken. A new value remounts the number, so the CSS animation (and the sound) restart. */
  moves: number;
  sound: boolean;
};

const LAST = Number.MAX_SAFE_INTEGER; // "infinity" for a child; keeps n exact

/** Hue (degrees) of a number: golden angle, so neighbours always look different. Skips the reds (320..30), no alarm colors (ADR 0017). */
export const hueOf = (n: number): number => 30 + ((n * 137.508) % 290);

/** Which of the ten dots of the current "ten" is the last lit one: 1..10 (10, 20, 30... light all ten). */
export const dotsOf = (n: number): number => ((n - 1) % 10) + 1;

export function create({ config = {} }: { config?: { sound?: unknown } }): CountState {
  return { game: 'count', n: 1, dir: 1, moves: 0, sound: config.sound !== 'off' };
}

/** An invalid action (or stepping past 1 or past LAST) returns the SAME object. */
export function reduce(state: CountState, action: Action): CountState {
  if (action?.type === 'next' && state.n < LAST) return { ...state, n: state.n + 1, dir: 1, moves: state.moves + 1 };
  if (action?.type === 'prev' && state.n > 1) return { ...state, n: state.n - 1, dir: -1, moves: state.moves + 1 };
  return state;
}
