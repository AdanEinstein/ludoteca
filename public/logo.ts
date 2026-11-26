// Ludoteca logo as inline SVG, so its parts can be animated with CSS (ADR 0015). Same geometry as brand/final/ludoteca-horizontal.svg.
// The animation is slow and happens once (the amber piece settles into the corner of the L, the letters fade in one by one),
// followed by a very gentle "breathing" of that piece. prefers-reduced-motion turns all of it off (base.css).
import { html } from '/vendor/preact.js';

const SYMBOL = 'M60 36H84A10 10 0 0 1 94 46V176H196A10 10 0 0 1 206 186V210A10 10 0 0 1 196 220H74A24 24 0 0 1 50 196V46A10 10 0 0 1 60 36Z';

// One entry per letter of "ludoteca"; a letter can have several paths (d = bowl + stem).
const LETTERS: Array<Array<{ d: string; evenodd?: boolean }>> = [
  [{ d: 'M12 0H12A12 12 0 0 1 24 12V144A12 12 0 0 1 12 156H12A12 12 0 0 1 0 144V12A12 12 0 0 1 12 0Z' }],
  [{ d: 'M46 68A12 12 0 0 1 70 68V115A17 17 0 0 0 104 115V68A12 12 0 0 1 128 68V115A41 41 0 0 1 46 115Z' }],
  [
    { d: 'M146 106A50 50 0 1 0 246 106A50 50 0 1 0 146 106ZM170 106A26 26 0 1 0 222 106A26 26 0 1 0 170 106Z', evenodd: true },
    { d: 'M222 12A12 12 0 0 1 246 12V106H222Z' },
  ],
  [{ d: 'M258 106A50 50 0 1 0 358 106A50 50 0 1 0 258 106ZM282 106A26 26 0 1 0 334 106A26 26 0 1 0 282 106Z', evenodd: true }],
  [
    { d: 'M398 28H398A12 12 0 0 1 410 40V144A12 12 0 0 1 398 156H398A12 12 0 0 1 386 144V40A12 12 0 0 1 398 28Z' },
    { d: 'M384 56H412A12 12 0 0 1 424 68V68A12 12 0 0 1 412 80H384A12 12 0 0 1 372 68V68A12 12 0 0 1 384 56Z' },
  ],
  [
    { d: 'M509 149.3A50 50 0 1 1 532.54 94L509.24 99.76A26 26 0 1 0 497 128.52A12 12 0 0 1 509 149.3Z' },
    { d: 'M446 94H532.54V118H446Z' },
  ],
  [{ d: 'M632.3 138.14A50 50 0 1 1 632.3 73.86A12 12 0 0 1 613.92 89.29A26 26 0 1 0 613.92 122.71A12 12 0 0 1 632.3 138.14Z' }],
  [
    { d: 'M656 106A50 50 0 1 0 756 106A50 50 0 1 0 656 106ZM680 106A26 26 0 1 0 732 106A26 26 0 1 0 680 106Z', evenodd: true },
    { d: 'M732 68A12 12 0 0 1 756 68V106H732Z' },
  ],
];

/** Colors come from the platform tokens (--blue, --amber), so it works on any platform screen (.shell). */
export function Logo({ animate = false, symbolOnly = false }: { animate?: boolean; symbolOnly?: boolean }) {
  const viewBox = symbolOnly ? '36 28 190 200' : '0 0 892.8 256';
  return html`<svg class=${animate ? 'logo logo-anim' : 'logo'} viewBox=${viewBox} role="img" aria-label="Ludoteca">
    <g transform="translate(-14 0)">
      <path class="logo-l" fill="var(--blue)" d=${SYMBOL} />
      <circle class="logo-dot" fill="var(--amber)" cx="148" cy="122" r="40" />
    </g>
    ${symbolOnly
      ? null
      : html`<g transform="translate(252 95.2) scale(0.8)">
          ${LETTERS.map(
            (paths, index) => html`<g key=${index} class="logo-letter" style=${`--i:${index}`}>
              ${paths.map((p) => html`<path fill="var(--blue)" fill-rule=${p.evenodd ? 'evenodd' : 'nonzero'} d=${p.d} />`)}
            </g>`,
          )}
        </g>`}
  </svg>`;
}
