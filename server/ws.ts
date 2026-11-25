// Native WebSocket server: an RFC 6455 subset (ADR 0004). No dependencies.
// Supports: handshake, text frames (with fragmentation), ping/pong, close, max size, mandatory client mask and valid UTF-8.
// Rejects what it does not support (binary, extensions).
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import type { IncomingMessage, Server } from 'node:http';
import type { Socket } from 'node:net';
import type { Duplex } from 'node:stream';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const STATUS_TEXT: Record<number, string> = { 400: 'Bad Request', 403: 'Forbidden' };
const utf8 = new TextDecoder('utf-8', { fatal: true });

function frame(opcode: number, payload: Buffer): Buffer {
  const n = payload.length;
  let head: Buffer;
  if (n < 126) head = Buffer.from([0x80 | opcode, n]);
  else if (n < 65536) head = Buffer.from([0x80 | opcode, 126, n >> 8, n & 255]);
  else {
    head = Buffer.alloc(10);
    head[0] = 0x80 | opcode;
    head[1] = 127;
    head.writeBigUInt64BE(BigInt(n), 2);
  }
  return Buffer.concat([head, payload]);
}

export class Connection extends EventEmitter {
  #socket: Socket;
  #maxPayload: number;
  #buffer: Buffer = Buffer.alloc(0);
  #fragments: Buffer[] = [];
  #fragmentBytes = 0;
  #inMessage = false;
  #dead = false;
  #closed = false;
  alive = true;

  constructor(socket: Socket, maxPayload: number) {
    super();
    this.#socket = socket;
    this.#maxPayload = maxPayload;
    socket.setNoDelay(true);
    socket.on('data', (chunk: Buffer) => this.#onData(chunk));
    socket.on('close', () => {
      if (!this.#closed) {
        this.#closed = true;
        this.emit('close');
      }
    });
    socket.on('error', () => socket.destroy());
  }

  /** Starts processing bytes that arrived together with the handshake. Called after the owner attached its listeners. */
  start(head: Buffer): void {
    if (head.length) this.#onData(head);
  }

  get open(): boolean {
    return !this.#closed && !this.#socket.destroyed && this.#socket.writable;
  }

  send(text: string): void {
    if (this.open) this.#socket.write(frame(0x1, Buffer.from(String(text))));
  }

  ping(): void {
    if (this.open) this.#socket.write(frame(0x9, Buffer.alloc(0)));
  }

  close(code = 1000): void {
    if (!this.open) return;
    this.#dead = true;
    this.#socket.write(frame(0x8, Buffer.from([code >> 8, code & 255])));
    this.#socket.end();
  }

  terminate(): void {
    this.#dead = true;
    this.#socket.destroy();
  }

  #onData(chunk: Buffer): void {
    if (this.#dead) return;
    this.#buffer = this.#buffer.length ? Buffer.concat([this.#buffer, chunk]) : chunk;
    this.#parse();
  }

  #parse(): void {
    while (!this.#dead) {
      const b = this.#buffer;
      if (b.length < 2) return;
      const first = b[0] as number;
      const second = b[1] as number;
      const fin = (first & 0x80) !== 0;
      const opcode = first & 0x0f;
      let length = second & 0x7f;
      let offset = 2;
      if ((first & 0x70) !== 0 || (second & 0x80) === 0) return this.close(1002); // RSV bits, or client without mask
      if (length === 126) {
        if (b.length < 4) return;
        length = b.readUInt16BE(2);
        offset = 4;
      } else if (length === 127) {
        if (b.length < 10) return;
        const big = b.readBigUInt64BE(2);
        if (big > BigInt(this.#maxPayload)) return this.close(1009);
        length = Number(big);
        offset = 10;
      }
      if (length > this.#maxPayload) return this.close(1009);
      if (opcode >= 0x8 && (!fin || length > 125)) return this.close(1002); // control frames: no fragmentation, up to 125 bytes
      if (b.length < offset + 4 + length) return;
      const payload = Buffer.allocUnsafe(length);
      // mask: 4 bytes at b[offset..offset+3], data starts at offset+4
      for (let i = 0; i < length; i++) payload[i] = (b[offset + 4 + i] as number) ^ (b[offset + (i & 3)] as number);
      this.#buffer = b.subarray(offset + 4 + length);
      this.#onFrame(fin, opcode, payload);
    }
  }

  #onFrame(fin: boolean, opcode: number, payload: Buffer): void {
    if (opcode === 0x1 || opcode === 0x2 || opcode === 0x0) {
      if (opcode === 0x2) return this.close(1003); // binary is not supported
      if (opcode === 0x1 && this.#inMessage) return this.close(1002);
      if (opcode === 0x0 && !this.#inMessage) return this.close(1002);
      this.#inMessage = true;
      this.#fragmentBytes += payload.length;
      if (this.#fragmentBytes > this.#maxPayload) return this.close(1009);
      this.#fragments.push(payload);
      if (!fin) return;
      const whole = Buffer.concat(this.#fragments);
      this.#fragments = [];
      this.#fragmentBytes = 0;
      this.#inMessage = false;
      let text: string;
      try {
        text = utf8.decode(whole);
      } catch {
        return this.close(1007);
      }
      this.emit('message', text);
    } else if (opcode === 0x8) {
      this.close(1000);
    } else if (opcode === 0x9) {
      if (this.open) this.#socket.write(frame(0xa, payload));
    } else if (opcode === 0xa) {
      this.alive = true;
    } else {
      this.close(1002);
    }
  }
}

function reject(socket: Duplex, status: number): void {
  socket.end(`HTTP/1.1 ${status} ${STATUS_TEXT[status]}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
}

export type AttachOptions = {
  maxPayload?: number;
  /** Return false to refuse (e.g. untrusted origin). */
  verify?: (req: IncomingMessage) => boolean;
  heartbeatMs?: number;
};

/**
 * Attaches WebSocket support to an `http.Server`. `onConnection(conn, req)` receives every accepted connection.
 * Keeps connections alive with pings and drops the dead ones.
 */
export function attachWebSocket(
  server: Server,
  onConnection: (conn: Connection, req: IncomingMessage) => void,
  { maxPayload = 1024, verify = () => true, heartbeatMs = 20000 }: AttachOptions = {},
): { clients: Set<Connection> } {
  const clients = new Set<Connection>();

  server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const key = req.headers['sec-websocket-key'];
    const valid =
      req.method === 'GET' &&
      req.headers.upgrade?.toLowerCase() === 'websocket' &&
      req.headers['sec-websocket-version'] === '13' &&
      typeof key === 'string' &&
      Buffer.from(key, 'base64').length === 16;
    if (!valid) return reject(socket, 400);
    if (!verify(req)) return reject(socket, 403);

    const accept = createHash('sha1').update(key + GUID).digest('base64');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    const conn = new Connection(socket as Socket, maxPayload);
    clients.add(conn);
    conn.on('close', () => clients.delete(conn));
    onConnection(conn, req);
    conn.start(head);
  });

  const timer = setInterval(() => {
    for (const client of clients) {
      if (!client.alive) client.terminate();
      else {
        client.alive = false;
        client.ping();
      }
    }
  }, heartbeatMs);
  timer.unref();
  server.on('close', () => clearInterval(timer));
  return { clients };
}
