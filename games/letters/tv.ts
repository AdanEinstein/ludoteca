// TV view of "Qual começa com?": one big letter, centered. A wrong answer or "Ver a letra de novo" makes the letter swell and settle
// again, slowly; a right answer brings the word and its picture in under the letter, with a halo, confetti and applause. The TV plays
// a soft note whenever the letter is shown and a rising tune when the child gets it right ("Som na TV" turns it off).
// The platform loads tv.css and mounts this inside <div data-game="letters"> (ADR 0012).
import { html, useEffect, useRef } from '/vendor/preact.js';
import { Picture } from './art.ts';
import { celebrate, ping, preload, unlock } from './audio.ts';
import { useConfetti } from './confetti.ts';
import { WORDS } from './logic.ts';
import type { LettersState } from './logic.ts';

const LOGO = new URL('./logo.svg', import.meta.url).pathname;

/** Runs `effect` when `value` changes, but not on the first render (a reconnection must not replay the sounds). */
function useChange<T>(value: T, effect: (value: T) => void): void {
  const previous = useRef(value);
  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    effect(value);
  }, [value]);
}

export function TvView({ state }: { state: LettersState }) {
  const { letter, word, id } = WORDS[state.target]!;
  const hints = state.wrong.length + state.replay; // each wrong answer or "again" shows the letter once more

  useEffect(() => {
    unlock();
    if (state.sound) void preload();
    if (state.sound && !state.solved) ping(); // the round starts: the letter shows up
  }, [state.round]);
  useChange(hints, () => state.sound && ping());
  useChange(state.solved, (solved) => solved && state.sound && celebrate());

  const confetti = useConfetti(state.solved, { count: 70, delayMs: 900 }); // after the picture has come in
  const showing = hints === 0 ? '' : hints % 2 ? 'b' : 'a'; // alternates so the CSS animation restarts each time
  return html`<section class=${`tv${state.solved ? ' solved' : ''}`} data-show=${showing} key=${state.round}>
    <header class="title"><img src=${LOGO} alt="" /><h1>Qual começa com?</h1></header>
    ${state.solved ? html`<span class="halo" aria-hidden="true"></span>` : null}
    <p class="letter" aria-live="polite">${letter}</p>
    <canvas class="confetti" ref=${confetti} aria-hidden="true"></canvas>
    <div class="answer" aria-hidden=${state.solved ? 'false' : 'true'}>
      ${state.solved ? html`<${Picture} id=${id} /><p class="word">${word}</p>` : null}
    </div>
  </section>`;
}
