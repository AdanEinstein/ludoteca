// Phone menu (ADR 0012): games by theme; a game with options asks the adult first and remembers the choice on this phone.
import { html, useState } from '/vendor/preact.js';
import type { Catalog, CatalogGame, NoticeReason } from '../server/protocol.ts';
import type { OptionValue } from '../games/types.ts';
import { read, write } from './storage.ts';

// UI text, Portuguese (ADR 0008)
const NOTICE_TEXT: Record<NoticeReason, string> = {
  too_few: 'Faltam controles para este jogo.',
  too_many: 'Tem controles demais para este jogo.',
};

/** Every game has a `logo.svg` in its folder (checked by games/contract.test.ts). */
export const logoOf = (game: { id: string }): string => `/games/${encodeURIComponent(game.id)}/logo.svg`;

const playersText = ({ min, max }: CatalogGame['players']): string =>
  min === max ? `${min} ${min === 1 ? 'jogador' : 'jogadores'}` : `${min} a ${max} jogadores`;

const savedConfig = (game: CatalogGame): Record<string, OptionValue> => {
  let saved: Record<string, unknown> = {};
  try {
    saved = JSON.parse(read(`ludoteca:config:${game.id}`) || '{}');
  } catch {
    /* corrupted: use the defaults */
  }
  // the server validates again; here we only avoid showing a choice that no longer exists
  return Object.fromEntries(
    (game.options ?? []).map((option) => [option.id, option.choices.some((c) => c.value === saved[option.id]) ? (saved[option.id] as OptionValue) : option.default]),
  );
};

type Props = { catalog: Catalog; notice: NoticeReason | null; onStart: (id: string, config: Record<string, OptionValue>) => void };

export function Menu({ catalog, notice, onStart }: Props) {
  const [picked, setPicked] = useState<CatalogGame | null>(null);
  const [theme, setTheme] = useState('all'); // catalog filter: 'all' or a theme id
  const [config, setConfig] = useState<Record<string, OptionValue>>({});

  const choose = (game: CatalogGame): void => {
    if (!game.options?.length) return onStart(game.id, {});
    setConfig(savedConfig(game));
    setPicked(game);
  };
  const play = (game: CatalogGame): void => {
    write(`ludoteca:config:${game.id}`, JSON.stringify(config));
    onStart(game.id, config);
    setPicked(null);
  };

  if (picked) {
    return html`<section class="options-form">
      <header class="picked"><img class="cover" src=${logoOf(picked)} alt="" /><h2>${picked.name}</h2></header>
      ${(picked.options ?? []).map(
        (option) => html`<fieldset key=${option.id}>
          <legend>${option.label}</legend>
          <section class="choices">
            ${option.choices.map(
              (choice) => html`<button key=${choice.value} type="button" aria-pressed=${config[option.id] === choice.value}
                onClick=${() => setConfig({ ...config, [option.id]: choice.value })}>${choice.label}</button>`,
            )}
          </section>
        </fieldset>`,
      )}
      <button class="primary" type="button" onClick=${() => play(picked)}>Jogar</button>
      <button type="button" onClick=${() => setPicked(null)}>Voltar</button>
    </section>`;
  }

  if (catalog.games.length === 0) return html`<p class="status">Nenhum jogo por aqui ainda.</p>`;
  const shown = catalog.games.filter((game) => theme === 'all' || game.theme === theme);
  return html`<section class="menu">
    <h2 class="menu-title">Escolha um jogo</h2>
    ${notice ? html`<p class="status" role="status">${NOTICE_TEXT[notice]}</p>` : null}
    ${catalog.themes.length > 1
      ? html`<nav class="chips" aria-label="Temas">
          ${[{ id: 'all', name: 'Todos' }, ...catalog.themes].map(
            (item) => html`<button key=${item.id} type="button" aria-pressed=${theme === item.id} onClick=${() => setTheme(item.id)}>${item.name}</button>`,
          )}
        </nav>`
      : null}
    <ul class="cards">
      ${shown.map(
        (game) => html`<li key=${game.id}>
          <button class="card" type="button" onClick=${() => choose(game)}>
            <img class="cover" src=${logoOf(game)} alt="" />
            <span class="name">${game.name}</span>
            <small>${playersText(game.players)}</small>
          </button>
        </li>`,
      )}
    </ul>
  </section>`;
}
