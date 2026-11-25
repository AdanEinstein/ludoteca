// TV view of "Quantos tem?": shows the pieces and, when solved, the number. Preact updates in place, so the colors fade slowly.
import { html } from '/vendor/preact.js';
import type { NumbersState } from './logic.ts';

const STYLE = new URL('./numbers.css', import.meta.url).pathname;

export function TvView({ state }: { state: NumbersState }) {
  return html`<section class=${state.solved ? 'numbers-tv solved' : 'numbers-tv'} key=${state.round}>
    <link rel="stylesheet" href=${STYLE} />
    <p class="number" aria-live="polite">${state.solved ? state.target : '?'}</p>
    <ul class="pieces" aria-label="Quantos tem?">
      ${Array.from({ length: state.target }, (_, i) => html`<li class="piece" key=${i}></li>`)}
    </ul>
  </section>`;
}
