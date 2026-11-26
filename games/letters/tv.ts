// TV view of "Qual começa com?": one big letter, centered. A wrong answer or "Ver a letra de novo" makes the letter swell and settle
// again, slowly; a right answer brings the word and its picture in under the letter. The TV makes no sound.
// The platform loads tv.css and mounts this inside <div data-game="letters"> (ADR 0012).
import { html } from '/vendor/preact.js';
import { Picture } from './art.ts';
import { WORDS } from './logic.ts';
import type { LettersState } from './logic.ts';

const LOGO = new URL('./logo.svg', import.meta.url).pathname;

export function TvView({ state }: { state: LettersState }) {
  const { letter, word, id } = WORDS[state.target]!;
  const hints = state.wrong.length + state.replay; // each wrong answer or "again" shows the letter once more
  const showing = hints === 0 ? '' : hints % 2 ? 'b' : 'a'; // alternates so the CSS animation restarts each time
  return html`<section class=${`tv${state.solved ? ' solved' : ''}`} data-show=${showing} key=${state.round}>
    <header class="title"><img src=${LOGO} alt="" /><h1>Qual começa com?</h1></header>
    <p class="letter" aria-live="polite">${letter}</p>
    <div class="answer" aria-hidden=${state.solved ? 'false' : 'true'}>
      ${state.solved ? html`<${Picture} id=${id} /><p class="word">${word}</p>` : null}
    </div>
  </section>`;
}
