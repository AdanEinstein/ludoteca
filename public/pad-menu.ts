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
      <h2>${picked.name}</h2>
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
  return html`<section class="menu">
    ${notice ? html`<p class="status" role="status">${NOTICE_TEXT[notice]}</p>` : null}
    ${catalog.themes.map(
      (theme) => html`<section key=${theme.id} class="theme">
        <h2>${theme.name}</h2>
        <ul>
          ${catalog.games
            .filter((game) => game.theme === theme.id)
            .map((game) => html`<li key=${game.id}>
              <button type="button" onClick=${() => choose(game)}>${game.name}<small>${playersText(game.players)}</small></button>
            </li>`)}
        </ul>
      </section>`,
    )}
  </section>`;
}
