import {
  BALANCE,
  createInitialState,
  currentLoco,
  flowPerMinute,
  machineSlots,
  needsCatchUp,
  serialize,
  simulateOffline,
  tick,
  type ActionResult,
  type GameState,
  type OfflineReport,
} from '../engine';
import { account, wasSignedIn } from '../cloud/account.svelte';
import { describeError } from './labels';
import { clearSave, loadSave, storeSave } from './persist';
import { buzz, playMilestone } from './sound';
import { stageFocus, type StageFocus } from './stage/focus';
import type { Tab } from './tabs';

const TICK = BALANCE.tickSeconds;
/** So viel Zeit holt ein einzelnes Bild höchstens auf, etwa nach einem gedrosselten Tab */
const MAX_FRAME_CATCHUP_SECONDS = 120;
const AUTOSAVE_MS = 10_000;
/** Der Rückkehr-Bildschirm steht mindestens so lange, damit die Rückkehr einen Auftritt hat */
const RETURN_ANIMATION_MS = 1400;
/** So oft schiebt ein angemeldetes Gerät seinen Stand in die Cloud */
const CLOUD_PUSH_MS = 2 * 60 * 1000;

/** Was im Zug-Bildschirm gerade ausgeklappt ist. Nichts davon überdeckt die Bühne. */
export type DetailKind = { kind: 'none' } | { kind: 'wagen'; id: number } | { kind: 'bauen' };

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
  /**
   * Nettofluss je Ware in Stück pro Minute, aus dem laufenden Zustand gerechnet.
   * Wer eine Maschine pausiert, sieht die Zahl sofort fallen, statt eine Minute
   * auf den Durchschnitt zu warten.
   */
  rates: Record<string, number> = $derived(flowPerMinute(this.state));
  toast = $state<{ text: string; id: number } | null>(null);
  detail = $state<DetailKind>({ kind: 'none' });
  /** Das Register in der Leiste unten. Die Bühne richtet ihren Ausschnitt danach. */
  tab = $state<Tab>('zug');
  /** Was die Bühne gerade zeigt: den Zug, die Lok oder einen Wagen. Folgt aus Register und Detail. */
  focus: StageFocus = $derived(stageFocus(this.tab, this.detail, this.state));
  loaded = $state(false);
  /** Läuft die Nachsimulation gerade als Bildschirm? */
  returning = $state(false);
  /** Kilometerstand, den der Rückkehr-Bildschirm gerade zeigt */
  returnKm = $state(0);
  /** Bericht der letzten Rückkehr, bis er weggeklickt wird */
  report = $state<OfflineReport | null>(null);
  /** Wanduhr des letzten Exports, 0 wenn nie exportiert */
  /** Der Meilenstein, der gerade gefeiert wird */
  milestone = $state<Milestone | null>(null);

  private timer: ReturnType<typeof setInterval> | null = null;
  private lastNow = 0;
  private accumulated = 0;
  private lastSaveAt = 0;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private milestoneTimer: ReturnType<typeof setTimeout> | null = null;
  private logSeen = 0;
  private lastCloudPush = 0;
  private booted = false;

  async boot(): Promise<void> {
    if (this.booted) return;
    this.booted = true;
    const saved = await loadSave();
    if (saved) {
      this.state = saved;
      const elapsed = elapsedSinceSave(saved, Date.now());
      if (needsCatchUp(elapsed)) await this.catchUp(elapsed);
    }
    // Was vor dem Start oder in der Abwesenheit geschah, steht im Bericht und wird nicht gefeiert
    this.logSeen = this.state.log.length;
    this.loaded = true;
    this.start();
    this.connectAccount();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          void this.save();
          if (account.signedIn) void account.push();
        }
      });
      window.addEventListener('pagehide', () => void this.save());
    }
  }

  /**
   * Verbindet den Spielstand mit dem Konto. Das Firebase-SDK lädt nur nach, wenn
   * hier schon einmal jemand angemeldet war oder es später von Hand angestossen wird.
   */
  private connectAccount(): void {
    account.getSnapshot = () => ({ json: this.snapshotJson(), state: $state.snapshot(this.state) });
    account.onAdopt = async (state) => {
      await this.adopt(state);
      this.showToast('Spielstand aus der Cloud übernommen.');
    };
    if (wasSignedIn()) void account.watch();
  }

  /** Meldet an und verbindet dabei das Konto, falls das SDK noch nicht läuft. */
  async openAccount(): Promise<void> {
    await account.watch();
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

  openTab(tab: Tab): void {
    this.tab = tab;
  }

  /**
   * Lok antippen: Die Kamera fährt an sie heran und die Strecke geht auf, denn dort
   * steht, was die Lok angeht. Ist sie schon im Bild, nennt sie ihre Daten.
   */
  tapLoco(): void {
    if (this.tab === 'strecke') {
      const loco = currentLoco(this.state);
      this.showToast(`${loco.name}: zieht ${loco.slots} Wagen, ${machineSlots(this.state)} Maschinen je Wagen, ${loco.speedKmh} km/h`);
      return;
    }
    this.tab = 'strecke';
  }

  /**
   * Wagen antippen: Auf dem Zug-Bildschirm klappt er auf und die Kamera fährt heran,
   * nochmals antippen klappt ihn zu und der ganze Zug kommt zurück. Von jedem anderen
   * Register geht es zum Zug, mit diesem Wagen aufgeklappt.
   */
  tapWagon(id: number): void {
    const offen = this.tab === 'zug' && this.detail.kind === 'wagen' && this.detail.id === id;
    this.detail = offen ? { kind: 'none' } : { kind: 'wagen', id };
    this.tab = 'zug';
  }

  /** Platzhalter antippen: Zum Zug, mit «Wagen anhängen» aufgeklappt. */
  tapSlot(): void {
    const offen = this.tab === 'zug' && this.detail.kind === 'bauen';
    this.detail = offen ? { kind: 'none' } : { kind: 'bauen' };
    this.tab = 'zug';
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
      this.catchMilestones();
    }
    const now2 = Date.now();
    if (now2 - this.lastSaveAt > AUTOSAVE_MS) void this.save();
    if (account.signedIn && now2 - this.lastCloudPush > CLOUD_PUSH_MS) {
      this.lastCloudPush = now2;
      void account.push();
    }
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

  /** Übernimmt einen eingelesenen Spielstand und startet das Spiel damit neu. */
  async adopt(state: GameState): Promise<void> {
    this.stop();
    this.state = state;
    this.accumulated = 0;
    this.detail = { kind: 'none' };
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
    this.accumulated = 0;
    this.detail = { kind: 'none' };
    this.report = null;
    this.milestone = null;
    this.logSeen = this.state.log.length;
    this.start();
    await this.save();
  }
}

export const game = new Game();
