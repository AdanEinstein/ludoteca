// Sounds of "Quantos tem?" (ADR 0017, 0018). Two short recordings from a public library (CC0, see sounds/CREDITS.md):
//   count.wav  one bright note, played once per piece at higher and higher pitches (a major pentatonic), so counting sounds like a tune;
//   win.ogg    a happy jingle for the right answer.
// They are decoded with the Web Audio API and played at the right moment, with no delay. If a file cannot be loaded or decoded, soft
// synthesized tones play instead, so the game is never silent by accident. There is no "wrong" sound, and "Som na TV" turns it all off.
const FILES = {
  count: new URL('./sounds/count.wav', import.meta.url).pathname,
  win: new URL('./sounds/win.ogg', import.meta.url).pathname,
} as const;
type Name = keyof typeof FILES;

// Semitones above the recording, in a major pentatonic over two octaves (any sequence sounds happy and never clashes).
const STEPS = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]; // the same notes, for the fallback
const VOLUME = { count: 0.7, win: 0.8, synth: 0.12 };

let context: AudioContext | null = null;
let unlocked = false;
const buffers = new Map<Name, AudioBuffer>();
let loading: Promise<void> | null = null;

const audio = (): AudioContext | null => {
  if (context) return context;
  const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Context ? (context = new Context()) : null;
};

/** Browsers only start audio after a gesture (a key on the remote, a tap). Listens for the first one; harmless if audio is already allowed. */
export function unlock(): void {
  if (unlocked) return;
  unlocked = true;
  const resume = (): void => void audio()?.resume();
  for (const type of ['keydown', 'pointerdown', 'touchstart'] as const) window.addEventListener(type, resume, { once: true });
  resume();
}

/** Fetches and decodes the recordings once. Never rejects: a file that fails is simply missing and the synthesized tone takes over. */
export function preload(): Promise<void> {
  const ctx = audio();
  if (!ctx) return Promise.resolve();
  loading ??= Promise.all(
    (Object.keys(FILES) as Name[]).map((name) =>
      fetch(FILES[name])
        .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(String(response.status)))))
        .then((data) => ctx.decodeAudioData(data))
        .then((buffer) => void buffers.set(name, buffer))
        .catch(() => {}),
    ),
  ).then(() => {});
  return loading;
}

function sample(name: Name, at: number, rate = 1): boolean {
  const ctx = audio();
  const buffer = buffers.get(name);
  if (!ctx || !buffer) return false;
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buffer;
  source.playbackRate.value = rate;
  gain.gain.value = VOLUME[name];
  source.connect(gain).connect(ctx.destination);
  source.start(ctx.currentTime + at);
  return true;
}

function tone(frequency: number, at: number, duration: number, volume = VOLUME.synth): void {
  const ctx = audio();
  if (!ctx) return;
  const start = ctx.currentTime + at;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'triangle'; // a little brighter than a sine
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
}

const semitones = (n: number): number => 2 ** (n / 12);

/** One note per piece, going up: the sound of counting. `step` is the time between pieces, in seconds. */
export function countTones(pieces: number, step: number): void {
  void preload().then(() => {
    for (let i = 0; i < pieces; i++) if (!sample('count', i * step, semitones(STEPS[i] ?? 21))) tone(SCALE[i] ?? 880, i * step, 0.5);
  });
}

/** Right answer: the pieces light up one by one (a little higher), then the happy jingle. */
export function celebrate(pieces: number, step: number): void {
  const spacing = step * 0.7; // same pace as the CSS animation of the pieces
  void preload().then(() => {
    for (let i = 0; i < pieces; i++) if (!sample('count', i * spacing, semitones((STEPS[i] ?? 21) + 7))) tone(SCALE[i + 1] ?? 880, i * spacing, 0.45);
    const end = pieces * spacing + 0.1;
    if (!sample('win', end)) for (const frequency of [523.25, 659.25, 783.99, 1046.5]) tone(frequency, end + (frequency > 800 ? 0.15 : 0), 1.2, 0.09);
  });
}

export const SCALE_LENGTH = SCALE.length;
