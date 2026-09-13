import { BALANCE, createInitialState, serialize, tick, type ActionResult, type GameState } from '../engine';
import { describeError } from './labels';
import { clearSave, loadSave, storeSave } from './persist';

const TICK = BALANCE.tickSeconds;
/** Höchstens so viele Sekunden werden in einem Bild nachgeholt, den Rest übernimmt Phase 3 */
const MAX_CATCHUP_SECONDS = 120;
const RATE_WINDOW_SECONDS = 60;
const AUTOSAVE_MS = 10_000;

interface RateSample {
  t: number;
  produced: Record<string, number>;
  consumed: Record<string, number>;
}

export type SheetKind = { kind: 'none' } | { kind: 'wagen'; id: number } | { kind: 'bauen' } | { kind: 'werkstatt' };

class Game {
  state = $state<GameState>(createInitialState());
  /** Nettorate je Ware in Stück pro Minute über die letzte Minute */
  rates = $state<Record<string, number>>({});
  toast = $state<{ text: string; id: number } | null>(null);
  sheet = $state<SheetKind>({ kind: 'none' });
  loaded = $state(false);

  private timer: ReturnType<typeof setInterval> | null = null;
  private lastNow = 0;
  private accumulated = 0;
  private samples: RateSample[] = [];
  private lastSampleAt = -1;
  private lastSaveAt = 0;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  async boot(): Promise<void> {
    const saved = await loadSave();
    if (saved) this.state = saved;
    this.loaded = true;
    this.start();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') void this.save();
      });
      window.addEventListener('pagehide', () => void this.save());
    }
  }

  start(): void {
    if (this.timer) return;
    this.lastNow = performance.now();
    this.timer = setInterval(() => this.frame(), 100);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private frame(): void {
    const now = performance.now();
    this.accumulated += Math.min(MAX_CATCHUP_SECONDS, (now - this.lastNow) / 1000);
    this.lastNow = now;
    let steps = 0;
    const maxSteps = (MAX_CATCHUP_SECONDS / TICK) | 0;
    while (this.accumulated >= TICK && steps < maxSteps) {
      tick(this.state, TICK);
      this.accumulated -= TICK;
      steps += 1;
    }
    if (steps > 0) this.sampleRates();
    if (Date.now() - this.lastSaveAt > AUTOSAVE_MS) void this.save();
  }

  private sampleRates(): void {
    const t = this.state.playedSeconds;
    if (t - this.lastSampleAt < 1) return;
    this.lastSampleAt = t;
    this.samples.push({ t, produced: { ...this.state.stats.produced }, consumed: { ...this.state.stats.consumed } });
    while (this.samples.length > 1 && t - this.samples[0]!.t > RATE_WINDOW_SECONDS) this.samples.shift();
    const first = this.samples[0]!;
    const span = t - first.t;
    if (span < 5) return;
    const rates: Record<string, number> = {};
    const items = new Set([...Object.keys(this.state.stats.produced), ...Object.keys(this.state.stats.consumed)]);
    for (const item of items) {
      const produced = (this.state.stats.produced[item] ?? 0) - (first.produced[item] ?? 0);
      const consumed = (this.state.stats.consumed[item] ?? 0) - (first.consumed[item] ?? 0);
      rates[item] = ((produced - consumed) / span) * 60;
    }
    this.rates = rates;
  }

  async save(): Promise<void> {
    this.lastSaveAt = Date.now();
    await storeSave(serialize($state.snapshot(this.state), this.lastSaveAt));
  }

  /** Führt eine Aktion aus und zeigt bei Misserfolg den Grund. */
  run(result: ActionResult): boolean {
    if (!result.ok) this.showToast(describeError(result));
    return result.ok;
  }

  showToast(text: string): void {
    this.toast = { text, id: Date.now() };
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast = null;
    }, 3500);
  }

  async reset(): Promise<void> {
    this.stop();
    await clearSave();
    this.state = createInitialState();
    this.samples = [];
    this.rates = {};
    this.lastSampleAt = -1;
    this.accumulated = 0;
    this.sheet = { kind: 'none' };
    this.start();
    await this.save();
  }
}

export const game = new Game();
