import { test } from 'node:test';
import assert from 'node:assert/strict';
import { create, dotsOf, hueOf, reduce } from '../logic.ts';

const fresh = (config = {}) => create({ config });

test('create starts at 1, going forward, with sound on unless turned off', () => {
  assert.deepEqual(fresh(), { game: 'count', n: 1, dir: 1, moves: 0, sound: true });
  assert.equal(fresh({ sound: 'off' }).sound, false);
  assert.equal(fresh({ sound: 'junk' }).sound, true);
});

test('next and prev step by one and remember the direction', () => {
  let state = reduce(fresh(), { type: 'next' });
  state = reduce(state, { type: 'next' });
  assert.deepEqual([state.n, state.dir, state.moves], [3, 1, 2]);
  state = reduce(state, { type: 'prev' });
  assert.deepEqual([state.n, state.dir, state.moves], [2, -1, 3]);
});

test('prev at 1 and next at the last safe integer return the same object', () => {
  const start = fresh();
  assert.equal(reduce(start, { type: 'prev' }), start);
  const end = { ...start, n: Number.MAX_SAFE_INTEGER };
  assert.equal(reduce(end, { type: 'next' }), end);
  assert.equal(reduce(end, { type: 'prev' }).n, Number.MAX_SAFE_INTEGER - 1);
});

test('invalid actions return the same object and reduce does not mutate', () => {
  const state = Object.freeze(fresh());
  for (const action of [null, undefined, {}, { type: 'x' }, { type: 'choose', value: 3 }]) assert.equal(reduce(state, action as never), state);
});

test('hueOf never lands in the reds and neighbours differ a lot', () => {
  for (let n = 1; n <= 10000; n++) {
    const hue = hueOf(n);
    assert.ok(hue >= 30 && hue < 320, `n=${n} hue=${hue}`);
  }
  for (let n = 1; n < 200; n++) assert.ok(Math.abs(hueOf(n) - hueOf(n + 1)) > 20, `n=${n}`);
});

test('dotsOf cycles 1..10 and lights all ten on every multiple of ten', () => {
  assert.deepEqual([1, 5, 10, 11, 20, 21].map(dotsOf), [1, 5, 10, 1, 10, 1]);
});
