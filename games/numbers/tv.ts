// TV view of "Quantos tem?": shows the pieces and, when solved, the number. Preact updates in place, so the colors fade slowly.
// The platform loads tv.css and mounts this inside <div data-game="numbers"> (ADR 0012).
import { html } from '/vendor/preact.js';
import type { NumbersState } from './logic.ts';

export function TvView({ state }: { state: NumbersState }) {
  return html`<section class=${state.solved ? 'tv solved' : 'tv'} key=${state.round}>
    <p class="number" aria-live="polite">${state.solved ? state.target : '?'}</p>
    <ul class="pieces" aria-label="Quantos tem?">
      ${Array.from({ length: state.target }, (_, i) => html`<li class="piece" key=${i}></li>`)}
    </ul>
  </section>`;
}
