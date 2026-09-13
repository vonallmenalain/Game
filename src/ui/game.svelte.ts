import {
  BALANCE,
  createInitialState,
  needsCatchUp,
  serialize,
  simulateOffline,
  tick,
  type ActionResult,
  type GameState,
  type OfflineReport,
} from '../engine';
import { describeError } from './labels';
import { clearSave, lastExportAt, loadSave, noteExport, storeSave } from './persist';
import { buzz, playMilestone } from './sound';
import { exportFileName, exportSave } from './transfer';

const TICK = BALANCE.tickSeconds;
/** So viel Zeit holt ein einzelnes Bild höchstens auf, etwa nach einem gedrosselten Tab */
const MAX_FRAME_CATCHUP_SECONDS = 120;
const RATE_WINDOW_SECONDS = 60;
const AUTOSAVE_MS = 10_000;
/** Der Rückkehr-Bildschirm steht mindestens so lange, damit die Rückkehr einen Auftritt hat */
const RETURN_ANIMATION_MS = 1400;
/** Nach so langer Zeit ohne Export erinnert der Bildschirm «Mehr» daran */
export const EXPORT_REMINDER_MS = 7 * 24 * 3600 * 1000;

interface RateSample {
  t: number;
  produced: Record<string, number>;
  consumed: Record<string, number>;
}

export type SheetKind = { kind: 'none' } | { kind: 'wagen'; id: number } | { kind: 'bauen' } | { kind: 'werkstatt' };

/** Ein Meilenstein, der gerade gefeiert wird. */
export interface Milestone {
  kind: 'projekt' | 'lok' | 'biom';
  ref: string;
  /** Wanduhr beim Auslösen, dient auch als Schlüssel für die Animation */
  at: number;
}

/** So lange steht der Meilenstein-Hinweis, inklusive der wachsenden Bauwerke */
export const MILESTONE_MS = 6000;

