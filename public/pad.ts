// Phone screen: finds the TV (list or QR), waits for the accept, shows the menu and then the game controls (ADR 0002, 0012).
// Remembers the last TV to return on its own after a reload or sleep; if the room is gone, goes back to the list.
import { html, render, useEffect, useRef, useState } from '/vendor/preact.js';
import { connect, type Connection } from './client.ts';
import { GameRoot, useGameView } from './game-host.ts';
import { Logo } from './logo.ts';
import { Menu } from './pad-menu.ts';
import { read, write } from './storage.ts';
import type { Catalog, DenyReason, NoticeReason, ToPad, TvListItem } from '../server/protocol.ts';
import type { Action, GameState, OptionValue } from '../games/types.ts';

type PadViewProps = { state: GameState; send: (action: Action) => void };
// Chrome's install prompt event (not in the DOM typings). Only fires on a secure origin (ADR 0014).
type InstallPrompt = Event & { prompt(): Promise<void> };

// UI text, Portuguese (ADR 0008)
const DENIED_TEXT: Record<Exclude<DenyReason, 'room_gone'>, string> = {
  rejected: 'A TV não aceitou este controle.',
  full: 'Esta TV já tem controles demais.',
};

const LAST_ROOM = 'ludoteca:last-room';
// The QR code takes priority over the remembered room
const initialRoom = new URLSearchParams(location.search).get('room') || read(LAST_ROOM) || null;

/** Leaving a game takes two presses (a child tapping at random does not end it): the first one arms the button for 3 seconds. */
function ExitButton({ onExit }: { onExit: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(timer);
  }, [armed]);
  return html`<div class="overlay exit-bar">
    <button type="button" onClick=${() => (armed ? onExit() : setArmed(true))}>${armed ? 'Sair do jogo?' : 'Menu'}</button>
  </div>`;
}

function App() {
  const [status, setStatus] = useState('Procurando TVs…');
  const [tvs, setTvs] = useState<TvListItem[]>([]);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [notice, setNotice] = useState<NoticeReason | null>(null);
  const [tvName, setTvName] = useState('');
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [state, setState] = useState<GameState | null>(null);
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
      setCatalog(null);
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
          setCatalog(null);
          setTvName('');
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
            setTvName(message.name);
            setStatus('');
          } else if (message.type === 'catalog') setCatalog(message.catalog);
          else if (message.type === 'notice') setNotice(message.reason);
          else if (message.type === 'state') {
            setNotice(null);
            setState(message.state);
          } else if (message.type === 'denied') denied(message.reason);
        },
      },
    );
    return () => connection.current?.stop();
  }, []);

  const View = useGameView<PadViewProps>('pad', state?.game, catalog);

  // PWA (ADR 0014): service worker (secure origins only), install prompt, and the screen stays on while a game runs.
  useEffect(() => {
    navigator.serviceWorker?.register('/sw.ts', { scope: '/pad' }).catch(() => {});
    const onPrompt = (event: Event): void => {
      event.preventDefault(); // we show our own button
      setInstall(event as InstallPrompt);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', () => setInstall(null));
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);
  const playing = Boolean(state);
  useEffect(() => {
    if (!playing || !navigator.wakeLock) return;
    let lock: WakeLockSentinel | null = null;
    const hold = (): void => void navigator.wakeLock.request('screen').then((l) => (lock = l), () => {});
    const again = (): void => {
      if (document.visibilityState === 'visible') hold(); // the lock is lost when the tab is hidden
    };
    hold();
    document.addEventListener('visibilitychange', again);
    return () => {
      document.removeEventListener('visibilitychange', again);
      void lock?.release();
    };
  }, [playing]);

  const send = (action: Action): void => connection.current?.send({ type: 'action', action });
  const start = (game: string, config: Record<string, OptionValue>): void => connection.current?.send({ type: 'start', game, config });
  const exit = (): void => connection.current?.send({ type: 'exit' });

  if (state) {
    return html`${View ? html`<${GameRoot} id=${state.game}><${View} state=${state} send=${send} /><//>` : null}
      <${ExitButton} onExit=${exit} />`;
  }
  return html`<div class="shell">
    <header class="bar">
      <${Logo} animate=${true} />
      ${install ? html`<button class="install" type="button" onClick=${() => void install.prompt()}>Instalar</button>` : null}
    </header>
    <section class="screen">
      ${tvName ? html`<p class="connected" role="status">Conectado à TV <strong>${tvName}</strong></p>` : null}
      ${status ? html`<p class="status" role="status">${status}</p>` : null}
      <section class="tvs">${tvs.map((tv) => html`<button key=${tv.id} type="button" onClick=${() => pick(tv)}>${tv.name}</button>`)}</section>
      ${catalog ? html`<${Menu} catalog=${catalog} notice=${notice} onStart=${start} />` : null}
    </section>
  </div>`;
}

render(html`<${App} />`, document.querySelector('main') as HTMLElement);
