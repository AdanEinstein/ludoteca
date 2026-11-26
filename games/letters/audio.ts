// Sounds of "Qual começa com?" (ADR 0017, 0018). Same two CC0 recordings as "Quantos tem?" (sounds/CREDITS.md):
//   count.wav     a low, soft "bong": one note when the letter shows up (and each time it is shown again), and a rising four-note
//                 arpeggio (a major chord) when the child gets it right;
//   applause.ogg  people clapping, right after the arpeggio.
// There is no "wrong" sound: a mistake only shows the letter again, so it gets the same soft note. Played on the TV only, and the
// "Som na TV" option turns it all off. If a file cannot be loaded, soft synthesized tones play instead: never silent by accident.
const FILES = {
  note: new URL('./sounds/count.wav', import.meta.url).pathname,
  applause: new URL('./sounds/applause.ogg', import.meta.url).pathname,
} as const;
type Name = keyof typeof FILES;

const PING = 4; // semitones above the recording (~230 Hz): the note of "here is the letter"
const ARPEGGIO = [0, 4, 7, 12]; // semitones: do-mi-sol-do, the "you got it" tune
const TONES = { ping: 293.66, arpeggio: [261.63, 329.63, 392.0, 523.25] }; // the same notes, for the fallback
const GAP = 0.17; // seconds between arpeggio notes
const VOLUME = { note: 0.6, applause: 0.7, synth: 0.12 };

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

/** The letter is on screen (new round, a wrong answer, "Ver a letra de novo"): one soft note. */
export function ping(): void {
  void preload().then(() => {
    if (!sample('note', 0, semitones(PING))) tone(TONES.ping, 0, 0.5);
  });
}

/** Right answer: a rising arpeggio, then applause. */
export function celebrate(): void {
  void preload().then(() => {
    ARPEGGIO.forEach((step, i) => {
      if (!sample('note', i * GAP, semitones(step))) tone(TONES.arpeggio[i] as number, i * GAP, 0.45);
    });
    const end = ARPEGGIO.length * GAP + 0.1;
    if (!sample('applause', end)) for (const frequency of TONES.arpeggio) tone(frequency, end, 1.2, 0.08);
  });
}