/** Sekunden seit dem letzten Speichern, aus Sicht der Wanduhr. */
export function elapsedSinceSave(state: GameState, now: number): number {
  if (!state.lastSavedAt) return 0;
  return Math.max(0, (now - state.lastSavedAt) / 1000);
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

class Game {
  state = $state<GameState>(createInitialState());
  /** Nettorate je Ware in Stück pro Minute über die letzte Minute */
  rates = $state<Record<string, number>>({});
  toast = $state<{ text: string; id: number } | null>(null);
  sheet = $state<SheetKind>({ kind: 'none' });
  loaded = $state(false);
  /** Läuft die Nachsimulation gerade als Bildschirm? */
  returning = $state(false);
  /** Kilometerstand, den der Rückkehr-Bildschirm gerade zeigt */
  returnKm = $state(0);
  /** Bericht der letzten Rückkehr, bis er weggeklickt wird */
  report = $state<OfflineReport | null>(null);
  /** Wanduhr des letzten Exports, 0 wenn nie exportiert */
  exportedAt = $state(0);
  /** Der Meilenstein, der gerade gefeiert wird */
  milestone = $state<Milestone | null>(null);

  private timer: ReturnType<typeof setInterval> | null = null;
  private lastNow = 0;
  private accumulated = 0;
  private samples: RateSample[] = [];
  private lastSampleAt = -1;
  private lastSaveAt = 0;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private milestoneTimer: ReturnType<typeof setTimeout> | null = null;
  private logSeen = 0;
  private booted = false;

  get exportOverdue(): boolean {
    return this.loaded && this.state.playedSeconds > 600 && Date.now() - (this.exportedAt || 0) > EXPORT_REMINDER_MS;
  }

  async boot(): Promise<void> {
    if (this.booted) return;
    this.booted = true;
    const saved = await loadSave();
    this.exportedAt = await lastExportAt();
    if (saved) {
      this.state = saved;
      const elapsed = elapsedSinceSave(saved, Date.now());
      if (needsCatchUp(elapsed)) await this.catchUp(elapsed);
    }
    // Was vor dem Start oder in der Abwesenheit geschah, steht im Bericht und wird nicht gefeiert
    this.logSeen = this.state.log.length;
    this.loaded = true;
    this.start();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') void this.save();
      });
      window.addEventListener('pagehide', () => void this.save());
    }
  }

  /** Holt die Abwesenheit nach und lässt den Kilometerzähler dabei hochlaufen. */
  private async catchUp(elapsedSeconds: number): Promise<void> {
    this.returning = true;
    this.returnKm = this.state.km;
    const report = simulateOffline(this.state, elapsedSeconds);
    await this.runReturnAnimation(report.kmBefore, report.kmAfter);
    this.returning = false;
    this.report = report;
    await this.save();
  }

  private runReturnAnimation(from: number, to: number): Promise<void> {
    if (typeof requestAnimationFrame !== 'function' || prefersReducedMotion()) {
      this.returnKm = to;
      return new Promise((resolve) => setTimeout(resolve, 900));
    }
    return new Promise((resolve) => {
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / RETURN_ANIMATION_MS);
        // Weich auslaufend, damit der Zähler am Ende zur Ruhe kommt
        this.returnKm = from + (to - from) * (1 - (1 - t) ** 3);
        if (t < 1) requestAnimationFrame(step);
        else {
          this.returnKm = to;
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

  dismissReport(): void {
    this.report = null;
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
    this.accumulated += Math.min(MAX_FRAME_CATCHUP_SECONDS, (now - this.lastNow) / 1000);
    this.lastNow = now;
    let steps = 0;
    const maxSteps = (MAX_FRAME_CATCHUP_SECONDS / TICK) | 0;
    while (this.accumulated >= TICK && steps < maxSteps) {
      tick(this.state, TICK);
      this.accumulated -= TICK;
      steps += 1;
    }
    if (steps > 0) {
      this.sampleRates();
      this.catchMilestones();
    }
    if (Date.now() - this.lastSaveAt > AUTOSAVE_MS) void this.save();
  }

  /**
   * Sucht in den neuen Fahrtenbuch-Einträgen nach etwas, das einen Auftritt verdient.
   * Ein fertiges Bauprojekt schlägt eine neue Lok, die ein neues Biom.
   */
  private catchMilestones(): void {
    if (this.logSeen >= this.state.log.length) return;
    const fresh = this.state.log.slice(this.logSeen);
    this.logSeen = this.state.log.length;
    const pick =
      fresh.find((e) => e.kind === 'projekt') ?? fresh.find((e) => e.kind === 'lok') ?? fresh.find((e) => e.kind === 'biom');
    if (!pick) return;
    this.milestone = { kind: pick.kind as Milestone['kind'], ref: pick.ref, at: Date.now() };
    if (pick.kind === 'projekt' || pick.kind === 'lok') {
      playMilestone();
      buzz([90, 60, 140]);
    } else {
      buzz(40);
    }
    if (this.milestoneTimer) clearTimeout(this.milestoneTimer);
    this.milestoneTimer = setTimeout(() => {
      this.milestone = null;
    }, MILESTONE_MS);
    void this.save();
  }

  dismissMilestone(): void {
    if (this.milestoneTimer) clearTimeout(this.milestoneTimer);
    this.milestone = null;
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

  private snapshotJson(): string {
    return serialize($state.snapshot(this.state), Date.now());
  }

  async save(): Promise<void> {
    this.lastSaveAt = Date.now();
    await storeSave(this.snapshotJson());
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

  async exportToFile(): Promise<void> {
    const snapshot = $state.snapshot(this.state);
    try {
      const how = await exportSave(this.snapshotJson(), exportFileName(snapshot));
      const at = Date.now();
      this.exportedAt = at;
      await noteExport(at);
      this.showToast(how === 'geteilt' ? 'Spielstand geteilt.' : 'Spielstand als Datei gespeichert.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.warn('Export ging nicht', error);
      this.showToast('Der Export ging nicht. Versuche es noch einmal.');
    }
  }

  /** Übernimmt einen eingelesenen Spielstand und startet das Spiel damit neu. */
  async adopt(state: GameState): Promise<void> {
    this.stop();
    this.state = state;
    this.samples = [];
    this.rates = {};
    this.lastSampleAt = -1;
    this.accumulated = 0;
    this.sheet = { kind: 'none' };
    this.report = null;
    this.milestone = null;
    this.logSeen = state.log.length;
    await this.save();
    this.start();
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
    this.report = null;
    this.milestone = null;
    this.logSeen = this.state.log.length;
    this.start();
    await this.save();
  }
}

export const game = new Game();
