// TV screen: shows the room name and QR, accepts controllers with OK, and delegates the game to the game module
// (ADR 0001, 0002). Preact + htm, no build (ADR 0009). UI text is Portuguese (ADR 0008).
import { html, render, useEffect, useRef, useState } from '/vendor/preact.js';
import { connect, type Connection } from './client.ts';
import type { ToTv } from '../server/protocol.ts';
import type { GameState } from '../games/types.ts';

type GameView = (props: { state: GameState }) => unknown;
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
  return html`<section class="join-prompt" role="alertdialog" aria-label="Pedido de entrada">
    <p>Um controle quer entrar. Aperte <strong>OK</strong> no controle remoto para aceitar.</p>
    <section class="actions">
      <button ref=${acceptButton} class="primary" type="button" onClick=${onAccept}>Aceitar</button>
      <button type="button" onClick=${onReject}>Recusar</button>
    </section>
  </section>`;
}

function App() {
  const [status, setStatus] = useState('Conectando…');
  const [room, setRoom] = useState<Room | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const [state, setState] = useState<GameState | null>(null);
  const [View, setView] = useState<GameView | null>(null);
  const connection = useRef<Connection | null>(null);

  useEffect(() => {
    connection.current = connect<ToTv>(() => '/ws?tv', {
      onOpen: () => setStatus('Aguardando um celular…'),
      // the room dies with the connection: back to the start and wait for a new one
      onClose: () => {
        setStatus('Reconectando…');
        setRoom(null);
        setQueue([]);
        setState(null);
      },
      onMessage: (message) => {
        if (message.type === 'room') setRoom({ name: message.name, qr: message.qr });
        else if (message.type === 'join_request') setQueue((ids) => [...ids, message.id]);
        else if (message.type === 'left') setQueue((ids) => ids.filter((id) => id !== message.id));
        else if (message.type === 'state') setState(message.state);
      },
    });
    return () => connection.current?.stop();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tizen = (window as unknown as { tizen?: { application: { getCurrentApplication(): { exit(): void } } } }).tizen;
      if (event.keyCode === 10009 && tizen) tizen.application.getCurrentApplication().exit(); // Back on Samsung
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const gameId = state?.game;
  useEffect(() => {
    if (!gameId) return setView(null);
    let current = true;
    import(`/games/${encodeURIComponent(gameId)}/tv.ts`).then(
      (module: { TvView: GameView }) => current && setView(() => module.TvView),
      () => {},
    );
    return () => {
      current = false;
    };
  }, [gameId]);

  const answer = (type: 'accept' | 'reject'): void => {
    const [id] = queue;
    if (!id) return;
    connection.current?.send({ type, id });
    setQueue((ids) => ids.slice(1));
  };

  return html`
    ${state && View
      ? html`<${View} state=${state} />`
      : html`<section class="lobby">
          <h1>Esta TV é a <strong>${room?.name ?? '…'}</strong></h1>
          <p class="hint">Abra a Ludoteca no celular para jogar.</p>
          ${room?.qr ? html`<${Qr} svg=${room.qr} />` : null}
          <p class="status" role="status">${status}</p>
        </section>`}
    ${queue.length > 0 ? html`<${JoinPrompt} onAccept=${() => answer('accept')} onReject=${() => answer('reject')} />` : null}
  `;
}

render(html`<${App} />`, document.querySelector('main') as HTMLElement);
