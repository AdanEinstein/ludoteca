// TV view of "Quantos tem?": the pieces appear one by one while the TV counts; a wrong answer or "contar de novo" counts them again,
// slowly; a right answer lights them up one by one and then shows the number. Each round has its own shape and color.
// The platform loads tv.css and mounts this inside <div data-game="numbers"> (ADR 0012).
import { html, useEffect, useRef } from '/vendor/preact.js';
import { celebrate, countTones, unlock } from './audio.ts';
import type { NumbersState } from './logic.ts';

const STEP_MS = 420; // time between pieces: the pace of counting (tv.css uses the same value in --step)
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

export function TvView({ state }: { state: NumbersState }) {
  const hints = state.wrong.length + state.replay; // each wrong answer or "again" is one more counting
  const step = STEP_MS / 1000;

  useEffect(() => {
    unlock();
    if (state.sound && !state.solved) countTones(state.target, step); // the round starts: the pieces appear counting
  }, [state.round]);
  useChange(hints, () => state.sound && countTones(state.target, step));
  useChange(state.solved, (solved) => solved && state.sound && celebrate(state.target, step));

  const counting = hints === 0 ? '' : hints % 2 ? 'b' : 'a'; // alternates so the CSS animation restarts each time
  return html`<section class=${`tv shape-${state.shape}${state.solved ? ' solved' : ''}`} data-count=${counting} key=${state.round}
    style=${`--n:${state.target}`}>
    <header class="title"><img src=${LOGO} alt="" /><h1>Quantos tem?</h1></header>
    <p class=${state.solved ? 'number shown' : 'number'} aria-live="polite">${state.solved ? state.target : '?'}</p>
    <ul class="pieces" aria-label="Quantos tem?">
      ${Array.from({ length: state.target }, (_, i) => html`<li class="piece" key=${i} style=${`--i:${i}`}></li>`)}
    </ul>
  </section>`;
}
