// Conformance of every registered game with the platform contract (ADR 0006, 0012). A new game is added to games/index.ts
// and this file checks it without anyone writing new tests for the contract.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { games, themes } from './index.ts';
import type { GameModule, GameState } from './types.ts';

const here = new URL('.', import.meta.url);
const file = (id: string, name: string): URL => new URL(`${id}/${name}`, here);
const seq = (n: number): number => n - 1; // fixed rng: always the last value

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object') for (const inner of Object.values(value)) deepFreeze(inner);
  return Object.freeze(value);
};

// The default config of a game: every option at its default.
const defaults = (game: GameModule) => Object.fromEntries((game.meta.options ?? []).map((option) => [option.id, option.default]));
const create = (game: GameModule): GameState => {
  const { min } = game.meta.players;
  return game.create({ rng: seq, players: Array.from({ length: min }, (_, seat) => seat), config: defaults(game) });
};

/** Scoped CSS: every selector starts with [data-game="<id>"], keyframes and font families carry the id, nothing is imported. */
export function cssProblems(id: string, css: string): string[] {
  const problems: string[] = [];
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  if (/@import/.test(clean)) problems.push('@import is not allowed');
  const scope = `[data-game="${id}"]`;
  const stack: Array<'check' | 'skip'> = []; // what to do with the rules of each open block
  for (const token of clean.matchAll(/([^{}]*)\{|\}/g)) {
    if (token[0] === '}') {
      stack.pop();
      continue;
    }
    const prelude = (token[1] ?? '').trim();
    const parent = stack[stack.length - 1] ?? 'check';
    if (prelude.startsWith('@')) {
      const name = /^@(\S+)\s*(.*)$/.exec(prelude);
      if (name?.[1]?.endsWith('keyframes') && !name[2]?.startsWith(`${id}-`)) problems.push(`keyframes "${name[2]}" must start with "${id}-"`);
      stack.push(name?.[1] === 'media' || name?.[1] === 'supports' ? parent : 'skip');
    } else {
      if (parent === 'check') {
        for (const selector of prelude.split(',').map((part) => part.trim())) {
          if (!selector.startsWith(scope)) problems.push(`selector "${selector}" must start with ${scope}`);
        }
      }
      stack.push('skip'); // declarations inside: nothing to check as selectors
    }
  }
  for (const match of clean.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const family = /font-family:\s*["']?([^;"']+)/.exec(match[1] ?? '')?.[1]?.trim();
    if (!family?.startsWith(`${id}-`)) problems.push(`font-family "${family}" must start with "${id}-"`);
  }
  return problems;
}

test('cssProblems: accepts scoped CSS and flags leaks', () => {
  assert.deepEqual(cssProblems('g', '[data-game="g"] { color: red }\n[data-game="g"] .a, [data-game="g"] b { x: y }\n@media (min-width: 1px) { [data-game="g"] p { x: y } }'), []);
  assert.deepEqual(cssProblems('g', '@keyframes g-fade { from { opacity: 0 } to { opacity: 1 } }\n@font-face { font-family: "g-sans"; src: url(a.woff2) }'), []);
  assert.equal(cssProblems('g', 'body { margin: 0 }').length, 1);
  assert.equal(cssProblems('g', '[data-game="g"] a, p { x: y }').length, 1);
  assert.equal(cssProblems('g', '@media print { p { x: y } }').length, 1);
  assert.equal(cssProblems('g', '@keyframes fade { from { opacity: 0 } }').length, 1);
  assert.equal(cssProblems('g', '@font-face { font-family: Sans; src: url(a.woff2) }').length, 1);
  assert.equal(cssProblems('g', '@import url(x.css);').length, 1);
  assert.equal(cssProblems('g', '[data-game="other"] a { x: y }').length, 1);
});

for (const [id, game] of Object.entries(games)) {
  test(`game "${id}": folder, metadata and catalog entry`, () => {
    const { meta } = game;
    assert.equal(meta.id, id, 'meta.id is the folder name and the key in games/index.ts');
    assert.match(id, /^[a-z][a-z0-9-]*$/);
    for (const name of ['logic.ts', 'tv.ts', 'pad.ts', 'logic.test.ts']) assert.ok(existsSync(file(id, name)), `${id}/${name} is missing`);
    for (const kind of meta.styles ?? []) assert.ok(existsSync(file(id, `${kind}.css`)), `${id}/${kind}.css is declared in meta.styles but missing`);
    assert.ok(meta.name.trim(), 'name');
    assert.ok(meta.theme in themes, `theme "${meta.theme}" is not in themes (games/index.ts)`);
    assert.ok(Number.isInteger(meta.players.min) && meta.players.min >= 1 && meta.players.max >= meta.players.min, 'players');
    assert.ok(meta.actions.length > 0 && meta.actions.every((a) => /^[a-z][a-z_]*$/.test(a)), 'actions');
    assert.equal(new Set(meta.actions).size, meta.actions.length, 'actions are unique');
    const optionIds = (meta.options ?? []).map((option) => option.id);
    assert.equal(new Set(optionIds).size, optionIds.length, 'option ids are unique');
    for (const option of meta.options ?? []) {
      assert.ok(option.label.trim() && option.choices.length >= 2, `option ${option.id}`);
      assert.ok(option.choices.some((choice) => choice.value === option.default), `option ${option.id}: default is not among the choices`);
    }
    assert.doesNotThrow(() => JSON.stringify(meta), 'meta is JSON, it goes to the phone in the catalog');
  });

  test(`game "${id}": create and reduce follow the rules`, () => {
    const state = create(game);
    assert.equal(state.game, id, 'state.game is the game id');
    assert.deepEqual(JSON.parse(JSON.stringify(state)), state, 'state survives JSON');
    const frozen = deepFreeze(JSON.parse(JSON.stringify(state)) as GameState);
    assert.equal(game.reduce(frozen, { type: '__not_declared__' }, { rng: seq, player: 0 }), frozen, 'unknown action: same object');
    for (const type of game.meta.actions) {
      assert.doesNotThrow(() => game.reduce(frozen, { type }, { rng: seq, player: 0 }), `reduce("${type}") must not mutate or throw`);
      assert.doesNotThrow(() => game.reduce(frozen, { type, value: 'junk' }, { rng: seq, player: 99 }), `reduce("${type}", junk) must not throw`);
    }
    if (game.view) {
      for (const viewer of ['tv', 0] as const) assert.equal(game.view(state, viewer).game, id, `view(${viewer}) keeps the game id`);
    }
  });

  for (const kind of game.meta.styles ?? []) {
    test(`game "${id}": ${kind}.css only touches its own area`, () => {
      assert.deepEqual(cssProblems(id, readFileSync(file(id, `${kind}.css`), 'utf8')), []);
    });
  }
}

test('every theme used by a game is named, and the platform has a place for an empty catalog', () => {
  for (const name of Object.values(themes)) assert.ok(name.trim());
});
