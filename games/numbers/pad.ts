// Controller of "Quantos tem?": number buttons with the quantity drawn under each numeral; a wrong answer only dims the option;
// "Contar de novo" asks the TV to count again; solving shows a single big "Próximo" button. The phone makes no sound.
import { html } from '/vendor/preact.js';
import type { Action } from '../types.ts';
import type { NumbersState } from './logic.ts';

const LOGO = new URL('./logo.svg', import.meta.url).pathname;

export function PadView({ state, send }: { state: NumbersState; send: (action: Action) => void }) {
  const options = Array.from({ length: state.max }, (_, i) => i + 1);
  return html`<section class=${`pad${state.solved ? ' solved' : ''}`} key=${state.round}>
    <header class="title"><img src=${LOGO} alt="" /><h2>${state.solved ? 'Isso!' : 'Quantos tem?'}</h2></header>
    ${state.solved
      ? html`<p class="answer" aria-live="polite">${state.target}</p>
          <button class="next" type="button" onClick=${() => send({ type: 'next' })}>Próximo</button>`
      : html`<ul class="options">
          ${options.map((n) => {
            const tried = state.wrong.includes(n);
            return html`<li key=${n} style=${`--i:${n}`}>
              <button type="button" class=${tried ? 'tried' : ''} disabled=${tried} aria-label=${`Número ${n}`}
                onClick=${() => send({ type: 'choose', value: n })}>
                <span class="numeral">${n}</span>
                <span class="dots" aria-hidden="true">${Array.from({ length: n }, (_, d) => html`<i key=${d}></i>`)}</span>
              </button>
            </li>`;
          })}
        </ul>`}
    <button class="again" type="button" onClick=${() => send({ type: 'again' })}>Contar de novo</button>
  </section>`;
}
