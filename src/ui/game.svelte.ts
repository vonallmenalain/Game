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
import type { CloudSave } from '../cloud/sync';
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
/** So lange wartet der Start höchstens auf die Cloud, bevor er mit dem lokalen Stand weitermacht */
export const CLOUD_BOOT_WAIT_MS = 8000;

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

/** Wartet auf ein Ergebnis, aber höchstens die angegebene Zeit. Danach undefined. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(undefined);
      },
    );
  });
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Nur ein klares Nein zählt: Browser ohne Auskunft gelten als verbunden. */
function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
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
  /** Was der Start gerade tut, für den Ladebildschirm */
  bootPhase = $state<'lokal' | 'cloud'>('lokal');
  /** Läuft die Nachsimulation gerade als Bildschirm? */
  returning = $state(false);
  /** Kilometerstand, den der Rückkehr-Bildschirm gerade zeigt */
  returnKm = $state(0);
  /** Bericht der letzten Rückkehr, bis er weggeklickt wird */
  report = $state<OfflineReport | null>(null);
  /** Woher der Stand im Bericht kommt, wenn er aus der Cloud übernommen wurde */
  reportSource = $state<{ geraet: string; savedAt: number } | null>(null);
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
  /** Ob der Start einen Stand aus der Cloud übernommen hat, statt den lokalen nachzuholen */
  private adopted = false;

  /**
   * Solange die Rückfrage «Zwei Spielstände» offen ist, steht das Spiel: kein Tick, kein
   * Speichern aus dem Takt, kein Sichern. So bleibt der Stand von hier genau der, den die
   * Rückfrage zeigt, und wer ihn behält, bekommt die Wartezeit nachgeholt.
   */
  get holding(): boolean {
    return account.conflict !== null;
  }

  async boot(): Promise<void> {
    if (this.booted) return;
    this.booted = true;
    const saved = await loadSave();
    if (saved) this.state = saved;
    this.connectAccount();
    if (wasSignedIn() && isOnline()) {
      // Erst die Cloud fragen, dann die Abwesenheit nachholen. Umgekehrt holt ein
      // veralteter Stand auf und sieht danach so weit aus wie der frischere in der Cloud.
      // Wer nicht antwortet, hält den Start nicht auf; der Abgleich meldet sich später.
      this.bootPhase = 'cloud';
      await withTimeout(account.firstDecision(), CLOUD_BOOT_WAIT_MS);
      this.bootPhase = 'lokal';
    }
    if (saved && !this.adopted && !this.holding) {
      const elapsed = elapsedSinceSave(saved, Date.now());
      if (needsCatchUp(elapsed)) await this.catchUp(this.state, elapsed);
    }
    // Was vor dem Start oder in der Abwesenheit geschah, steht im Bericht und wird nicht gefeiert
    this.logSeen = this.state.log.length;
    this.loaded = true;
    if (!this.holding) this.start();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && !this.holding) {
          void this.save();
          if (account.signedIn) void account.push();
        }
      });
      window.addEventListener('pagehide', () => {
        if (!this.holding) void this.save();
      });
    }
  }

  /**
   * Verbindet den Spielstand mit dem Konto. Das Firebase-SDK lädt nur nach, wenn
   * hier schon einmal jemand angemeldet war oder es später von Hand angestossen wird.
   */
  private connectAccount(): void {
    account.getSnapshot = () => ({ json: this.snapshotJson(), state: $state.snapshot(this.state) });
    account.onAdopt = async (state, source) => {
      await this.adopt(state, source);
      if (!this.report) this.showToast('Spielstand aus der Cloud übernommen.');
    };
    account.onResume = () => this.resume();
    if (wasSignedIn()) void account.watch();
  }

  /** Meldet an und verbindet dabei das Konto, falls das SDK noch nicht läuft. */
  async openAccount(): Promise<void> {
    await account.watch();
  }

  /**
   * Holt die Abwesenheit auf einem Stand nach und übernimmt ihn. Der Kilometerzähler
   * läuft dabei hoch. Der Stand kann der laufende sein oder einer, der erst kommt.
   */
  private async catchUp(state: GameState, elapsedSeconds: number): Promise<void> {
    this.returning = true;
    this.returnKm = state.km;
    const report = simulateOffline(state, elapsedSeconds);
    this.state = state;
    account.noteCatchUp(report.simulatedSeconds);
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
    this.reportSource = null;
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
    // Der erste Stand nach dem Start ist frisch abgeglichen; die Cloud kommt im Takt dran
    this.lastCloudPush = Date.now();
    this.timer = setInterval(() => this.frame(), 100);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private frame(): void {
    const now = performance.now();
    if (this.holding) {
      // Das Spiel steht. Die Wartezeit holt nach, wer die Rückfrage beantwortet.
      this.lastNow = now;
      return;
    }
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
    const now = Date.now();
    this.lastSaveAt = now;
    // Auch im Speicher nachführen: So weiss das Spiel später, wie lange es gestanden hat
    this.state.lastSavedAt = now;
    await storeSave(serialize($state.snapshot(this.state), now));
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

  /**
   * Übernimmt einen Spielstand und startet das Spiel damit neu. Was er seit seinem
   * letzten Speichern verpasst hat, holt er vorher nach: Ein Stand vom anderen Gerät
   * war genauso lange unterwegs wie der hiesige.
   */
  async adopt(state: GameState, source: CloudSave | null = null): Promise<void> {
    this.stop();
    this.adopted = true;
    this.detail = { kind: 'none' };
    this.report = null;
    this.reportSource = source ? { geraet: source.geraet, savedAt: source.aktualisiert } : null;
    this.milestone = null;
    const elapsed = elapsedSinceSave(state, Date.now());
    if (needsCatchUp(elapsed)) {
      await this.catchUp(state, elapsed);
    } else {
      this.state = state;
      this.reportSource = null;
      await this.save();
    }
    this.accumulated = 0;
    this.logSeen = this.state.log.length;
    this.start();
  }

  /** Nach der Rückfrage geht es mit dem Stand von hier weiter, samt der Zeit, die er gestanden hat. */
  async resume(): Promise<void> {
    this.stop();
    const elapsed = elapsedSinceSave(this.state, Date.now());
    if (needsCatchUp(elapsed)) await this.catchUp(this.state, elapsed);
    this.accumulated = 0;
    this.logSeen = this.state.log.length;
    this.start();
  }

  async reset(): Promise<void> {
    this.stop();
    await clearSave();
    this.state = createInitialState();
    this.accumulated = 0;
    this.detail = { kind: 'none' };
    this.report = null;
    this.reportSource = null;
    this.milestone = null;
    this.logSeen = this.state.log.length;
    this.start();
    await this.save();
    if (account.signedIn) {
      // Die Cloud folgt dem Neuanfang, statt beim nächsten Abgleich den alten Stand zurückzubringen
      account.noteFreshStart();
      void account.push();
    }
  }
}

export const game = new Game();
