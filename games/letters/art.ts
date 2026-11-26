// Pictures made only of simple shapes (no image files), one per word in WORDS (logic.ts). Drawn on a 100x100 canvas.
// Shared by the phone (the options) and the TV (the picture appears when the child gets it right).
import { html } from '/vendor/preact.js';

const rays = Array.from({ length: 8 }, (_, i) => html`<rect x="47" y="6" width="6" height="16" rx="3" fill="#f2a900" transform=${`rotate(${i * 45} 50 50)`} />`);

const PICTURES: Record<string, unknown> = {
  tree: html`<rect x="44" y="58" width="12" height="34" rx="3" fill="#8a5a3c" /><circle cx="50" cy="38" r="28" fill="#5fae6e" />`,
  ball: html`<circle cx="50" cy="50" r="38" fill="#4d8fe0" /><circle cx="36" cy="36" r="9" fill="#fff3dc" opacity="0.8" />`,
  house: html`<rect x="22" y="48" width="56" height="42" fill="#f2b84b" /><polygon points="12,52 50,16 88,52" fill="#d9774a" /><rect x="43" y="64" width="14" height="26" rx="2" fill="#7a4a2a" />`,
  dice: html`<rect x="14" y="14" width="72" height="72" rx="14" fill="#5b6bd6" />${[[32, 32], [68, 32], [50, 50], [32, 68], [68, 68]].map(([x, y]) => html`<circle cx=${x} cy=${y} r="7" fill="#fff3dc" />`)}`,
  star: html`<polygon points="50,8 62,38 94,38 68,58 78,90 50,70 22,90 32,58 6,38 38,38" fill="#f2b84b" stroke="#d9951a" stroke-width="3" stroke-linejoin="round" />`,
  flower: html`<rect x="48" y="52" width="4" height="40" fill="#5fae6e" /><ellipse cx="62" cy="76" rx="12" ry="6" fill="#5fae6e" />${[[50, 20], [67, 33], [60, 54], [40, 54], [33, 33]].map(([x, y]) => html`<circle cx=${x} cy=${y} r="15" fill="#f08fb0" />`)}<circle cx="50" cy="40" r="11" fill="#f2b84b" />`,
  moon: html`<path d="M58 10 A40 40 0 1 0 90 66 A32 32 0 1 1 58 10 Z" fill="#f2b84b" />`,
  apple: html`<circle cx="37" cy="56" r="26" fill="#7cc576" /><circle cx="63" cy="56" r="26" fill="#7cc576" /><rect x="48" y="14" width="4" height="18" rx="2" fill="#8a5a3c" /><ellipse cx="62" cy="24" rx="12" ry="6" fill="#4f9a5a" />`,
  cloud: html`<circle cx="34" cy="56" r="17" fill="#8fc3ea" /><circle cx="54" cy="44" r="22" fill="#8fc3ea" /><circle cx="72" cy="58" r="16" fill="#8fc3ea" /><rect x="20" y="56" width="66" height="19" rx="9.5" fill="#8fc3ea" />`,
  egg: html`<ellipse cx="50" cy="56" rx="28" ry="36" fill="#f6e3b4" stroke="#c9a860" stroke-width="3" />`,
  fish: html`<ellipse cx="42" cy="50" rx="32" ry="22" fill="#f2a35e" /><polygon points="68,50 92,30 92,70" fill="#f2a35e" /><circle cx="28" cy="44" r="4" fill="#3b2a1a" />`,
  sun: html`${rays}<circle cx="50" cy="50" r="22" fill="#ffb627" />`,
  grapes: html`<rect x="48" y="8" width="4" height="14" rx="2" fill="#8a5a3c" />${[[30, 34], [50, 34], [70, 34], [40, 54], [60, 54], [50, 74]].map(([x, y]) => html`<circle cx=${x} cy=${y} r="11.5" fill="#8c5fc7" />`)}`,
};

/** The picture of a word (by `id`). Decorative: the word next to it carries the meaning, so it is hidden from screen readers. */
export function Picture({ id }: { id: string }) {
  return html`<svg class="picture" viewBox="0 0 100 100" aria-hidden="true">${PICTURES[id]}</svg>`;
}
