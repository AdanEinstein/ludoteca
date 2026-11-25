// WebSocket connection with automatic reconnect. `path` is a function so it can change between attempts.
export type ConnectOptions<M> = {
  onOpen?: () => void;
  onMessage: (message: M) => void;
  onClose?: () => void;
};

export type Connection = {
  send(message: unknown): void;
  stop(): void;
  /** Closes the current connection without triggering the reconnect and opens another one (uses the current `path`). */
  reopen(): void;
};

export function connect<M>(path: () => string, { onOpen = () => {}, onMessage, onClose = () => {} }: ConnectOptions<M>): Connection {
  let ws: WebSocket;
  let stopped = false;

  const open = (): void => {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${protocol}://${location.host}${path()}`);
    ws.onopen = onOpen;
    ws.onmessage = (event) => {
      let message: M;
      try {
        message = JSON.parse(String(event.data)) as M;
      } catch {
        return;
      }
      onMessage(message);
    };
    ws.onclose = () => {
      onClose();
      if (!stopped) setTimeout(open, 1000);
    };
  };
  open();

  return {
    send: (message) => {
      if (ws.readyState === 1) ws.send(JSON.stringify(message));
    },
    stop: () => {
      stopped = true;
      ws.close();
    },
    reopen: () => {
      ws.onclose = null;
      ws.close();
      open();
    },
  };
}
