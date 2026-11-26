// Conformance of every registered game with the platform contract (ADR 0006, 0012). A new game is added to games/index.ts
// and this file checks it without anyone writing new tests for the contract.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { games, themes } from '../index.ts';
import type { GameModule, GameState } from '../types.ts';

const here = new URL('..', import.meta.url);
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
    for (const name of ['logic.ts', 'tv.ts', 'pad.ts', '__test__/logic.test.ts', 'logo.svg']) assert.ok(existsSync(file(id, name)), `${id}/${name} is missing`);
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

  // A game with more than one controller (ADR 0023): every table size it accepts must start, every seat must be able to act and
  // to see its own view, and seats may leave and come back (join/leave) without breaking the state.
  test(`game "${id}": works for every table size and seat`, () => {
    const { min, max } = game.meta.players;
    for (const size of new Set([min, max])) {
      const players = Array.from({ length: size }, (_, seat) => seat);
      const state = game.create({ rng: seq, players, config: defaults(game) });
      assert.deepEqual(JSON.parse(JSON.stringify(state)), state, `create for ${size} players survives JSON`);
      const frozen = deepFreeze(JSON.parse(JSON.stringify(state)) as GameState);
      for (const seat of players) {
        for (const type of game.meta.actions) {
          assert.doesNotThrow(() => game.reduce(frozen, { type }, { rng: seq, player: seat }), `seat ${seat} of ${size}: reduce("${type}")`);
        }
        if (game.view) {
          const seen = game.view(frozen, seat);
          assert.equal(seen.game, id, `view(${seat}) keeps the game id`);
          assert.deepEqual(JSON.parse(JSON.stringify(seen)), seen, `view(${seat}) survives JSON`);
        }
      }
      if (game.leave) assert.doesNotThrow(() => game.leave?.(frozen, players[players.length - 1] as number, { rng: seq }), 'leave');
      if (game.join) assert.doesNotThrow(() => game.join?.(frozen, size, { rng: seq }), 'join');
    }
  });

  for (const kind of game.meta.styles ?? []) {
    test(`game "${id}": ${kind}.css only touches its own area`, () => {
      assert.deepEqual(cssProblems(id, readFileSync(file(id, `${kind}.css`), 'utf8')), []);
    });
  }
}

/** The game logo is shown in the catalog (phone and TV). It is an image: no scripts, no handlers, no external references. */
export function logoProblems(svg: string): string[] {
  const problems: string[] = [];
  if (!/^\s*<svg[\s>]/.test(svg)) problems.push('must start with <svg>');
  if (!/viewBox="0 0 (\d+) \1"/.test(svg)) problems.push('viewBox must be square and start at 0 0');
  if (/<script|<foreignObject|<image|<use[^>]+href=["']https?:|\son\w+\s*=|(?:href|src)=["'](?!#)/i.test(svg)) problems.push('no scripts, handlers, images or external references');
  if (!/<title>[^<]+<\/title>/.test(svg)) problems.push('needs a <title> (accessibility)');
  return problems;
}

test('logoProblems: accepts a plain SVG and flags unsafe or sloppy ones', () => {
  assert.deepEqual(logoProblems('<svg viewBox="0 0 256 256"><title>x</title><circle r="1"/></svg>'), []);
  assert.equal(logoProblems('<svg viewBox="0 0 256 200"><title>x</title></svg>').length, 1);
  assert.equal(logoProblems('<svg viewBox="0 0 256 256"><title>x</title><script>a()</script></svg>').length, 1);
  assert.equal(logoProblems('<svg viewBox="0 0 256 256"><title>x</title><circle onclick="a()"/></svg>').length, 1);
  assert.equal(logoProblems('<svg viewBox="0 0 256 256"><title>x</title><a href="http://x"/></svg>').length, 1);
  assert.equal(logoProblems('<svg viewBox="0 0 256 256"><circle/></svg>').length, 1);
});

for (const id of Object.keys(games)) {
  test(`game "${id}": logo.svg is a safe, square image`, () => {
    assert.deepEqual(logoProblems(readFileSync(file(id, 'logo.svg'), 'utf8')), []);
  });
}

/** Audio from a public library lives in `sounds/`. Every file must be credited (source and license) and the folder stays small for the TV. */
export function soundProblems(files: Array<{ name: string; bytes: number }>, credits: string | null): string[] {
  const problems: string[] = [];
  if (files.length === 0) return problems;
  if (credits === null) return ['sounds/ needs CREDITS.md (source and license of every file)'];
  if (!/https?:\/\//.test(credits) || !/CC0|CC-BY|Creative Commons|public domain/i.test(credits)) problems.push('CREDITS.md must give the source URL and the license (CC0, CC-BY, ...)');
  for (const file of files) {
    if (!/\.(wav|ogg|mp3)$/i.test(file.name)) problems.push(`${file.name}: only .wav, .ogg or .mp3`);
    if (!credits.includes(file.name)) problems.push(`${file.name} is not credited in CREDITS.md`);
  }
  if (files.reduce((sum, f) => sum + f.bytes, 0) > 500 * 1024) problems.push('sounds/ is over 500 KB (the TV loads it over Wi-Fi)');
  return problems;
}

test('soundProblems: needs credits, a source and license, every file listed, and a small size', () => {
  const ok = 'x.wav from https://example.org, license CC0';
  assert.deepEqual(soundProblems([], null), []);
  assert.deepEqual(soundProblems([{ name: 'x.wav', bytes: 1000 }], ok), []);
  assert.equal(soundProblems([{ name: 'x.wav', bytes: 1000 }], null).length, 1);
  assert.equal(soundProblems([{ name: 'x.wav', bytes: 1000 }], 'x.wav, no source').length, 1);
  assert.equal(soundProblems([{ name: 'y.wav', bytes: 1000 }], ok).length, 1);
  assert.equal(soundProblems([{ name: 'x.flac', bytes: 1000 }], 'x.flac https://e.org CC0').length, 1);
  assert.equal(soundProblems([{ name: 'x.wav', bytes: 600 * 1024 }], ok).length, 1);
});

for (const id of Object.keys(games)) {
  test(`game "${id}": sounds are credited and small`, () => {
    const dir = new URL(`${id}/sounds/`, here);
    const files = existsSync(dir)
      ? readdirSync(dir).filter((name) => !/^CREDITS\.md$/.test(name)).map((name) => ({ name, bytes: statSync(new URL(name, dir)).size }))
      : [];
    const credits = existsSync(new URL('CREDITS.md', dir)) ? readFileSync(new URL('CREDITS.md', dir), 'utf8') : null;
    assert.deepEqual(soundProblems(files, credits), []);
  });
}

test('every theme used by a game is named, and the platform has a place for an empty catalog', () => {
  for (const name of Object.values(themes)) assert.ok(name.trim());
});
