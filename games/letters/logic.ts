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
    {
      id: 'sound',
      label: 'Som na TV',
      choices: [{ value: 'on', label: 'Com som' }, { value: 'off', label: 'Sem som' }],
      default: 'on',
    },
  ],
  styles: ['tv', 'pad'],
  draft: true,
};

/** Five words per letter (grouped by letter). `id` names the picture (art.ts). The first letter of `word`, without accent, is `letter`. */
export const WORDS = [
  { id: 'tree', letter: 'A', word: 'Árvore' },
  { id: 'bee', letter: 'A', word: 'Abelha' },
  { id: 'plane', letter: 'A', word: 'Avião' },
  { id: 'ring', letter: 'A', word: 'Anel' },
  { id: 'pineapple', letter: 'A', word: 'Abacaxi' },
  { id: 'ball', letter: 'B', word: 'Bola' },
  { id: 'balloon', letter: 'B', word: 'Balão' },
  { id: 'cake', letter: 'B', word: 'Bolo' },
  { id: 'banana', letter: 'B', word: 'Banana' },
  { id: 'boat', letter: 'B', word: 'Barco' },
  { id: 'house', letter: 'C', word: 'Casa' },
  { id: 'car', letter: 'C', word: 'Carro' },
  { id: 'carrot', letter: 'C', word: 'Cenoura' },
  { id: 'heart', letter: 'C', word: 'Coração' },
  { id: 'crown', letter: 'C', word: 'Coroa' },
  { id: 'dice', letter: 'D', word: 'Dado' },
  { id: 'tooth', letter: 'D', word: 'Dente' },
  { id: 'diamond', letter: 'D', word: 'Diamante' },
  { id: 'candy', letter: 'D', word: 'Doce' },
  { id: 'domino', letter: 'D', word: 'Dominó' },
  { id: 'star', letter: 'E', word: 'Estrela' },
  { id: 'stairs', letter: 'E', word: 'Escada' },
  { id: 'envelope', letter: 'E', word: 'Envelope' },
  { id: 'elephant', letter: 'E', word: 'Elefante' },
  { id: 'mirror', letter: 'E', word: 'Espelho' },
  { id: 'flower', letter: 'F', word: 'Flor' },
  { id: 'rocket', letter: 'F', word: 'Foguete' },
  { id: 'leaf', letter: 'F', word: 'Folha' },
  { id: 'fire', letter: 'F', word: 'Fogo' },
  { id: 'ghost', letter: 'F', word: 'Fantasma' },
  { id: 'moon', letter: 'L', word: 'Lua' },
  { id: 'lemon', letter: 'L', word: 'Limão' },
  { id: 'book', letter: 'L', word: 'Livro' },
  { id: 'bow', letter: 'L', word: 'Laço' },
  { id: 'pencil', letter: 'L', word: 'Lápis' },
  { id: 'apple', letter: 'M', word: 'Maçã' },
  { id: 'mountain', letter: 'M', word: 'Montanha' },
  { id: 'coin', letter: 'M', word: 'Moeda' },
  { id: 'watermelon', letter: 'M', word: 'Melancia' },
  { id: 'hammer', letter: 'M', word: 'Martelo' },
  { id: 'cloud', letter: 'N', word: 'Nuvem' },
  { id: 'ship', letter: 'N', word: 'Navio' },
  { id: 'nest', letter: 'N', word: 'Ninho' },
  { id: 'note', letter: 'N', word: 'Nota' },
  { id: 'snowflake', letter: 'N', word: 'Neve' },
  { id: 'egg', letter: 'O', word: 'Ovo' },
  { id: 'eye', letter: 'O', word: 'Olho' },
  { id: 'glasses', letter: 'O', word: 'Óculos' },
  { id: 'bus', letter: 'O', word: 'Ônibus' },
  { id: 'sheep', letter: 'O', word: 'Ovelha' },
  { id: 'fish', letter: 'P', word: 'Peixe' },
  { id: 'duck', letter: 'P', word: 'Pato' },
  { id: 'pizza', letter: 'P', word: 'Pizza' },
  { id: 'kite', letter: 'P', word: 'Pipa' },
  { id: 'lollipop', letter: 'P', word: 'Pirulito' },
  { id: 'sun', letter: 'S', word: 'Sol' },
  { id: 'frog', letter: 'S', word: 'Sapo' },
  { id: 'shoe', letter: 'S', word: 'Sapato' },
  { id: 'icecream', letter: 'S', word: 'Sorvete' },
  { id: 'bell', letter: 'S', word: 'Sino' },
  { id: 'grapes', letter: 'U', word: 'Uva' },
  { id: 'bear', letter: 'U', word: 'Urso' },
  { id: 'unicorn', letter: 'U', word: 'Unicórnio' },
  { id: 'vulture', letter: 'U', word: 'Urubu' },
  { id: 'ukulele', letter: 'U', word: 'Ukulele' },
] as const;

