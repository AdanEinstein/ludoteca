// Sounds of "Vamos contar!" (ADR 0017, 0018). Only generated tones, no files: one soft note per number, in a major pentatonic,
// so counting sounds like a tune. Going back plays the same notes, lower. Every tenth number adds a gentle chord. Never shrill, no error sound.
const NOTES = [196.0, 220.0, 246.94, 293.66, 329.63, 392.0, 440.0, 493.88, 587.33, 659.25]; // low and soft, one per dot of the ten
const VOLUME = 0.14;

let context: AudioContext | null = null;
let unlocked = false;

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

function tone(frequency: number, at: number, duration: number, volume = VOLUME): void {
  const ctx = audio();
  if (!ctx) return;
  const start = ctx.currentTime + at;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
}

/** The note of number `n` (1..10 repeat, an octave higher on every other ten). Backwards: one octave lower and shorter. */
export function step(n: number, dir: 1 | -1): void {
  const octave = Math.floor((n - 1) / 10) % 2 ? 2 : 1;
  const note = NOTES[(n - 1) % 10] as number;
  tone(dir === 1 ? note * octave : note * octave * 0.5, 0, dir === 1 ? 0.6 : 0.4);
  if (dir === 1 && n % 10 === 0) for (const [i, f] of [261.63, 329.63, 392.0, 523.25].entries()) tone(f, 0.25 + i * 0.12, 1.0, 0.08); // a new ten
}
