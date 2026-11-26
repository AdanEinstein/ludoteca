// TV screen: shows the room name and QR, accepts controllers with OK, lists the games and delegates the game to its module
// (ADR 0001, 0002, 0012). Preact + htm, no build (ADR 0009). UI text is Portuguese (ADR 0008).
import { html, render, useEffect, useRef, useState } from '/vendor/preact.js';
import { connect, type Connection } from './client.ts';
import { GameRoot, useGameView } from './game-host.ts';
import { Logo } from './logo.ts';
import type { Catalog, ToTv } from '../server/protocol.ts';
import type { GameState, TvProps } from '../games/types.ts';
type Room = { name: string; qr: string };

/** The QR SVG comes from our server; it still enters as an image DOM node, not as HTML. */
function Qr({ svg }: { svg: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
    ref.current?.replaceChildren(document.importNode(node, true));
  }, [svg]);
  return html`<figure class="qr" ref=${ref}></figure>`;
}

function JoinPrompt({ onAccept, onReject }: { onAccept: () => void; onReject: () => void }) {
  const acceptButton = useRef<HTMLButtonElement>(null);
  useEffect(() => acceptButton.current?.focus(), []);
  useEffect(() => {
    // OK on the remote (Enter) accepts; preventDefault stops the focused button from firing a second accept.
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        onAccept();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onAccept]);
  return html`<section class="overlay join-prompt" role="alertdialog" aria-label="Pedido de entrada">
    <p>Um controle quer entrar. Aperte <strong>OK</strong> no controle remoto para aceitar.</p>
    <section class="actions">
      <button ref=${acceptButton} class="primary" type="button" onClick=${onAccept}>Aceitar</button>
      <button type="button" onClick=${onReject}>Recusar</button>
    </section>
  </section>`;
}

/** In a game with nobody connected (phone slept or left): tells how to connect again, over the game, which stays as it was. */
function Reconnect({ room }: { room: Room }) {
  return html`<section class="overlay reconnect" role="status" aria-label="Sem controle conectado">
    <p>Sem controle. Abra a Ludoteca no celular e escolha a TV <strong>${room.name}</strong>.</p>
    ${room.qr ? html`<${Qr} svg=${room.qr} />` : null}
  </section>`;
}

/** What the TV shows between games: the QR while nobody is connected, the list of games once someone is. */
function Shell({ room, catalog, players, status }: { room: Room | null; catalog: Catalog | null; players: number; status: string }) {
  return html`<div class="shell">
    <header><${Logo} animate=${true} /></header>
    <section class="screen">
      ${players === 0
        ? html`<h1>Esta TV é a <strong>${room?.name ?? '…'}</strong></h1>
            <p class="hint">Abra a Ludoteca no celular para jogar.</p>
            ${room?.qr ? html`<${Qr} svg=${room.qr} />` : null}
            <p class="status" role="status">${status}</p>`
        : html`<h1>Escolha um jogo no <strong>celular</strong></h1>
            ${catalog?.themes.map(
              (theme) => html`<section key=${theme.id} class="theme">
                <h2>${theme.name}</h2>
                <ul class="games">
                  ${catalog.games.filter((game) => game.theme === theme.id).map((game) => html`<li key=${game.id}><img src=${`/games/${encodeURIComponent(game.id)}/logo.svg`} alt="" />${game.name}</li>`)}
                </ul>
              </section>`,
            )}`}
    </section>
  </div>`;
}

function App() {
  const [status, setStatus] = useState('Conectando…');
  const [room, setRoom] = useState<Room | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [seats, setSeats] = useState<number[]>([]); // who is connected now
  const [queue, setQueue] = useState<string[]>([]);
  const [state, setState] = useState<GameState | null>(null);
  const connection = useRef<Connection | null>(null);

  useEffect(() => {
    connection.current = connect<ToTv>(() => '/ws?tv', {
      onOpen: () => setStatus('Aguardando um celular…'),
      // the room dies with the connection: back to the start and wait for a new one
      onClose: () => {
        setStatus('Reconectando…');
        setRoom(null);
        setSeats([]);
        setQueue([]);
        setState(null);
      },
      onMessage: (message) => {
        if (message.type === 'room') setRoom({ name: message.name, qr: message.qr });
        else if (message.type === 'catalog') setCatalog(message.catalog);
        else if (message.type === 'players') setSeats(message.seats);
        else if (message.type === 'join_request') setQueue((ids) => [...ids, message.id]);
        else if (message.type === 'left') setQueue((ids) => ids.filter((id) => id !== message.id));
        else if (message.type === 'state') setState(message.state);
      },
    });
    return () => connection.current?.stop();
  }, []);

  // Back on the remote (Tizen 10009): leaves the game; on the menu, closes the app. Escape does the first part in a desktop browser.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tizen = (window as unknown as { tizen?: { application: { getCurrentApplication(): { exit(): void } } } }).tizen;
      const back = event.keyCode === 10009 || event.key === 'Escape';
      if (!back) return;
      if (state) connection.current?.send({ type: 'exit' });
      else if (event.keyCode === 10009 && tizen) tizen.application.getCurrentApplication().exit();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [state]);

  const View = useGameView<TvProps>('tv', state?.game, catalog);

  const answer = (type: 'accept' | 'reject'): void => {
    const [id] = queue;
    if (!id) return;
    connection.current?.send({ type, id });
    setQueue((ids) => ids.slice(1));
  };

  return html`
    ${state
      ? View
        ? html`<${GameRoot} id=${state.game}><${View} state=${state} seats=${seats} /><//>`
        : null
      : html`<${Shell} room=${room} catalog=${catalog} players=${seats.length} status=${status} />`}
    ${state && seats.length === 0 && room ? html`<${Reconnect} room=${room} />` : null}
    ${queue.length > 0 ? html`<${JoinPrompt} onAccept=${() => answer('accept')} onReject=${() => answer('reject')} />` : null}
  `;
}

render(html`<${App} />`, document.querySelector('main') as HTMLElement);
