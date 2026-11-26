// Mounts a game's view on the TV or the phone (ADR 0012). The game gets an empty canvas, `<div data-game="<id>">`, and its own
// stylesheet (`games/<id>/tv.css` or `pad.css`) that exists only while the game runs. Nothing from the platform's look reaches it.
import { html, useEffect, useState } from '/vendor/preact.js';
import type { Catalog } from '../server/protocol.ts';

export type Kind = 'tv' | 'pad';

/** Loads the game's view module and its stylesheet. Returns `null` until both are ready, so the game never shows unstyled. */
export function useGameView<Props>(kind: Kind, gameId: string | undefined, catalog: Catalog | null): ((props: Props) => unknown) | null {
  const [view, setView] = useState<((props: Props) => unknown) | null>(null);
  useEffect(() => {
    setView(null);
    if (!gameId || !catalog) return;
    let current = true;
    const link = catalog.games.find((game) => game.id === gameId)?.styles?.includes(kind) ? document.createElement('link') : null;
    const styled = new Promise<void>((resolve) => {
      if (!link) return resolve();
      link.rel = 'stylesheet';
      link.href = `/games/${encodeURIComponent(gameId)}/${kind}.css`;
      link.onload = link.onerror = () => resolve(); // a missing stylesheet must not block the game
      document.head.append(link);
    });
    Promise.all([import(`/games/${encodeURIComponent(gameId)}/${kind}.ts`), styled]).then(
      ([module]) => current && setView(() => module[kind === 'tv' ? 'TvView' : 'PadView']),
      () => {},
    );
    return () => {
      current = false;
      link?.remove();
    };
  }, [gameId, catalog]);
  return view;
}

export function GameRoot({ id, children }: { id: string; children?: unknown }) {
  return html`<div class="game-root" data-game=${id}>${children}</div>`;
}
