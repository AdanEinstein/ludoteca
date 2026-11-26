// Sounds of "Quantos tem?", made with the Web Audio API: no files, no network (ADR 0017).
// Soft sine tones on a pentatonic scale, so any sequence sounds pleasant. There is no "wrong" sound: a mistake only makes the TV
// count again. The master volume is low and the whole thing is switched off by the "Som na TV" option.
const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0]; // C major pentatonic, two octaves
const VOLUME = 0.12;

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
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.03); // soft attack, no click
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
}

/** One note per piece, going up: the sound of counting. `step` is the time between pieces, in seconds. */
export function countTones(pieces: number, step: number): void {
  for (let i = 0; i < pieces; i++) tone(SCALE[i] ?? 880, i * step, 0.5);
}

/** Right answer: the pieces light up one by one (a little higher), then a soft major chord. */
export function celebrate(pieces: number, step: number): void {
  const spacing = step * 0.7; // same pace as the CSS animation of the pieces
  for (let i = 0; i < pieces; i++) tone(SCALE[i + 1] ?? 880, i * spacing, 0.45);
  const end = pieces * spacing + 0.1;
  for (const frequency of [523.25, 659.25, 783.99]) tone(frequency, end, 1.4, 0.08);
}

export const SCALE_LENGTH = SCALE.length;
