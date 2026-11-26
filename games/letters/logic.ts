// Game "Qual começa com?" (theme: kids). Pure logic, no I/O: (state, action) -> state (ADR 0001, 0006, 0012).
// Audience principles (ADR 0017): no clock, no score, no error screen. The TV shows one big letter; the phone shows a few words
// with a simple picture. A wrong answer only dims that option and the TV shows the letter again, slowly. Rounds never end.
import type { Action, GameMeta, Rng } from '../types.ts';

export const meta: GameMeta = {
  id: 'letters',
  name: 'Qual começa com?',
  theme: 'kids',
  players: { min: 1, max: 1 },
  actions: ['choose', 'next', 'again'],
  options: [
    {
      id: 'count',
      label: 'Quantas opções',
      choices: [{ value: 3, label: '3 opções' }, { value: 4, label: '4 opções' }],
      default: 3,
    },
  ],
  styles: ['tv', 'pad'],
  draft: true,
};

/** Every word starts with a different letter, so a wrong option can never be a right one too. `id` names its picture (art.ts). */
export const WORDS = [
  { id: 'tree', letter: 'A', word: 'Árvore' },
  { id: 'ball', letter: 'B', word: 'Bola' },
  { id: 'house', letter: 'C', word: 'Casa' },
  { id: 'dice', letter: 'D', word: 'Dado' },
  { id: 'star', letter: 'E', word: 'Estrela' },
  { id: 'flower', letter: 'F', word: 'Flor' },
  { id: 'moon', letter: 'L', word: 'Lua' },
  { id: 'apple', letter: 'M', word: 'Maçã' },
  { id: 'cloud', letter: 'N', word: 'Nuvem' },
  { id: 'egg', letter: 'O', word: 'Ovo' },
  { id: 'fish', letter: 'P', word: 'Peixe' },
  { id: 'sun', letter: 'S', word: 'Sol' },
  { id: 'grapes', letter: 'U', word: 'Uva' },
] as const;

export type LettersState = {
  game: 'letters';
  round: number;
  /** Options on the phone: 3 or 4. */
  count: number;
  /** Index in WORDS of the right word; its letter is the one the TV shows. */
  target: number;
  /** Indices in WORDS shown on the phone, in order; includes `target`. */
  choices: number[];
  wrong: number[];
  solved: boolean;
  /** How many times the child asked to see the letter again. The TV replays the letter whenever this (or `wrong`) changes. */
  replay: number;
};

const DEFAULT_COUNT = 3;
const COUNTS = [3, 4];

// An index in [0, size) that is not `previous`, without a loop: draws among size-1 values and skips the previous one.
const otherThan = (previous: number, size: number, rng: Rng): number => {
  const n = rng(size - 1);
  return n >= previous ? n + 1 : n;
};

// A round: the target plus `count - 1` different words, in a random order. Partial Fisher-Yates over the other words, then the
// target goes to a random place.
function deal(target: number, count: number, rng: Rng): number[] {
  const pool = WORDS.map((_, i) => i).filter((i) => i !== target);
  for (let i = 0; i < count - 1; i++) {
    const j = i + rng(pool.length - i);
    [pool[i], pool[j]] = [pool[j] as number, pool[i] as number];
  }
  const choices = pool.slice(0, count - 1);
  choices.splice(rng(count), 0, target);
  return choices;
}

/** `rng(n)` returns an integer in [0, n). Injected, so the game is deterministic in tests. */
export function create({ rng, config = {} }: { rng: Rng; config?: { count?: unknown } }): LettersState {
  const { count: asked = DEFAULT_COUNT } = config;
  const count = typeof asked === 'number' && COUNTS.includes(asked) ? asked : DEFAULT_COUNT;
  const target = rng(WORDS.length);
  return { game: 'letters', round: 1, count, target, choices: deal(target, count, rng), wrong: [], solved: false, replay: 0 };
}

/** An invalid or out-of-turn action returns the SAME object (the caller uses that to know nothing changed). */
export function reduce(state: LettersState, action: Action, { rng }: { rng: Rng }): LettersState {
  if (action?.type === 'choose') {
    const value = action.value;
    if (state.solved || typeof value !== 'number' || !state.choices.includes(value) || state.wrong.includes(value)) return state;
    if (value === state.target) return { ...state, solved: true };
    return { ...state, wrong: [...state.wrong, value] };
  }
  if (action?.type === 'again') return { ...state, replay: state.replay + 1 };
  if (action?.type === 'next' && state.solved) {
    const target = otherThan(state.target, WORDS.length, rng);
    return { ...state, round: state.round + 1, target, choices: deal(target, state.count, rng), wrong: [], solved: false, replay: 0 };
  }
  return state;
}
