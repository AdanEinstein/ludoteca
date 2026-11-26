// Confetti on a canvas, for a right answer. Soft rain of big pieces, slow, fading; skipped when the person prefers reduced motion.
// Particles and motion are in particles.ts (tested); this file only draws.
import { useEffect, useRef } from '/vendor/preact.js';
import { at, createParticles, lastsUntil, type Particle } from './particles.ts';

// Weak TVs (ADR 0017 audience plays on one): the canvas is drawn at half size and stretched by CSS, a quarter of the pixels to clear and
// composite; its memory is given back as soon as the rain ends or is cancelled (a new canvas per round used to pile up ~8 MB each).
const SCALE = 0.5;
const SLOW_FRAME_MS = 50; // a frame this slow, five times, and the rain stops: the game matters more than the confetti
const MAX_SLOW_FRAMES = 5;

const rng = (n: number): number => Math.floor(Math.random() * n);

// Outline points (unit radius) of the polygon shapes; the circle and the rounded square use the canvas primitives.
const DIAMOND: Array<[number, number]> = [[0, -1], [0.85, 0], [0, 1], [-0.85, 0]];
const STAR: Array<[number, number]> = Array.from({ length: 10 }, (_, i) => {
  const radius = i % 2 ? 0.45 : 1;
  const theta = (Math.PI * i) / 5 - Math.PI / 2;
  return [Math.cos(theta) * radius, Math.sin(theta) * radius];
});

function draw(ctx: CanvasRenderingContext2D, p: Particle, x: number, y: number, angle: number, alpha: number): void {
  const r = p.size / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = p.color;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  if (p.kind === 'circle') ctx.arc(0, 0, r, 0, Math.PI * 2);
  else if (p.kind === 'square') ctx.roundRect(-r, -r, p.size, p.size, r * 0.35);
  else for (const [px, py] of p.kind === 'diamond' ? DIAMOND : STAR) ctx.lineTo(px * r, py * r);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Starts the rain after `delayMs` and returns a function that cancels it. Does nothing if the person prefers reduced motion. */
export function startConfetti(canvas: HTMLCanvasElement, { count, delayMs }: { count: number; delayMs: number }): () => void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  let frame = 0;
  const release = (): void => {
    canvas.width = 0; // resizing a canvas drops its pixel buffer
    canvas.height = 0;
  };
  const timer = setTimeout(() => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = Math.round(width * SCALE); // setting the size also resets the transform
    canvas.height = Math.round(height * SCALE);
    ctx.scale(SCALE, SCALE); // from here on everything is drawn in CSS pixels, as before
    const particles = createParticles(count, width, height, rng);
    const end = lastsUntil(particles);
    const start = performance.now();
    let previous = 0;
    let slow = 0;
    const tick = (now: number): void => {
      if (previous && now - previous > SLOW_FRAME_MS) slow++;
      previous = now;
      const t = (now - start) / 1000;
      if (t > end || slow >= MAX_SLOW_FRAMES) return release(); // all gone (or the screen cannot keep up): stop asking for frames
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        const state = at(p, t);
        if (state && state.alpha > 0) draw(ctx, p, state.x, state.y, state.angle, state.alpha);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  }, delayMs);
  return () => {
    clearTimeout(timer);
    cancelAnimationFrame(frame);
    release();
  };
}

/** Rains confetti while `active` is true (and cleans up when it turns false or the view goes away). Returns the canvas ref. */
export function useConfetti(active: boolean, options: { count: number; delayMs: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!active || !canvas.current) return;
    return startConfetti(canvas.current, options);
  }, [active]);
  return canvas;
}
