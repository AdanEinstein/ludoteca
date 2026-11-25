// Phone screen: finds the TV (list or QR), waits for the accept and shows the game controls (ADR 0002).
// Remembers the last TV to return on its own after a reload or sleep; if the room is gone, goes back to the list.
import { html, render, useEffect, useRef, useState } from '/vendor/preact.js';
import { connect, type Connection } from './client.ts';
import type { DenyReason, ToPad, TvListItem } from '../server/protocol.ts';
import type { Action, GameState } from '../games/types.ts';

type GameView = (props: { state: GameState; send: (action: Action) => void }) => unknown;

// UI text, Portuguese (ADR 0008)
const DENIED_TEXT: Record<Exclude<DenyReason, 'room_gone'>, string> = {
  rejected: 'A TV não aceitou este controle.',
  full: 'Esta TV já tem controles demais.',
};

const read = (key: string): string => {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
};
const write = (key: string, value: string): void => {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* no storage: the TV asks to accept again */
  }
};

const LAST_ROOM = 'ludoteca:last-room';
// The QR code takes priority over the remembered room
const initialRoom = new URLSearchParams(location.search).get('room') || read(LAST_ROOM) || null;

function App() {
  const [status, setStatus] = useState('Procurando TVs…');
  const [tvs, setTvs] = useState<TvListItem[]>([]);
  const [state, setState] = useState<GameState | null>(null);
  const [View, setView] = useState<GameView | null>(null);
  const connection = useRef<Connection | null>(null);
  const room = useRef<string | null>(initialRoom);
  const gaveUp = useRef(false);

  // Switches to a TV and reconnects (uses only refs and state setters, so it is safe to call from the effect below).
  const pick = (tv: TvListItem): void => {
    room.current = tv.id;
    setTvs([]);
    setStatus(`Conectando à TV ${tv.name}…`);
    connection.current?.reopen();
  };

  useEffect(() => {
    const denied = (reason: DenyReason): void => {
      write(`ludoteca:${room.current}`, '');
      write(LAST_ROOM, '');
      setState(null);
      if (reason === 'room_gone') {
        // the room ended (TV restarted): look for the TVs again instead of giving up
        room.current = null;
        setStatus('Procurando TVs…');
        connection.current?.reopen();
        return;
      }
      gaveUp.current = true;
      connection.current?.stop();
      setStatus(DENIED_TEXT[reason]);
    };

    connection.current = connect<ToPad>(
      () => {
        const token = room.current ? read(`ludoteca:${room.current}`) : '';
        return room.current ? `/ws?room=${encodeURIComponent(room.current)}${token ? `&token=${token}` : ''}` : '/ws?browse';
      },
      {
        onClose: () => {
          if (gaveUp.current) return;
          setState(null);
          setStatus('Reconectando…');
        },
        onMessage: (message) => {
          if (message.type === 'tvs') {
            if (message.list.length === 1 && message.list[0]) return pick(message.list[0]); // one TV: the only action is OK on it
            setTvs(message.list);
            setStatus(message.list.length ? 'Em qual TV?' : 'Nenhuma TV encontrada. Abra a Ludoteca na TV.');
          } else if (message.type === 'waiting') setStatus('Aguardando a TV aceitar…');
          else if (message.type === 'ok') {
            write(`ludoteca:${room.current}`, message.token);
            write(LAST_ROOM, room.current ?? '');
            setStatus('');
          } else if (message.type === 'state') setState(message.state);
          else if (message.type === 'denied') denied(message.reason);
        },
      },
    );
    return () => connection.current?.stop();
  }, []);

  const gameId = state?.game;
  useEffect(() => {
    if (!gameId) return setView(null);
    let current = true;
    import(`/games/${encodeURIComponent(gameId)}/pad.ts`).then(
      (module: { PadView: GameView }) => current && setView(() => module.PadView),
      () => {},
    );
    return () => {
      current = false;
    };
  }, [gameId]);

  const send = (action: Action): void => connection.current?.send({ type: 'action', action });

  return html`
    ${status ? html`<p class="status" role="status">${status}</p>` : null}
    ${state && View ? html`<${View} state=${state} send=${send} />` : null}
    ${!state
      ? html`<section class="tvs">${tvs.map((tv) => html`<button key=${tv.id} type="button" onClick=${() => pick(tv)}>${tv.name}</button>`)}</section>`
      : null}
  `;
}

render(html`<${App} />`, document.querySelector('main') as HTMLElement);