const LETTERS = [...new Set(WORDS.map((w) => w.letter))];
const LETTER_OF = WORDS.map((w) => LETTERS.indexOf(w.letter)); // word index -> letter index
const BY_LETTER = LETTERS.map((_, l) => WORDS.flatMap((_, i) => (LETTER_OF[i] === l ? [i] : []))); // letter index -> word indices

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
  /** Letters (indices into the alphabet of WORDS) not yet used in the current lap. Every letter comes once per lap, in a random order. */
  lap: number[];
  /** Words already used as target, until all five of their letter have been. A letter only repeats a word after showing all the others. */
  seen: number[];
  /** Sound on the TV (option "Som na TV"). */
  sound: boolean;
  /** How many times the child asked to see the letter again. The TV replays the letter whenever this (or `wrong`) changes. */
  replay: number;
};

const DEFAULT_COUNT = 3;
const COUNTS = [3, 4];

// Fisher-Yates on a copy.
function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = rng(i + 1);
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

// Next target, from a "bag" instead of a plain random pick (plain random repeats a lot with few letters): the letters come in laps, each
// letter once per lap and never the same letter twice in a row; within a letter the words rotate, and one only returns after the others.
function draw(lap: number[], seen: number[], previous: number, rng: Rng): { target: number; lap: number[]; seen: number[] } {
  let letters = lap;
  if (letters.length === 0) {
    letters = shuffled(LETTERS.map((_, i) => i), rng);
    if (letters[0] === previous) letters.push(letters.shift() as number); // a new lap must not start with the letter that just ended the last
  }
  const [letter = 0, ...rest] = letters;
  const words = BY_LETTER[letter] as number[];
  let fresh = words.filter((w) => !seen.includes(w));
  let kept = seen;
  if (fresh.length === 0) {
    const last = seen.findLast((w) => words.includes(w));
    kept = seen.filter((w) => !words.includes(w));
    fresh = words.filter((w) => w !== last);
  }
  const target = fresh[rng(fresh.length)] as number;
  return { target, lap: rest, seen: [...kept, target] };
}

// A round: the target plus `count - 1` words of other letters (each a random word of its letter), in a random order. The letters are
// all different, so a wrong option can never be a right one too.
function deal(target: number, count: number, rng: Rng): number[] {
  const others = shuffled(LETTERS.map((_, i) => i).filter((l) => l !== LETTER_OF[target]), rng).slice(0, count - 1);
  const choices = others.map((l) => {
    const words = BY_LETTER[l] as number[];
    return words[rng(words.length)] as number;
  });
  choices.splice(rng(count), 0, target);
  return choices;
}

/** `rng(n)` returns an integer in [0, n). Injected, so the game is deterministic in tests. */
export function create({ rng, config = {} }: { rng: Rng; config?: { count?: unknown; sound?: unknown } }): LettersState {
  const { count: asked = DEFAULT_COUNT, sound = 'on' } = config;
  const count = typeof asked === 'number' && COUNTS.includes(asked) ? asked : DEFAULT_COUNT;
  const { target, lap, seen } = draw([], [], -1, rng);
  return { game: 'letters', round: 1, count, target, choices: deal(target, count, rng), wrong: [], solved: false, lap, seen, sound: sound !== 'off', replay: 0 };
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
    const { target, lap, seen } = draw(state.lap, state.seen, LETTER_OF[state.target] as number, rng);
    return { ...state, round: state.round + 1, target, choices: deal(target, state.count, rng), wrong: [], solved: false, lap, seen, replay: 0 };
  }
  return state;
}
