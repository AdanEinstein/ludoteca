// Controller of "Vamos contar!": the current number in its color and two big arrows, back and forward. The phone makes no sound.
import { html } from '/vendor/preact.js';
import { hueOf } from './logic.ts';
import type { Action } from '../types.ts';
import type { CountState } from './logic.ts';

const LOGO = new URL('./logo.svg', import.meta.url).pathname;
const ARROW = (d: string) => html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d=${d} /></svg>`;

export function PadView({ state, send }: { state: CountState; send: (action: Action) => void }) {
  return html`<section class="pad" style=${`--hue:${hueOf(state.n)};--digits:${String(state.n).length}`}>
    <header class="title"><img src=${LOGO} alt="" /><h2>Vamos contar!</h2></header>
    <p class="answer" key=${state.moves} aria-live="polite">${state.n}</p>
    <div class="arrows">
      <button class="prev" type="button" aria-label="Voltar um número" disabled=${state.n <= 1} onClick=${() => send({ type: 'prev' })}>
        ${ARROW('M15 4 L7 12 L15 20')}
      </button>
      <button class="next" type="button" aria-label="Avançar um número" onClick=${() => send({ type: 'next' })}>
        ${ARROW('M9 4 L17 12 L9 20')}
      </button>
    </div>
  </section>`;
}
