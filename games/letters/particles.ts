// Confetti particles, pure math (no DOM), so it can be tested. Gentle on purpose (ADR 0017): few, large, slow, falling like rain,
// turning slowly, fading out. Nothing bursts or flashes.
import type { Rng } from '../types.ts';

export const KINDS = ['circle', 'square', 'diamond', 'star'] as const;
export const COLORS = ['#f2b84b', '#e9846c', '#6fb4d9', '#86c48f', '#fff6e0'] as const;

export type Particle = {
  kind: (typeof KINDS)[number];
  color: string;
  x: number; // px
  y: number; // px, starts above the top edge
  size: number; // px
  vx: number; // px/s, a slow sideways drift
  vy: number; // px/s, a slow fall
  angle: number; // rad
  spin: number; // rad/s, slow
  delay: number; // s before it starts falling (so they do not all arrive together)
  life: number; // s until it has faded out
};

/** `rng(n)` is an integer in [0, n), like everywhere else; `unit()` below turns it into a float in [0, 1). */
export function createParticles(count: number, width: number, height: number, rng: Rng): Particle[] {
  const unit = (): number => rng(1000) / 1000;
  const between = (low: number, high: number): number => low + unit() * (high - low);
  return Array.from({ length: count }, () => ({
    kind: KINDS[rng(KINDS.length)] as Particle['kind'],
    color: COLORS[rng(COLORS.length)] as string,
    x: between(0, width),
    y: -between(20, height * 0.3),
    size: between(Math.max(14, width / 90), Math.max(26, width / 50)),
    vx: between(-30, 30),
    vy: between(height / 9, height / 5), // the whole screen takes 5 to 9 seconds
    angle: between(0, Math.PI * 2),
    spin: between(-1.2, 1.2),
    delay: between(0, 1.2),
    life: between(4.5, 6.5),
  }));
}

/** Position and opacity of a particle `t` seconds after the start. Opacity ramps in and out softly. */
export function at(p: Particle, t: number): { x: number; y: number; angle: number; alpha: number } | null {
  const age = t - p.delay;
  if (age < 0) return { x: p.x, y: p.y, angle: p.angle, alpha: 0 };
  if (age > p.life) return null; // done
  const fadeIn = Math.min(1, age / 0.4);
  const fadeOut = Math.min(1, (p.life - age) / 1.2);
  return { x: p.x + p.vx * age, y: p.y + p.vy * age, angle: p.angle + p.spin * age, alpha: Math.min(fadeIn, fadeOut) };
}

export const lastsUntil = (particles: Particle[]): number => Math.max(0, ...particles.map((p) => p.delay + p.life));
