import { deserialize, type GameState } from '../engine';
import { SAVE_COLLECTION } from './config';
import { describeAuthError, loadFirebase } from './firebase';
import { buildCloudSave, decideSync, type CloudSave, type SaveSummary, type SyncDecision, type SyncMark } from './sync';

/** Merkt, dass jemand angemeldet war, damit das SDK beim Start gleich mitlädt. */
const HINT_KEY = 'loco/konto';
const LEGACY_HINT_KEY = 'linie-null/konto';
/** Der Merkzettel zum letzten Abgleich, siehe SyncMark. Einer je Gerät, gebunden ans Konto. */
const MARK_KEY = 'loco/abgleich';

export type AccountStatus = 'abgemeldet' | 'laedt' | 'angemeldet';
export type SyncStatus = 'ruht' | 'laeuft' | 'fehler' | 'fertig';

/** Die Rückfrage «Zwei Spielstände», mit beiden Seiten und der Empfehlung. */
export interface Conflict {
  lokal: SaveSummary;
  cloud: SaveSummary;
  empfehlung: 'lokal' | 'cloud';
}

interface StoredMark extends SyncMark {
  uid: string;
}

function rememberSignedIn(on: boolean): void {
  try {
    if (on) localStorage.setItem(HINT_KEY, 'ja');
    else localStorage.removeItem(HINT_KEY);
    localStorage.removeItem(LEGACY_HINT_KEY);
  } catch {
    // Gesperrter Speicher: dann lädt das SDK eben erst beim Antippen
  }
}

