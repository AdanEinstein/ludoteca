import { test } from 'node:test';
import assert from 'node:assert/strict';
import { create, meta, reduce, WORDS } from '../logic.ts';
import type { Rng } from '../../types.ts';

// deterministic rng: returns the given sequence (modulo n)
const seq = (...values: number[]): Rng => {
  let i = 0;
  return (n) => (values[i++ % values.length] as number) % n;
};
const random: Rng = (n) => Math.floor(Math.random() * n);
const groupBy = <T, K>(items: readonly T[], key: (item: T) => K): Map<K, T[]> => {
  const groups = new Map<K, T[]>();
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return groups;
};

test('the whole alphabet is there', () => {
  assert.equal([...new Set(WORDS.map((w) => w.letter))].join(''), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
});

test('every letter has at least five words, each starting with its letter, and the picture ids are unique', () => {
  assert.equal(new Set(WORDS.map((w) => w.id)).size, WORDS.length);
  assert.equal(new Set(WORDS.map((w) => w.word)).size, WORDS.length);
  const perLetter = groupBy(WORDS, (w) => w.letter);
  for (const [letter, words] of perLetter) assert.ok(words.length >= 5, `${letter} has ${words.length} words`);
  for (const { letter, word } of WORDS) assert.equal(word.normalize('NFD').replace(/\p{M}/gu, '')[0]?.toUpperCase(), letter, word);
});

test('create deals `count` words of different letters that include the target, with no answer or mistakes yet', () => {
  for (const count of [3, 4]) {
    for (let r = 0; r < 50; r++) {
      const state = create({ rng: random, config: { count } });
      assert.equal(state.choices.length, count);
      assert.equal(new Set(state.choices.map((i) => WORDS[i]?.letter)).size, count, 'no repeated letter, so one right answer only');
      assert.ok(state.choices.includes(state.target));
      assert.deepEqual([state.round, state.wrong, state.solved, state.replay], [1, [], false, 0]);
    }
  }
});

test('an invalid count falls back to 3', () => {
  for (const count of [0, 2, 5, 3.5, '4', undefined, null, NaN]) assert.equal(create({ rng: seq(0), config: { count } }).count, 3);
  assert.equal(create({ rng: seq(0), config: { count: 4 } }).count, 4);
  assert.ok(meta.options?.[0]?.choices.some((c) => c.value === 3 && meta.options?.[0]?.default === 3));
});

test('the right word is placed anywhere in the options', () => {
  const places = new Set<number>();
  for (let r = 0; r < 200; r++) {
    const state = create({ rng: random, config: { count: 4 } });
    places.add(state.choices.indexOf(state.target));
  }
  assert.deepEqual([...places].sort(), [0, 1, 2, 3]);
});

test('a wrong answer is recorded once and does not end the round', () => {
  const rng = random;
  let state = create({ rng });
  const wrong = state.choices.find((i) => i !== state.target) as number;
  state = reduce(state, { type: 'choose', value: wrong }, { rng });
  assert.deepEqual(state.wrong, [wrong]);
  assert.equal(state.solved, false);
  assert.equal(reduce(state, { type: 'choose', value: wrong }, { rng }), state, 'repeating the same mistake changes nothing');
});

test('a right answer solves the round and blocks further choices', () => {
  const rng = random;
  let state = create({ rng });
  state = reduce(state, { type: 'choose', value: state.target }, { rng });
  assert.equal(state.solved, true);
  const other = state.choices.find((i) => i !== state.target) as number;
  assert.equal(reduce(state, { type: 'choose', value: other }, { rng }), state);
});

test('next only works after solving, and deals a new round without repeating the target', () => {
  const rng = random;
  let state = create({ rng });
  assert.equal(reduce(state, { type: 'next' }, { rng }), state, 'ignored before solving');
  for (let i = 0; i < 50; i++) {
    const previous = state.target;
    const wrong = state.choices.find((c) => c !== state.target) as number;
    state = reduce(reduce(reduce(state, { type: 'choose', value: wrong }, { rng }), { type: 'choose', value: state.target }, { rng }), { type: 'next' }, { rng });
    assert.notEqual(state.target, previous);
    assert.equal(state.round, i + 2);
    assert.deepEqual([state.wrong, state.solved, state.replay], [[], false, 0]);
    assert.ok(state.choices.includes(state.target));
    assert.equal(new Set(state.choices).size, state.count);
  }
});

test('invalid inputs return the same state', () => {
  const rng = seq(2);
  const state = create({ rng });
  const outside = WORDS.findIndex((_, i) => !state.choices.includes(i));
  const bad = [null, undefined, {}, { type: 'x' }, { type: 'choose' }, { type: 'choose', value: -1 }, { type: 'choose', value: 99 }, { type: 'choose', value: outside }, { type: 'choose', value: 1.5 }, { type: 'choose', value: String(state.target) }];
  for (const action of bad) assert.equal(reduce(state, action as never, { rng }), state, JSON.stringify(action));
});

test('reduce does not mutate the previous state', () => {
  const rng = random;
  const state = create({ rng });
  const before = JSON.stringify(state);
  reduce(state, { type: 'choose', value: state.choices.find((i) => i !== state.target) }, { rng });
  reduce(reduce(state, { type: 'choose', value: state.target }, { rng }), { type: 'next' }, { rng });
  assert.equal(JSON.stringify(state), before);
});

test('a degenerate rng neither hangs nor repeats the target', () => {
  for (const fixed of [0, 1, 2, 5, 100]) {
    const rng: Rng = (n) => Math.min(fixed, n - 1);
    let state = create({ rng, config: { count: 4 } });
    for (let i = 0; i < 20; i++) {
      const previous = state.target;
      state = reduce(reduce(state, { type: 'choose', value: state.target }, { rng }), { type: 'next' }, { rng });
      assert.notEqual(state.target, previous);
      assert.equal(new Set(state.choices).size, 4);
    }
  }
});

test('again shows the letter one more time, any time, without changing the round', () => {
  const rng = random;
  let state = create({ rng });
  state = reduce(reduce(state, { type: 'again' }, { rng }), { type: 'again' }, { rng });
  assert.equal(state.replay, 2);
  assert.equal(state.round, 1);
  assert.deepEqual(state.wrong, []);
  state = reduce(reduce(state, { type: 'choose', value: state.target }, { rng }), { type: 'again' }, { rng });
  assert.equal(state.replay, 3, 'also after solving');
});

test('sound is on by default and off only when asked', () => {
  assert.equal(create({ rng: random }).sound, true);
  assert.equal(create({ rng: random, config: { sound: 'off' } }).sound, false);
  assert.equal(create({ rng: random, config: { sound: 'whatever' } }).sound, true);
});

// Plays `rounds` rounds and returns the target of each.
function play(rounds: number, rng: Rng): number[] {
  let state = create({ rng });
  const targets = [state.target];
  for (let i = 1; i < rounds; i++) {
    state = reduce(reduce(state, { type: 'choose', value: state.target }, { rng }), { type: 'next' }, { rng });
    targets.push(state.target);
  }
  return targets;
}

test('every letter shows up once per lap, never twice in a row, even across laps', () => {
  const letters = new Set(WORDS.map((w) => w.letter));
  for (let run = 0; run < 30; run++) {
    const sequence = play(letters.size * 4, random).map((t) => WORDS[t]?.letter);
    for (let lap = 0; lap < 4; lap++) {
      const slice = sequence.slice(lap * letters.size, (lap + 1) * letters.size);
      assert.equal(new Set(slice).size, letters.size, `lap ${lap} has every letter once`);
    }
    for (let i = 1; i < sequence.length; i++) assert.notEqual(sequence[i], sequence[i - 1]);
  }
});

test('a letter shows all its words before repeating one', () => {
  const letters = new Set(WORDS.map((w) => w.letter));
  for (let run = 0; run < 30; run++) {
    const targets = play(letters.size * 5, random);
    const perLetter = groupBy(targets, (t) => WORDS[t]?.letter);
    for (const [letter, words] of perLetter) {
      assert.equal(new Set(words).size, words.length, `${letter}: five rounds, five different words`);
    }
  }
});

test('rounds vary: the same word never comes twice in a row, and distractors are not always the same', () => {
  const seen = new Set<string>();
  const targets = play(120, random);
  for (let i = 1; i < targets.length; i++) assert.notEqual(targets[i], targets[i - 1]);
  for (let r = 0; r < 100; r++) seen.add(create({ rng: random }).choices.join());
  assert.ok(seen.size > 50, `only ${seen.size} different rounds out of 100`);
});
