// Controller of "Qual começa com?": 3 or 4 words, each with a picture made of shapes; a wrong word only dims; "Ver a letra de novo"
// asks the TV to show the letter again; solving shows the picture popping in with a little confetti and a single big "Próximo"
// button. The phone makes no sound (the TV does).
import { html } from '/vendor/preact.js';
import { Picture } from './art.ts';
import { useConfetti } from './confetti.ts';
import { WORDS } from './logic.ts';
import type { Action } from '../types.ts';
import type { LettersState } from './logic.ts';

const LOGO = new URL('./logo.svg', import.meta.url).pathname;

export function PadView({ state, send }: { state: LettersState; send: (action: Action) => void }) {
  const solvedWord = WORDS[state.target]!;
  const confetti = useConfetti(state.solved, { count: 36, delayMs: 200 });
  return html`<section class=${`pad${state.solved ? ' solved' : ''}`} key=${state.round}>
    <canvas class="confetti" ref=${confetti} aria-hidden="true"></canvas>
    <header class="title"><img src=${LOGO} alt="" /><h2>${state.solved ? 'Isso!' : 'Qual começa com?'}</h2></header>
    ${state.solved
      ? html`<div class="answer" aria-live="polite"><${Picture} id=${solvedWord.id} /><p class="word">${solvedWord.word}</p></div>
          <button class="next" type="button" onClick=${() => send({ type: 'next' })}>Próximo</button>`
      : html`<ul class=${`options n${state.count}`}>
          ${state.choices.map((index, i) => {
            const { id, word } = WORDS[index]!;
            const tried = state.wrong.includes(index);
            return html`<li key=${index} style=${`--i:${i}`}>
              <button type="button" class=${tried ? 'tried' : ''} disabled=${tried} aria-label=${word} onClick=${() => send({ type: 'choose', value: index })}>
                <${Picture} id=${id} />
                <span class="word">${word}</span>
              </button>
            </li>`;
          })}
        </ul>`}
    <button class="again" type="button" onClick=${() => send({ type: 'again' })}>Ver a letra de novo</button>
  </section>`;
}