export function wasSignedIn(): boolean {
  try {
    return localStorage.getItem(HINT_KEY) === 'ja' || localStorage.getItem(LEGACY_HINT_KEY) === 'ja';
  } catch {
    return false;
  }
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function loadStoredMark(): StoredMark | null {
  try {
    const raw = localStorage.getItem(MARK_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const p = parsed as Record<string, unknown>;
    if (typeof p['uid'] !== 'string') return null;
    return {
      uid: p['uid'],
      stamp: num(p['stamp']),
      playedSeconds: num(p['playedSeconds']) ?? 0,
      catchUpSeconds: num(p['catchUpSeconds']) ?? 0,
    };
  } catch {
    return null;
  }
}

function storeMark(mark: StoredMark | null): void {
  try {
    if (mark) localStorage.setItem(MARK_KEY, JSON.stringify(mark));
    else localStorage.removeItem(MARK_KEY);
  } catch {
    // Ohne Speicher gibt es keinen Merkzettel: Dann fragt der Abgleich im Zweifel nach
  }
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

export class Account {
  status = $state<AccountStatus>('abgemeldet');
  name = $state<string | null>(null);
  email = $state<string | null>(null);
  uid = $state<string | null>(null);
  sync = $state<SyncStatus>('ruht');
  /** Wanduhr des letzten erfolgreichen Abgleichs */
  syncedAt = $state(0);
  error = $state<string | null>(null);
  /** Offene Rückfrage. Solange sie steht, tickt das Spiel nicht und nichts wird geschrieben. */
  conflict = $state<Conflict | null>(null);

  /** Übernimmt einen Stand aus der Cloud, samt Nachholen seiner Abwesenheit. */
  onAdopt: ((state: GameState, source: CloudSave) => Promise<void>) | null = null;
  /** Lässt das Spiel nach einer Rückfrage mit dem Stand von hier weiterlaufen. */
  onResume: (() => Promise<void>) | null = null;
  /** Liefert den aktuellen Spielstand als JSON, für das Hochladen und den Vergleich. */
  getSnapshot: (() => { json: string; state: GameState }) | null = null;

  private watching = false;
  private pendingCloud: CloudSave | null = null;
  /** Worauf der lokale Stand aufbaut, geladen fürs angemeldete Konto */
  private mark: SyncMark | null = null;
  /**
   * Freigabe zum Schreiben: der Stempel, den die Cloud beim Schreiben noch tragen muss
   * (null: sie muss leer sein). undefined heisst: erst vergleichen, dann schreiben.
   */
  private expected: number | null | undefined = undefined;
  private reconciling: Promise<SyncDecision> | null = null;
  private pushing: Promise<boolean> | null = null;
  private firstOutcome = deferred<SyncDecision | null>();

  get signedIn(): boolean {
    return this.status === 'angemeldet';
  }

  /**
   * Der erste Abgleich nach dem Start. Der Spielstore wartet darauf, bevor er die
   * Abwesenheit nachholt: Sonst holt ein veralteter Stand auf und sieht danach so weit
   * aus wie der frischere in der Cloud. null, wenn niemand angemeldet ist.
   */
  firstDecision(): Promise<SyncDecision | null> {
    return this.firstOutcome.promise;
  }

  /** Hört auf An- und Abmeldungen. Lädt das SDK, ohne das Spiel zu blockieren. */
  async watch(): Promise<void> {
    if (this.watching) return;
    this.watching = true;
    this.status = 'laedt';
    try {
      const { auth, api } = await loadFirebase();
      api.onAuthStateChanged(auth, (user) => {
        if (user) {
          this.uid = user.uid;
          this.name = user.displayName ?? user.email ?? 'Angemeldet';
          this.email = user.email;
          this.status = 'angemeldet';
          rememberSignedIn(true);
          const stored = loadStoredMark();
          this.mark = stored && stored.uid === user.uid ? { stamp: stored.stamp, playedSeconds: stored.playedSeconds, catchUpSeconds: stored.catchUpSeconds } : null;
          this.expected = undefined;
          void this.reconcile().then((decision) => this.firstOutcome.resolve(decision));
        } else {
          const hadConflict = this.conflict !== null;
          this.uid = null;
          this.name = null;
          this.email = null;
          this.status = 'abgemeldet';
          this.sync = 'ruht';
          this.mark = null;
          this.expected = undefined;
          this.conflict = null;
          this.pendingCloud = null;
          rememberSignedIn(false);
          this.firstOutcome.resolve(null);
          if (hadConflict) void this.onResume?.();
        }
      });
    } catch (error) {
      this.watching = false;
      this.status = 'abgemeldet';
      this.error = describeAuthError(error);
      this.firstOutcome.resolve(null);
    }
  }

  private async run<T>(action: () => Promise<T>): Promise<T | null> {
    this.error = null;
    try {
      return await action();
    } catch (error) {
      this.error = describeAuthError(error);
      console.warn('Konto-Aktion fehlgeschlagen', error);
      return null;
    }
  }

  async signInWithEmail(email: string, password: string): Promise<boolean> {
    const result = await this.run(async () => {
      const { auth, api } = await loadFirebase();
      await api.signInWithEmailAndPassword(auth, email.trim(), password);
      return true;
    });
    return result === true;
  }

  async registerWithEmail(email: string, password: string): Promise<boolean> {
    const result = await this.run(async () => {
      const { auth, api } = await loadFirebase();
      await api.createUserWithEmailAndPassword(auth, email.trim(), password);
      return true;
    });
    return result === true;
  }

  async signInWithGoogle(): Promise<boolean> {
    const result = await this.run(async () => {
      const { auth, api } = await loadFirebase();
      await api.signInWithPopup(auth, new api.GoogleAuthProvider());
      return true;
    });
    return result === true;
  }

  async resetPassword(email: string): Promise<boolean> {
    const result = await this.run(async () => {
      const { auth, api } = await loadFirebase();
      await api.sendPasswordResetEmail(auth, email.trim());
      return true;
    });
    return result === true;
  }

  async signOut(): Promise<void> {
    await this.run(async () => {
      const { auth, api } = await loadFirebase();
      await api.signOut(auth);
    });
  }

  private setMark(mark: SyncMark | null): void {
    this.mark = mark;
    storeMark(mark && this.uid ? { uid: this.uid, ...mark } : null);
  }

  /**
   * Die Nachsimulation hat dem lokalen Stand Spielzeit gegeben. Sie zählt beim Abgleich
   * nicht als Spielen: Auch ein anderer Stand bekäme sie für dieselbe Abwesenheit.
   * Geht direkt in den gespeicherten Merkzettel, denn beim Start läuft sie manchmal,
   * bevor das Konto geladen ist.
   */
  noteCatchUp(seconds: number): void {
    if (!(seconds > 0)) return;
    const stored = loadStoredMark();
    if (!stored) return;
    stored.catchUpSeconds += seconds;
    storeMark(stored);
    if (this.mark && this.uid === stored.uid) this.mark = { ...this.mark, catchUpSeconds: stored.catchUpSeconds };
  }

  /**
   * «Neu anfangen»: Der Stand auf diesem Gerät fängt von vorn an, die Abstammung bleibt.
   * So folgt die Cloud beim nächsten Sichern, statt beim nächsten Abgleich den alten
   * Stand zurückzubringen.
   */
  noteFreshStart(): void {
    const stored = loadStoredMark();
    if (stored) storeMark({ ...stored, playedSeconds: 0, catchUpSeconds: 0 });
    if (this.mark) this.mark = { ...this.mark, playedSeconds: 0, catchUpSeconds: 0 };
  }

  private async fetchCloud(): Promise<CloudSave | null> {
    const { db, api } = await loadFirebase();
    if (!this.uid) return null;
    const snap = await api.getDoc(api.doc(db, SAVE_COLLECTION, this.uid));
    if (!snap.exists()) return null;
    const data = snap.data() as Partial<CloudSave>;
    if (typeof data.json !== 'string') return null;
    return {
      json: data.json,
      playedSeconds: typeof data.playedSeconds === 'number' ? data.playedSeconds : 0,
      km: typeof data.km === 'number' ? data.km : 0,
      version: typeof data.version === 'number' ? data.version : 1,
      aktualisiert: typeof data.aktualisiert === 'number' ? data.aktualisiert : 0,
      geraet: typeof data.geraet === 'string' ? data.geraet : 'unbekannt',
    };
  }

  /** Vergleicht beide Seiten und handelt danach. Läuft nie doppelt. */
  async reconcile(): Promise<SyncDecision> {
    if (!this.uid || !this.getSnapshot || this.conflict) return { kind: 'nichts' };
    if (this.reconciling) return this.reconciling;
    this.reconciling = this.compare().finally(() => {
      this.reconciling = null;
    });
    return this.reconciling;
  }

  private async compare(): Promise<SyncDecision> {
    this.sync = 'laeuft';
    try {
      const cloud = await this.fetchCloud();
      if (!this.getSnapshot) return { kind: 'nichts' };
      const { state } = this.getSnapshot();
      const decision = decideSync(state, cloud, this.mark);
      switch (decision.kind) {
        case 'fragen':
          this.pendingCloud = cloud;
          this.expected = undefined;
          this.conflict = { lokal: decision.lokal, cloud: decision.cloud, empfehlung: decision.empfehlung };
          this.sync = 'ruht';
          break;
        case 'herunterladen':
          if (cloud) await this.adopt(cloud);
          break;
        case 'hochladen':
          this.expected = cloud?.aktualisiert ?? null;
          await this.write();
          break;
        default:
          this.expected = cloud?.aktualisiert ?? null;
          this.sync = 'fertig';
      }
      return decision;
    } catch (error) {
      this.sync = 'fehler';
      this.error = describeAuthError(error);
      console.warn('Abgleich fehlgeschlagen', error);
      return { kind: 'nichts' };
    }
  }

  private async adopt(cloud: CloudSave): Promise<void> {
    if (!this.onAdopt || !this.getSnapshot) return;
    this.conflict = null;
    this.pendingCloud = null;
    this.sync = 'laeuft';
    await this.onAdopt(deserialize(cloud.json), cloud);
    // Nach dem Nachholen: Was jetzt hier liegt, baut auf genau diesem Cloud-Dokument auf
    const { state } = this.getSnapshot();
    this.setMark({ stamp: cloud.aktualisiert, playedSeconds: state.playedSeconds, catchUpSeconds: 0 });
    this.expected = cloud.aktualisiert;
    this.sync = 'fertig';
    this.syncedAt = Date.now();
  }

  /** Antwort auf die Rückfrage: den Stand aus der Cloud übernehmen. */
  async resolveWithCloud(): Promise<void> {
    const cloud = this.pendingCloud;
    this.conflict = null;
    this.pendingCloud = null;
    if (!cloud) {
      await this.onResume?.();
      return;
    }
    try {
      await this.adopt(cloud);
    } catch (error) {
      this.sync = 'fehler';
      this.error = describeAuthError(error);
      await this.onResume?.();
    }
  }

  /** Antwort auf die Rückfrage: den Stand vom Gerät behalten und über den in der Cloud schreiben. */
  async resolveWithLocal(): Promise<void> {
    const cloud = this.pendingCloud;
    this.conflict = null;
    this.pendingCloud = null;
    // Überschrieben wird genau der Stand, den die Rückfrage gezeigt hat. Kam seither ein
    // anderer dazu, lehnt das Schreiben ab und der Abgleich fragt noch einmal.
    this.expected = cloud?.aktualisiert ?? null;
    await this.onResume?.();
    if ((await this.write()) === 'fremd') await this.reconcile();
  }

  /**
   * Sichert den aktuellen Spielstand. Ohne Freigabe wird zuerst verglichen; der Abgleich
   * lädt dann selbst hoch, wenn das dran ist, oder stellt die Rückfrage. Läuft nie doppelt:
   * Der Takt und der Wechsel in den Hintergrund fallen gern zusammen.
   */
  async push(): Promise<boolean> {
    if (this.pushing) return this.pushing;
    this.pushing = this.pushOnce().finally(() => {
      this.pushing = null;
    });
    return this.pushing;
  }

  private async pushOnce(): Promise<boolean> {
    if (!this.uid || !this.getSnapshot || this.conflict) return false;
    if (this.expected === undefined) {
      const decision = await this.reconcile();
      return decision.kind === 'hochladen' && this.sync === 'fertig';
    }
    const result = await this.write();
    if (result === 'fremd') await this.reconcile();
    return result === 'ok';
  }

  /**
   * Schreibt den Stand, aber nur, wenn die Cloud noch das trägt, was dieses Gerät zuletzt
   * gesehen hat. Sonst hat inzwischen ein anderes Gerät geschrieben, und dessen Stand
   * darf nicht ungesehen verloren gehen: Die Freigabe fällt, der Abgleich entscheidet neu.
   */
  private async write(): Promise<'ok' | 'fremd' | 'fehler'> {
    if (!this.uid || !this.getSnapshot || this.expected === undefined) return 'fehler';
    this.sync = 'laeuft';
    try {
      const { db, api } = await loadFirebase();
      const { json, state } = this.getSnapshot();
      const dokument = buildCloudSave(json, state);
      const ref = api.doc(db, SAVE_COLLECTION, this.uid);
      const expected = this.expected;
      const written = await api.runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        const stamp: unknown = snap.exists() ? snap.data()?.['aktualisiert'] : null;
        if ((typeof stamp === 'number' ? stamp : null) !== expected) return false;
        tx.set(ref, { ...dokument });
        return true;
      });
      if (!written) {
        this.expected = undefined;
        this.sync = 'ruht';
        return 'fremd';
      }
      this.setMark({ stamp: dokument.aktualisiert, playedSeconds: dokument.playedSeconds, catchUpSeconds: 0 });
      this.expected = dokument.aktualisiert;
      this.sync = 'fertig';
      this.syncedAt = Date.now();
      return 'ok';
    } catch (error) {
      this.sync = 'fehler';
      this.error = describeAuthError(error);
      console.warn('Hochladen fehlgeschlagen', error);
      return 'fehler';
    }
  }

  /** Holt den Stand aus der Cloud, ausdrücklich und ohne Vergleich. */
  async pull(): Promise<boolean> {
    if (!this.uid) return false;
    this.sync = 'laeuft';
    try {
      const cloud = await this.fetchCloud();
      if (!cloud) {
        this.sync = 'ruht';
        this.error = 'In der Cloud liegt noch kein Spielstand.';
        return false;
      }
      await this.adopt(cloud);
      return true;
    } catch (error) {
      this.sync = 'fehler';
      this.error = describeAuthError(error);
      return false;
    }
  }

  async deleteCloudSave(): Promise<boolean> {
    if (!this.uid) return false;
    const result = await this.run(async () => {
      const { db, api } = await loadFirebase();
      await api.deleteDoc(api.doc(db, SAVE_COLLECTION, this.uid!));
      // Die Cloud ist jetzt leer, und genau das erwartet das nächste Schreiben
      const state = this.getSnapshot?.().state;
      this.setMark({ stamp: null, playedSeconds: state?.playedSeconds ?? 0, catchUpSeconds: 0 });
      this.expected = null;
      this.sync = 'ruht';
      this.syncedAt = 0;
      return true;
    });
    return result === true;
  }
}

export const account = new Account();
