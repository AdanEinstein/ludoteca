import { test } from 'node:test';
import assert from 'node:assert/strict';
import { at, COLORS, createParticles, KINDS, lastsUntil } from './particles.ts';
import type { Rng } from '../types.ts';

const rng: Rng = (n) => Math.floor(Math.random() * n);

test('createParticles: the right count, inside the screen width, starting above the top, with known shapes and colors', () => {
  const particles = createParticles(60, 1920, 1080, rng);
  assert.equal(particles.length, 60);
  for (const p of particles) {
    assert.ok(p.x >= 0 && p.x <= 1920);
    assert.ok(p.y < 0, 'starts above the screen');
    assert.ok(KINDS.includes(p.kind) && COLORS.includes(p.color as never));
    assert.ok(p.size >= 14 && p.size <= 40);
    assert.ok(Math.abs(p.spin) <= 1.2 && Math.abs(p.vx) <= 30, 'slow turning and drift');
    assert.ok(p.vy >= 1080 / 9 && p.vy <= 1080 / 5, 'a slow fall: 5 to 9 seconds across the screen');
  }
});

test('createParticles survives a degenerate rng (0 and the maximum) without NaN', () => {
  for (const fixed of [0, 999]) {
    for (const p of createParticles(5, 390, 844, (n) => Math.min(fixed, n - 1))) {
      for (const value of [p.x, p.y, p.size, p.vx, p.vy, p.angle, p.spin, p.delay, p.life]) assert.ok(Number.isFinite(value));
    }
  }
});

test('at: invisible before its delay, fades in, moves down slowly, fades out and ends', () => {
  const [p] = createParticles(1, 1000, 1000, rng);
  assert.ok(p);
  assert.equal(at(p, p.delay - 0.01)?.alpha, 0);
  const early = at(p, p.delay + 0.1);
  const mid = at(p, p.delay + p.life / 2);
  assert.ok(early && mid);
  assert.ok(early.alpha > 0 && early.alpha < 1, 'fading in');
  assert.equal(mid.alpha, 1);
  assert.ok(mid.y > early.y, 'falls');
  const tail = at(p, p.delay + p.life - 0.3);
  assert.ok(tail && tail.alpha < 0.3, 'fading out');
  assert.equal(at(p, p.delay + p.life + 0.01), null);
});

test('lastsUntil is when the last particle ends, so the canvas can stop and be cleared', () => {
  const particles = createParticles(20, 800, 600, rng);
  const end = lastsUntil(particles);
  assert.ok(particles.every((p) => at(p, end + 0.001) === null));
  assert.equal(lastsUntil([]), 0);
});
