import { test } from 'node:test';
import assert from 'node:assert/strict';
import { create, reduce, SHAPES } from '../logic.ts';
import type { Rng } from '../../types.ts';

// deterministic rng: returns the given sequence (modulo n)
const seq = (...values: number[]): Rng => {
  let i = 0;
  return (n) => (values[i++ % values.length] as number) % n;
};

test('create draws the target between 1 and max, with no answer or mistakes yet', () => {
  const state = create({ rng: seq(2), config: { max: 5 } });
  assert.deepEqual(state, { game: 'numbers', round: 1, max: 5, target: 3, shape: 2, wrong: [], solved: false, replay: 0, sound: true });
});

test('an invalid max falls back to the default', () => {
  for (const max of [0, 1, 10, 2.5, '5', undefined, NaN]) assert.equal(create({ rng: seq(0), config: { max } }).max, 5);
  assert.equal(create({ rng: seq(0), config: { max: 9 } }).max, 9);
});

test('a wrong answer is recorded once and does not end the round', () => {
  const rng = seq(2); // target 3
  let state = create({ rng, config: { max: 5 } });
  state = reduce(state, { type: 'choose', value: 1 }, { rng });
  assert.deepEqual(state.wrong, [1]);
  assert.equal(state.solved, false);
  assert.equal(reduce(state, { type: 'choose', value: 1 }, { rng }), state, 'repeating the same mistake changes nothing');
});

test('a right answer solves the round and blocks further choices', () => {
  const rng = seq(2);
  let state = create({ rng, config: { max: 5 } });
  state = reduce(state, { type: 'choose', value: 3 }, { rng });
  assert.equal(state.solved, true);
  assert.equal(reduce(state, { type: 'choose', value: 4 }, { rng }), state);
});

test('next only works after solving, and changes the target without repeating it', () => {
  const rng = seq(2, 2); // target 3; the draw would land on 3 again, so it skips to 4
  let state = create({ rng, config: { max: 5 } });
  assert.equal(reduce(state, { type: 'next' }, { rng }), state, 'ignored before solving');
  state = reduce(state, { type: 'choose', value: 3 }, { rng });
  state = reduce(state, { type: 'next' }, { rng });
  assert.equal(state.round, 2);
  assert.equal(state.target, 4);
  assert.deepEqual(state.wrong, []);
  assert.equal(state.solved, false);
});

test('invalid inputs return the same state', () => {
  const rng = seq(2);
  const state = create({ rng, config: { max: 5 } });
  const bad = [null, undefined, {}, { type: 'x' }, { type: 'choose' }, { type: 'choose', value: 0 }, { type: 'choose', value: 6 }, { type: 'choose', value: 2.5 }, { type: 'choose', value: '3' }];
  for (const action of bad) assert.equal(reduce(state, action as never, { rng }), state, JSON.stringify(action));
});

test('reduce does not mutate the previous state', () => {
  const rng = seq(2);
  const state = create({ rng, config: { max: 5 } });
  const before = JSON.stringify(state);
  reduce(state, { type: 'choose', value: 1 }, { rng });
  assert.equal(JSON.stringify(state), before);
});

test('a degenerate rng neither hangs nor repeats the target, and every other value is reachable', () => {
  for (const fixed of [0, 1, 2, 3]) {
    const rng: Rng = (n) => Math.min(fixed, n - 1);
    let state = create({ rng, config: { max: 5 } });
    for (let i = 0; i < 20; i++) {
      const previous = state.target;
      state = reduce(reduce(state, { type: 'choose', value: state.target }, { rng }), { type: 'next' }, { rng });
      assert.notEqual(state.target, previous);
      assert.ok(state.target >= 1 && state.target <= 5);
    }
  }
  const reached = new Set<number>();
  for (let r = 0; r < 4; r++) {
    const rng: Rng = (n) => Math.min(r, n - 1);
    const state = { ...create({ rng: () => 0, config: { max: 5 } }), target: 3, solved: true };
    reached.add(reduce(state, { type: 'next' }, { rng }).target);
  }
  assert.deepEqual([...reached].sort(), [1, 2, 4, 5]);
});

test('with max 2 the target alternates and never repeats', () => {
  const rng: Rng = (n) => Math.floor(Math.random() * n);
  let state = create({ rng, config: { max: 2 } });
  for (let i = 0; i < 50; i++) {
    const previous = state.target;
    state = reduce(reduce(state, { type: 'choose', value: state.target }, { rng }), { type: 'next' }, { rng });
    assert.notEqual(state.target, previous);
  }
});

test('create: sound is on unless the option says off; shape is drawn from the rng', () => {
  assert.equal(create({ rng: seq(0), config: { sound: 'off' } }).sound, false);
  for (const sound of ['on', undefined, 1, null, 'x']) assert.equal(create({ rng: seq(0), config: { sound } }).sound, true);
  assert.equal(create({ rng: seq(0, 3) }).shape, 3);
});

test('again counts one more time, any time, without changing the round', () => {
  const rng = seq(2);
  let state = create({ rng });
  state = reduce(state, { type: 'again' }, { rng });
  state = reduce(state, { type: 'again' }, { rng });
  assert.equal(state.replay, 2);
  assert.equal(state.round, 1);
  assert.deepEqual(state.wrong, []);
  state = reduce(reduce(state, { type: 'choose', value: state.target }, { rng }), { type: 'again' }, { rng });
  assert.equal(state.solved, true);
  assert.equal(state.replay, 3, 'also after solving');
});

test('next picks a new shape (never the same twice in a row) and resets the counting', () => {
  for (const fixed of [0, 1, 2, 3]) {
    const rng: Rng = (n) => Math.min(fixed, n - 1);
    let state = create({ rng });
    for (let i = 0; i < 20; i++) {
      const previous = state.shape;
      state = reduce(reduce(reduce(state, { type: 'again' }, { rng }), { type: 'choose', value: state.target }, { rng }), { type: 'next' }, { rng });
      assert.notEqual(state.shape, previous);
      assert.ok(state.shape >= 0 && state.shape < SHAPES);
      assert.equal(state.replay, 0);
    }
  }
});
