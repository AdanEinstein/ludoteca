// TV view of "Vamos contar!": a huge number on a background whose color belongs to that number, ten dots that light up one by one,
// and a soft slide-and-pop each time the child steps. Animation is driven by `moves` (the key remounts the number), never by a clock.
// The platform loads tv.css and mounts this inside <div data-game="count"> (ADR 0012).
import { html, useEffect, useRef } from '/vendor/preact.js';
import { step, unlock } from './audio.ts';
import { dotsOf, hueOf } from './logic.ts';
import type { CountState } from './logic.ts';

const LOGO = new URL('./logo.svg', import.meta.url).pathname;

export function TvView({ state }: { state: CountState }) {
  const first = useRef(true);
  useEffect(() => {
    unlock();
    if (first.current) { first.current = false; return; } // a reconnection must not replay the sound
    if (state.sound) step(state.n, state.dir);
  }, [state.moves]);

  const lit = dotsOf(state.n);
  return html`<section class=${`tv ${state.dir === 1 ? 'forward' : 'back'}`} style=${`--hue:${hueOf(state.n)};--digits:${String(state.n).length}`}>
    <header class="title"><img src=${LOGO} alt="" /><h1>Vamos contar!</h1></header>
    <p class="number" key=${state.moves} aria-live="polite">${state.n}</p>
    <ul class="dots" aria-hidden="true">
      ${Array.from({ length: 10 }, (_, i) => html`<li key=${i === lit - 1 ? `${i}-${state.moves}` : i} class=${i < lit ? (i === lit - 1 ? 'on last' : 'on') : ''}></li>`)}
    </ul>
  </section>`;
}
