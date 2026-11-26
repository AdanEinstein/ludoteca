// Controller of "Quantos tem?": number buttons; a wrong answer only dims the option; solving shows a single "Próximo" button.
import { html } from '/vendor/preact.js';
import type { Action } from '../types.ts';
import type { NumbersState } from './logic.ts';

export function PadView({ state, send }: { state: NumbersState; send: (action: Action) => void }) {
  const options = Array.from({ length: state.max }, (_, i) => i + 1);
  return html`<section class="pad">
    <h2>${state.solved ? 'Isso!' : 'Quantos tem?'}</h2>
    ${state.solved
      ? html`<button class="next" type="button" onClick=${() => send({ type: 'next' })}>Próximo</button>`
      : html`<ul class="options">
          ${options.map((n) => {
            const tried = state.wrong.includes(n);
            return html`<li key=${n}>
              <button type="button" class=${tried ? 'tried' : ''} disabled=${tried} aria-label=${`Número ${n}`}
                onClick=${() => send({ type: 'choose', value: n })}>${n}</button>
            </li>`;
          })}
        </ul>`}
  </section>`;
}
