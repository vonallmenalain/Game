/**
 * Ton beim Meilenstein: ein kurzer Akkord aus der Web Audio API, keine Datei.
 * Standard aus, in «Mehr» einschaltbar.
 */
const KEY = 'linie-null/ton';

export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === 'an';
  } catch {
    return false;
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? 'an' : 'aus');
  } catch {
    // Privates Fenster oder gesperrter Speicher: dann eben ohne Merken
  }
}

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  context ??= new Ctor();
  if (context.state === 'suspended') void context.resume();
  return context;
}

/** Ein warmer Dur-Akkord, wie ein Signalhorn aus der Ferne. */
export function playMilestone(): void {
  if (!soundEnabled()) return;
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.22, now + 0.05);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
  master.connect(ctx.destination);
  for (const [i, freq] of [196, 294, 392, 587].entries()) {
    const osc = ctx.createOscillator();
    osc.type = i === 0 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    const voice = ctx.createGain();
    voice.gain.setValueAtTime(1 / (i + 2), now);
    osc.connect(voice).connect(master);
    osc.start(now + i * 0.06);
    osc.stop(now + 1.7);
  }
}

export function buzz(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Vibration gibt es nicht überall, das ist kein Fehler
  }
}
